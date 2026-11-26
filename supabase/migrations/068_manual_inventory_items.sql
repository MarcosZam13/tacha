-- ============================================================================
-- SCRUM-107 (HU-71d): agregar algo a "Mi inventario" a mano
--
-- Contrato y reglas: features/my-inventory/specs/SPEC.md §17.
-- Depende de la 067 (SCRUM-106): vuelve a definir inventory_estimates y
-- save_inventory_adjustment con la misma firma, permisos y seguridad.
-- get_my_inventory, get_inventory_suggestions y las dos acciones de la 067 no
-- cambian. Se aplica después de la 067.
--
-- Partes:
-- 1. inventory_manual_items: un producto que el usuario ya tenía en casa y
--    agregó desde "Mi inventario" (no vino de una compra en Tacha), con el
--    chip opcional de HU-70b. Una fila por presentación y día. No toca
--    list_items: no es una compra, no aparece en el historial ni en Finanzas.
-- 2. add_inventory_item: el botón "+ Agregar a mi inventario" (CA-01).
-- 3. inventory_estimates: lo agregado a mano cuenta como una llegada más del
--    producto, igual que una compra (CA-02: aparece igual que cualquier otro).
--    El chip, si se eligió, cuenta desde que se agregó.
-- 4. save_inventory_adjustment (067): "Ya se acabó" y "Ajustar fecha" también
--    sirven para lo agregado a mano.
--
-- En una familia, lo agregado es de la lista general compartida, igual que lo
-- tachado.
--
-- Seguridad:
-- - La tabla solo se escribe con add_inventory_item (sin insert/update/delete
--   para nadie) y se lee con la RLS de las listas visibles (024), como la 064
--   y la 067.
-- - add_inventory_item es security definer porque la tabla no tiene permisos
--   de escritura. La lista la elige ensure_general_list_id (024), por
--   auth.uid(). Como definer no ve la RLS del catálogo, revisa a mano que el
--   producto sea uno que esa lista puede usar: del catálogo global, uno propio
--   en una lista personal o uno compartido con esa familia (032). Un producto
--   personal sin compartir no entra a la lista de una familia (066): el resto
--   no podría verlo. Cualquier otro caso da el mismo error, así no sirve para
--   saber si existe un producto ajeno.
--
-- Número 068: comunicado al equipo antes de aplicarla.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Lo agregado a mano.
-- ----------------------------------------------------------------------------

create table public.inventory_manual_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  product_catalog_variant_id uuid not null references public.product_catalog_variants (id) on delete cascade,
  -- El chip elegido al agregar (mismos valores que list_items.shelf_life_choice, 063); null si no eligió.
  shelf_life_choice text check (
    shelf_life_choice in ('few_days', 'two_to_four_weeks', 'one_to_three_months', 'no_expiry')
  ),
  added_by uuid references auth.users (id) on delete set null,
  added_at timestamptz not null default now(),
  -- El día de Costa Rica en que se agregó, como el día de compra de la 061.
  added_day date generated always as ((added_at at time zone 'America/Costa_Rica')::date) stored,
  -- Una fila por presentación y día: agregar otra vez el mismo día actualiza
  -- la hora y el chip (el promedio cuenta días, así que no cambia). Además
  -- pone un tope: nadie puede llenar la tabla de una familia con llamadas seguidas.
  constraint inventory_manual_items_one_per_day unique (list_id, product_catalog_variant_id, added_day)
);

-- Borrar una presentación borra sus filas. (Por lista ya lo cubre el índice del unique.)
create index inventory_manual_items_variant_id_idx on public.inventory_manual_items (product_catalog_variant_id);

alter table public.inventory_manual_items enable row level security;
revoke all on public.inventory_manual_items from public, anon, authenticated;
grant select on public.inventory_manual_items to authenticated;

create policy "reads manual inventory items of visible lists"
  on public.inventory_manual_items for select
  to authenticated
  using (exists (select 1 from public.lists l where l.id = inventory_manual_items.list_id));

-- ----------------------------------------------------------------------------
-- 2. Agregar a mano (CA-01).
-- ----------------------------------------------------------------------------

create function public.add_inventory_item(target_variant_id uuid, target_choice text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  general_list_id uuid;
  list_household_id uuid;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión'
      using errcode = '42501';
  end if;

  if target_variant_id is null then
    raise exception 'Falta la presentación'
      using errcode = '22023';
  end if;

  if target_choice is not null
    and target_choice not in ('few_days', 'two_to_four_weeks', 'one_to_three_months', 'no_expiry') then
    raise exception 'Duración no válida'
      using errcode = '22023';
  end if;

  -- La crea si todavía no existe: alguien puede agregar a su inventario antes
  -- de usar la lista.
  general_list_id := public.ensure_general_list_id();

  select l.household_id into list_household_id
  from public.lists l
  where l.id = general_list_id;

  -- Lo que esa lista puede usar (032 y 066). Sin esto, como definer, aceptaría
  -- cualquier presentación, también la de un producto personal ajeno.
  if not exists (
    select 1
    from public.product_catalog_variants pcv
    join public.product_catalog pc on pc.id = pcv.product_catalog_id
    where pcv.id = target_variant_id
      and pc.archived_at is null
      and (
        (pc.owner_id is null and pc.household_id is null)
        or (pc.owner_id = current_user_id and list_household_id is null)
        or (pc.owner_id is null and list_household_id is not null and pc.household_id = list_household_id)
      )
  ) then
    raise exception 'Ese producto no se puede agregar'
      using errcode = '22023';
  end if;

  insert into public.inventory_manual_items (list_id, product_catalog_variant_id, shelf_life_choice, added_by)
  values (general_list_id, target_variant_id, target_choice, current_user_id)
  on conflict (list_id, product_catalog_variant_id, added_day) do update
    set added_at = now(),
        shelf_life_choice = excluded.shelf_life_choice,
        added_by = excluded.added_by;
end;
$$;

revoke execute on function public.add_inventory_item(uuid, text) from public, anon;
grant execute on function public.add_inventory_item(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. El cálculo (067) con lo agregado a mano. Igual que en la 067 salvo que
--    las llegadas del producto son lo tachado más lo agregado a mano.
-- ----------------------------------------------------------------------------

create or replace function public.inventory_estimates()
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
  with arrivals as (
    -- Lo tachado (061)...
    select
      li.product_catalog_variant_id,
      li.checked_at,
      li.shelf_life_choice,
      false as is_manual
    from public.list_items li
    where li.list_id = general_list_id
      and li.checked_at is not null
    union all
    -- ...y lo agregado a mano (SCRUM-107): una llegada más, con su chip.
    select
      manual.product_catalog_variant_id,
      manual.added_at,
      manual.shelf_life_choice,
      true
    from public.inventory_manual_items manual
    where manual.list_id = general_list_id
  ),
  purchases as (
    select
      pcv.product_catalog_id,
      a.product_catalog_variant_id,
      a.checked_at,
      a.shelf_life_choice,
      a.is_manual,
      date_trunc('day', a.checked_at, 'America/Costa_Rica') as purchase_day
    from arrivals a
    join public.product_catalog_variants pcv on pcv.id = a.product_catalog_variant_id
  ),
  per_product as (
    select
      p.product_catalog_id,
      (array_agg(p.product_catalog_variant_id order by p.checked_at desc, p.is_manual))[1] as last_variant_id,
      (array_agg(p.shelf_life_choice order by p.checked_at desc, p.is_manual))[1] as last_choice,
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
    -- El ajuste de la última llegada manda (067); si no, el cálculo.
    case
      when adjustment.product_catalog_id is not null then adjustment.expected_out_at
      else e.last_purchased_at + make_interval(days => e.duration_days)
    end,
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
  join public.product_catalog_variants pcv on pcv.id = e.last_variant_id
  left join public.inventory_adjustments adjustment
    on adjustment.list_id = general_list_id
    and adjustment.product_catalog_id = e.product_catalog_id
    and adjustment.purchased_at = e.last_purchased_at;
end;
$$;

revoke execute on function public.inventory_estimates() from public, anon;
grant execute on function public.inventory_estimates() to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Ajustes (067) también para lo agregado a mano. Igual que en la 067 salvo
--    que la presentación y la última llegada se buscan en las dos tablas.
-- ----------------------------------------------------------------------------

create or replace function public.save_inventory_adjustment(
  target_variant_id uuid,
  target_status text,
  target_choice text,
  target_expected_out_at timestamptz
)
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
  last_purchase_at timestamptz;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión'
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

  -- Solo una presentación que está en esta lista, tachada o agregada a mano.
  select pcv.product_catalog_id into target_product_id
  from public.product_catalog_variants pcv
  where pcv.id = target_variant_id
    and (
      exists (
        select 1 from public.list_items li
        where li.list_id = general_list_id
          and li.product_catalog_variant_id = target_variant_id
      )
      or exists (
        select 1 from public.inventory_manual_items manual
        where manual.list_id = general_list_id
          and manual.product_catalog_variant_id = target_variant_id
      )
    );

  -- La última llegada del producto (cualquier presentación), igual que inventory_estimates.
  select max(arrival.arrived_at) into last_purchase_at
  from (
    select li.product_catalog_variant_id, li.checked_at as arrived_at
    from public.list_items li
    where li.list_id = general_list_id
      and li.checked_at is not null
    union all
    select manual.product_catalog_variant_id, manual.added_at
    from public.inventory_manual_items manual
    where manual.list_id = general_list_id
  ) arrival
  join public.product_catalog_variants pcv on pcv.id = arrival.product_catalog_variant_id
  where pcv.product_catalog_id = target_product_id;

  if target_product_id is null or last_purchase_at is null then
    raise exception 'El producto no está en tu inventario'
      using errcode = '22023';
  end if;

  insert into public.inventory_adjustments
    (list_id, product_catalog_id, purchased_at, status, shelf_life_choice, expected_out_at, adjusted_by, updated_at)
  values
    (general_list_id, target_product_id, last_purchase_at, target_status, target_choice, target_expected_out_at, current_user_id, now())
  on conflict (list_id, product_catalog_id) do update
    set purchased_at = excluded.purchased_at,
        status = excluded.status,
        shelf_life_choice = excluded.shelf_life_choice,
        expected_out_at = excluded.expected_out_at,
        adjusted_by = excluded.adjusted_by,
        updated_at = excluded.updated_at;

  delete from public.inventory_suggestion_dismissals dismissal
  where dismissal.list_id = general_list_id
    and dismissal.product_catalog_id = target_product_id;
end;
$$;

-- create or replace conserva los permisos de la 067; se repiten para que quede escrito.
revoke execute on function public.save_inventory_adjustment(uuid, text, text, timestamptz)
  from public, anon, authenticated, service_role;
