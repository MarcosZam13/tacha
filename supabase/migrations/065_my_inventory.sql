-- ============================================================================
-- SCRUM-105 (HU-71b): "Mi inventario"
--
-- Contrato y reglas: features/my-inventory/specs/SPEC.md.
-- Depende de la 061, la 063 y la 064: usa list_items.shelf_life_choice (063) e
-- inventory_suggestion_dismissals (064), y vuelve a definir
-- get_inventory_suggestions (064) con la misma firma, permisos, seguridad y
-- resultado (solo cambia el texto del error sin sesión; el código sigue siendo
-- 42501). Se aplica después de la 064.
--
-- Partes:
-- 1. inventory_estimates: el cálculo de la 061/063 en un solo lugar. Por
--    producto de la lista general de quien llama: la presentación y la fecha
--    de la última compra, y cuándo se estima que se acaba (null si no hay
--    fecha: "No vence" con una sola compra). Las sugerencias y "Mi
--    inventario" leen de acá, así nunca calculan distinto.
-- 2. get_inventory_suggestions: lo que ya se acabó (igual que en la 064).
-- 3. get_my_inventory: lo que todavía se cree que hay en casa: lo que no se
--    acabó, no tiene fecha estimada o se pospuso con la ✕ ("todavía lo
--    tengo"). La pantalla lo agrupa por urgencia.
--
-- Seguridad: las tres son security invoker con search_path vacío. Leen
-- list_items, el catálogo y lo pospuesto con la RLS de quien llama (024, 032,
-- 064) y la lista la elige find_general_list_id (024). No reciben parámetros
-- del cliente.
--
-- Número 065: comunicado al equipo antes de aplicarla.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. El cálculo compartido.
--    Reglas (061 y 063): por producto madre; un día de compra es el día de
--    Costa Rica; el chip de la última compra manda (4, 21 o 60 días; "No
--    vence" usa el historial con 2 compras o más y si no, no hay fecha); sin
--    chip, el promedio entre compras con 2 o más, y con 1 la categoría o 14
--    días. Solo lo comprado en los últimos 180 días y sin archivar (052).
-- ----------------------------------------------------------------------------

create function public.inventory_estimates()
returns table (
  product_catalog_id uuid,
  product_catalog_variant_id uuid,
  product_name text,
  base_quantity numeric,
  base_unit text,
  last_purchased_at timestamptz,
  expected_out_at timestamptz,
  is_pending boolean,
  is_dismissed boolean
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
    raise exception 'Se requiere una sesión'
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
      date_trunc('day', li.checked_at, 'America/Costa_Rica') as purchase_day
    from public.list_items li
    join public.product_catalog_variants pcv on pcv.id = li.product_catalog_variant_id
    where li.list_id = general_list_id
      and li.checked_at is not null
  ),
  per_product as (
    select
      p.product_catalog_id,
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
        when pp.last_choice = 'few_days' then 4
        when pp.last_choice = 'two_to_four_weeks' then 21
        when pp.last_choice = 'one_to_three_months' then 60
        when pp.last_choice = 'no_expiry' then
          case
            when pp.purchase_count >= 2
              then greatest(1, round(pp.span_days / (pp.purchase_count - 1)))::integer
          end
        when pp.purchase_count >= 2
          then greatest(1, round(pp.span_days / (pp.purchase_count - 1)))::integer
        else coalesce(csl.shelf_life_days, 14)
      end as duration_days
    from per_product pp
    join public.product_catalog pc on pc.id = pp.product_catalog_id
    left join public.category_shelf_life csl on csl.category_id = pc.category_id
    where pp.last_purchased_at >= now() - interval '180 days'
      and pc.archived_at is null
  )
  select
    e.product_catalog_id,
    e.last_variant_id,
    e.product_name,
    pcv.base_quantity,
    pcv.base_unit,
    e.last_purchased_at,
    -- null si no hay duración ("No vence" con una sola compra).
    e.last_purchased_at + make_interval(days => e.duration_days),
    exists (
      select 1
      from public.list_items pending
      join public.product_catalog_variants pending_variant on pending_variant.id = pending.product_catalog_variant_id
      where pending.list_id = general_list_id
        and pending.checked_at is null
        and pending_variant.product_catalog_id = e.product_catalog_id
    ),
    exists (
      select 1
      from public.inventory_suggestion_dismissals dismissal
      where dismissal.list_id = general_list_id
        and dismissal.product_catalog_id = e.product_catalog_id
        and dismissal.dismissed_until > now()
    )
  from estimated e
  join public.product_catalog_variants pcv on pcv.id = e.last_variant_id;
end;
$$;

-- Solo la llaman las dos de abajo, que son invoker: quien consulta necesita execute.
revoke execute on function public.inventory_estimates() from public, anon;
grant execute on function public.inventory_estimates() to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Sugerencias: lo que ya se acabó, sin lo pendiente ni lo pospuesto (064).
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
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.product_catalog_variant_id,
    e.product_name,
    e.base_quantity,
    e.base_unit,
    e.last_purchased_at,
    e.expected_out_at
  from public.inventory_estimates() e
  where e.expected_out_at is not null
    and e.expected_out_at <= now()
    and not e.is_pending
    and not e.is_dismissed
  order by e.expected_out_at, e.product_name
  limit 20;
$$;

revoke execute on function public.get_inventory_suggestions() from public, anon;
grant execute on function public.get_inventory_suggestions() to authenticated;

-- ----------------------------------------------------------------------------
-- 3. "Mi inventario" (CA-01, CA-02): lo que no se acabó, no tiene fecha o se
--    pospuso con la ✕ (064): quien descarta dice "todavía lo tengo", así que
--    sigue en casa (la pantalla lo muestra en "Vence pronto").
--    Lo pendiente que no se acabó sí aparece: comprar más no quiere decir que
--    se acabó. Lo que se acabó y está pendiente no: se acabó y se va a comprar.
--    Orden: lo que se acaba antes primero; sin fecha al final; después por
--    nombre. Tope de 200 (una pantalla, no un historial).
-- ----------------------------------------------------------------------------

create function public.get_my_inventory()
returns table (
  product_catalog_variant_id uuid,
  product_name text,
  base_quantity numeric,
  base_unit text,
  last_purchased_at timestamptz,
  expected_out_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.product_catalog_variant_id,
    e.product_name,
    e.base_quantity,
    e.base_unit,
    e.last_purchased_at,
    e.expected_out_at
  from public.inventory_estimates() e
  where e.expected_out_at is null
    or e.expected_out_at > now()
    or e.is_dismissed
  order by e.expected_out_at nulls last, e.product_name
  limit 200;
$$;

revoke execute on function public.get_my_inventory() from public, anon;
grant execute on function public.get_my_inventory() to authenticated;
