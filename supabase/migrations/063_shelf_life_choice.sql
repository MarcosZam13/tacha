-- ============================================================================
-- SCRUM-103 (HU-70b): cuánto le va a durar un producto, al tacharlo
--
-- Contrato y reglas: features/shopping-list/specs/SPEC.md §19.
-- Depende de la 061 (SCRUM-102): vuelve a definir get_inventory_suggestions,
-- con la misma firma, permisos y seguridad.
--
-- Partes:
-- 1. list_items.shelf_life_choice: el chip que se eligió al tachar (opcional).
--    Se escribe con un update directo, como checked_at (015): el permiso es
--    solo sobre esa columna y la política de update de list_items (024) ya
--    limita a las listas visibles.
-- 2. Trigger: una fila pendiente no tiene chip. Al destachar se borra, y una
--    fila pendiente no puede guardar uno.
-- 3. get_inventory_suggestions: el chip de la última compra manda sobre el
--    historial y la categoría (CA-02: sin chip, todo sigue igual que en 061).
--
-- Duración de cada chip (propuesta, a confirmar con el PO):
--   few_days            "Vence en pocos días"   4 días
--   two_to_four_weeks   "2-4 semanas"          21 días
--   one_to_three_months "1-3 meses"            60 días
--   no_expiry           "No vence / no aplica" sin fecha por vencimiento: con
--                       2 compras o más se usa el historial; con 1, no se sugiere.
--
-- Número 063: comunicado al equipo antes de aplicarla.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Columna. Nula = no se eligió ningún chip (CA-02).
-- ----------------------------------------------------------------------------

alter table public.list_items
  add column shelf_life_choice text
    check (shelf_life_choice in ('few_days', 'two_to_four_weeks', 'one_to_three_months', 'no_expiry'));

grant update (shelf_life_choice) on public.list_items to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Sin chip en una fila pendiente. security invoker: solo cambia la fila que
--    ya se está escribiendo, con los permisos de quien escribe.
--    Corre antes que list_items_stamp_check (orden alfabético), que nunca pasa
--    checked_at de un valor a null: lo que ve acá es el estado final.
-- ----------------------------------------------------------------------------

create function public.clear_shelf_life_on_uncheck()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.checked_at is null then
    new.shelf_life_choice := null;
  end if;
  return new;
end;
$$;

revoke execute on function public.clear_shelf_life_on_uncheck() from public, anon, authenticated;

create trigger list_items_clear_shelf_life_on_uncheck
  before insert or update on public.list_items
  for each row execute function public.clear_shelf_life_on_uncheck();

-- ----------------------------------------------------------------------------
-- 3. Sugerencias (061) con el chip de la última compra.
-- ----------------------------------------------------------------------------

create or replace function public.get_inventory_suggestions()
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
      li.shelf_life_choice,
      -- El día de Costa Rica, no el de UTC (la base): en UTC el día cambia a las 6 p. m.
      date_trunc('day', li.checked_at, 'America/Costa_Rica') as purchase_day
    from public.list_items li
    join public.product_catalog_variants pcv on pcv.id = li.product_catalog_variant_id
    where li.list_id = general_list_id
      and li.checked_at is not null
  ),
  per_product as (
    select
      p.product_catalog_id,
      -- La presentación y el chip de la última compra.
      (array_agg(p.product_catalog_variant_id order by p.checked_at desc))[1] as last_variant_id,
      (array_agg(p.shelf_life_choice order by p.checked_at desc))[1] as last_choice,
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
        -- El chip de la última compra manda (SCRUM-103).
        when pp.last_choice = 'few_days' then 4
        when pp.last_choice = 'two_to_four_weeks' then 21
        when pp.last_choice = 'one_to_three_months' then 60
        -- "No vence": sin fecha por vencimiento; el historial, si hay.
        when pp.last_choice = 'no_expiry' then
          case
            when pp.purchase_count >= 2
              then greatest(1, round(pp.span_days / (pp.purchase_count - 1)))::integer
          end
        -- Sin chip: igual que en 061.
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
  -- Sin duración ("No vence" con una sola compra): no se sugiere.
  where e.duration_days is not null
    and e.last_purchased_at + make_interval(days => e.duration_days) <= now()
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
