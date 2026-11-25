-- ============================================================================
-- SCRUM-102 (HU-70): sugerencias de inventario
--
-- Contrato y reglas: features/inventory-suggestions/specs/SPEC.md.
--
-- Partes:
-- 1. category_shelf_life: cuántos días suele durar un producto de cada
--    categoría. Se usa cuando el producto se compró una sola vez.
-- 2. get_inventory_suggestions: los productos de la lista general que
--    probablemente ya se acabaron (CA-02).
--
-- Cálculo, por producto (producto madre, como household_inventory_items en
-- docs/documento-proyecto.md §6), con la presentación de la última compra:
-- - Una compra es un día con el producto tachado en la lista general
--   (varias filas el mismo día cuentan como una, aunque sean de otra
--   presentación).
-- - 2 compras o más: duración = días promedio entre la primera y la última.
-- - 1 compra: duración de su categoría; sin categoría, 14 días.
-- - Se sugiere si última compra + duración ya pasó, la última compra fue hace
--   180 días o menos, ninguna presentación del producto está pendiente y el
--   producto no está archivado (052).
-- - El día de una compra es el de Costa Rica (America/Costa_Rica), no el de UTC.
--
-- Seguridad:
-- - security invoker: lee list_items, lists y el catálogo con la RLS de quien
--   llama (024, 032). No amplía ningún acceso.
-- - La lista la elige find_general_list_id (024): la de la familia o la
--   personal. No recibe parámetros del cliente.
-- - category_shelf_life es de solo lectura para authenticated y anon no tiene
--   permisos. Solo se cambia con una migración o desde el dashboard.
--
-- Número 061: comunicado al equipo antes de aplicarla.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Duración por categoría. Valores propuestos, a revisar con el PO.
-- ----------------------------------------------------------------------------

create table public.category_shelf_life (
  category_id uuid primary key references public.categories (id) on delete cascade,
  shelf_life_days integer not null check (shelf_life_days between 1 and 365)
);

alter table public.category_shelf_life enable row level security;
-- Permisos explícitos (como 054): no dependen de los default privileges de Supabase.
revoke all on public.category_shelf_life from public, anon, authenticated;
grant select on public.category_shelf_life to authenticated;

create policy "authenticated reads shelf life"
  on public.category_shelf_life for select
  to authenticated
  using (true);

-- Por nombre: los id cambian entre bases. Una categoría que no existe no inserta nada.
insert into public.category_shelf_life (category_id, shelf_life_days)
select c.id, v.shelf_life_days
from (values
  ('Lácteos', 7),
  ('Repostería', 60),
  ('Dulces y Chocolates', 30),
  ('Cereales', 30),
  ('Higiene y Belleza', 45),
  ('Abarrotes', 30),
  ('Congelados', 30)
) as v (category_name, shelf_life_days)
join public.categories c on c.name = v.category_name
on conflict (category_id) do nothing;

-- ----------------------------------------------------------------------------
-- 2. Sugerencias (CA-02). Orden: la que se acabó hace más tiempo primero.
--    Tope de 20: es una fila que se recorre deslizando (CA-01).
-- ----------------------------------------------------------------------------

create function public.get_inventory_suggestions()
returns table (
  product_catalog_variant_id uuid,
  product_name text,
  base_quantity numeric,
  base_unit text,
  last_purchased_at timestamptz,
  expected_out_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  general_list_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión para ver las sugerencias'
      using errcode = '42501';
  end if;

  general_list_id := public.find_general_list_id();
  if general_list_id is null then
    return;
  end if;

  return query
  with purchases as (
    select
      pcv.product_catalog_id,
      li.product_catalog_variant_id,
      li.checked_at,
      -- El día de Costa Rica, no el de UTC (la base): en UTC el día cambia a las 6 p. m.
      -- (como startOfLocalDay en utils/). Tacha se usa en Costa Rica.
      date_trunc('day', li.checked_at, 'America/Costa_Rica') as purchase_day
    from public.list_items li
    join public.product_catalog_variants pcv on pcv.id = li.product_catalog_variant_id
    where li.list_id = general_list_id
      and li.checked_at is not null
  ),
  per_product as (
    select
      p.product_catalog_id,
      -- La presentación de la última compra: la que se sugiere reponer.
      (array_agg(p.product_catalog_variant_id order by p.checked_at desc))[1] as last_variant_id,
      max(p.checked_at) as last_purchased_at,
      count(distinct p.purchase_day) as purchase_count,
      extract(epoch from (max(p.purchase_day) - min(p.purchase_day))) / 86400 as span_days
    from purchases p
    group by p.product_catalog_id
  ),
  estimated as (
    select
      pp.product_catalog_id,
      pp.last_variant_id,
      pp.last_purchased_at,
      pc.name as product_name,
      case
        when pp.purchase_count >= 2
          then greatest(1, round(pp.span_days / (pp.purchase_count - 1)))::integer
        else coalesce(csl.shelf_life_days, 14)
      end as duration_days
    from per_product pp
    join public.product_catalog pc on pc.id = pp.product_catalog_id
    left join public.category_shelf_life csl on csl.category_id = pc.category_id
    where pp.last_purchased_at >= now() - interval '180 days'
      -- Un producto personal eliminado queda archivado si una lista lo usa (052): no se sugiere.
      and pc.archived_at is null
  )
  select
    e.last_variant_id,
    e.product_name,
    pcv.base_quantity,
    pcv.base_unit,
    e.last_purchased_at,
    e.last_purchased_at + make_interval(days => e.duration_days) as expected_out_at
  from estimated e
  join public.product_catalog_variants pcv on pcv.id = e.last_variant_id
  where e.last_purchased_at + make_interval(days => e.duration_days) <= now()
    -- Cualquier presentación del producto pendiente en la lista: ya se va a comprar.
    and not exists (
      select 1
      from public.list_items pending
      join public.product_catalog_variants pending_variant on pending_variant.id = pending.product_catalog_variant_id
      where pending.list_id = general_list_id
        and pending.checked_at is null
        and pending_variant.product_catalog_id = e.product_catalog_id
    )
  -- La expresión y no el nombre: expected_out_at también es la columna de salida de la función.
  order by e.last_purchased_at + make_interval(days => e.duration_days), e.product_name
  limit 20;
end;
$$;

revoke execute on function public.get_inventory_suggestions() from public, anon;
grant execute on function public.get_inventory_suggestions() to authenticated;
