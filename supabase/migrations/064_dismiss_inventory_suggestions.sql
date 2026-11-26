-- ============================================================================
-- SCRUM-104 (HU-71): confirmar o descartar una sugerencia de inventario
--
-- Contrato y reglas: features/inventory-suggestions/specs/SPEC.md §16.
-- Depende de la 061 (SCRUM-102) y de la 063 (SCRUM-103): vuelve a definir
-- get_inventory_suggestions partiendo de la versión de la 063 (con el chip de
-- duración), con la misma firma, permisos y seguridad. Se aplica después de
-- la 063.
--
-- Confirmar (✓) no necesita nada nuevo en la base: usa add_item_to_general_list
-- (024), como el buscador, y lo pendiente ya no se sugiere (061).
--
-- Partes:
-- 1. inventory_suggestion_dismissals: hasta cuándo se pospone un producto en
--    una lista general. Una fila por lista y producto. No toca list_items: el
--    historial de compras queda igual (CA-03).
-- 2. dismiss_inventory_suggestion: la ✕. Pospone el producto 7 días en la
--    lista general de quien llama; en una familia, para todos los miembros
--    (las sugerencias son de la lista compartida). Volver a descartar renueva
--    los 7 días.
-- 3. get_inventory_suggestions: no devuelve lo pospuesto hasta esa fecha.
--
-- Seguridad:
-- - La tabla solo se escribe con la función (sin insert/update/delete para
--   nadie): así nadie puede posponer "para siempre" ni en una lista ajena.
--   Se lee con la RLS de las listas visibles (024).
-- - dismiss_inventory_suggestion es security definer porque la tabla no tiene
--   permisos de escritura. La lista la elige find_general_list_id (024), que
--   filtra por auth.uid() en cada consulta, así que solo pospone en la lista
--   general de quien llama. Solo acepta una presentación con historial en
--   esa lista (lo único que se puede sugerir): no sirve para saber si existe
--   una presentación ajena ni para guardar filas de productos que no compró.
--
-- Número 064: comunicado al equipo antes de aplicarla.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Productos pospuestos.
-- ----------------------------------------------------------------------------

create table public.inventory_suggestion_dismissals (
  list_id uuid not null references public.lists (id) on delete cascade,
  product_catalog_id uuid not null references public.product_catalog (id) on delete cascade,
  dismissed_until timestamptz not null,
  dismissed_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (list_id, product_catalog_id)
);

-- Índice de la FK al producto: borrar un producto borra en cascada sus filas.
create index inventory_suggestion_dismissals_product_catalog_id_idx
  on public.inventory_suggestion_dismissals (product_catalog_id);

alter table public.inventory_suggestion_dismissals enable row level security;
revoke all on public.inventory_suggestion_dismissals from public, anon, authenticated;
grant select on public.inventory_suggestion_dismissals to authenticated;

-- Las mismas listas que ve quien consulta (la RLS de lists, 024): las suyas y
-- las de su familia.
create policy "reads dismissals of visible lists"
  on public.inventory_suggestion_dismissals for select
  to authenticated
  using (exists (select 1 from public.lists l where l.id = inventory_suggestion_dismissals.list_id));

-- ----------------------------------------------------------------------------
-- 2. Descartar (✕). Pospone 7 días (decidido con el equipo el 2026-11-25).
-- ----------------------------------------------------------------------------

create function public.dismiss_inventory_suggestion(target_variant_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  general_list_id uuid;
  target_product_id uuid;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para descartar una sugerencia'
      using errcode = '42501';
  end if;

  if target_variant_id is null then
    raise exception 'Falta la presentación'
      using errcode = '22023';
  end if;

  general_list_id := public.find_general_list_id();
  if general_list_id is null then
    raise exception 'No hay lista general'
      using errcode = 'P0002';
  end if;

  -- Solo una presentación con historial en esta lista: es lo único que
  -- get_inventory_suggestions puede sugerir. Como la función es security
  -- definer, sin esta condición resolvería cualquier presentación (también la
  -- de un producto personal ajeno) y diría si existe.
  select pcv.product_catalog_id into target_product_id
  from public.product_catalog_variants pcv
  where pcv.id = target_variant_id
    and exists (
      select 1 from public.list_items li
      where li.list_id = general_list_id
        and li.product_catalog_variant_id = target_variant_id
    );

  if target_product_id is null then
    raise exception 'La presentación no está en la lista'
      using errcode = '22023';
  end if;

  insert into public.inventory_suggestion_dismissals
    (list_id, product_catalog_id, dismissed_until, dismissed_by, updated_at)
  values (general_list_id, target_product_id, now() + interval '7 days', current_user_id, now())
  on conflict (list_id, product_catalog_id) do update
    set dismissed_until = excluded.dismissed_until,
        dismissed_by = excluded.dismissed_by,
        updated_at = excluded.updated_at;
end;
$$;

revoke execute on function public.dismiss_inventory_suggestion(uuid) from public, anon;
grant execute on function public.dismiss_inventory_suggestion(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Sugerencias (063) sin lo pospuesto.
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
    -- Pospuesto con la ✕ (SCRUM-104) y todavía dentro de los 7 días.
    and not exists (
      select 1
      from public.inventory_suggestion_dismissals dismissal
      where dismissal.list_id = general_list_id
        and dismissal.product_catalog_id = e.product_catalog_id
        and dismissal.dismissed_until > now()
    )
  -- La expresión y no el nombre: expected_out_at también es la columna de salida de la función.
  order by e.last_purchased_at + make_interval(days => e.duration_days), e.product_name
  limit 20;
end;
$$;

revoke execute on function public.get_inventory_suggestions() from public, anon;
grant execute on function public.get_inventory_suggestions() to authenticated;
