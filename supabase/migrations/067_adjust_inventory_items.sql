-- ============================================================================
-- SCRUM-106 (HU-71c): "Ya se acabó" y ajustar la fecha desde "Mi inventario"
--
-- Contrato y reglas: features/my-inventory/specs/SPEC.md §16.
-- Depende de la 065 (SCRUM-105): vuelve a definir inventory_estimates con la
-- misma firma, permisos y seguridad. get_my_inventory y get_inventory_suggestions
-- no cambian: leen de inventory_estimates. Se aplica después de la 065.
--
-- Partes:
-- 1. inventory_adjustments: lo que el usuario dijo de un producto de su
--    lista general ("ya se acabó" o un chip de duración), atado a la compra
--    que estaba vigente. Una fila por lista y producto. No toca list_items ni
--    las compras: el historial y Finanzas quedan igual (CA-03).
-- 2. mark_inventory_item_used_up: "Ya se acabó" (CA-01). Sale del inventario
--    en el momento y pasa a "¿Se te acabó?" (salvo que esté pendiente).
-- 3. adjust_inventory_item: un chip de HU-70b (CA-02). La fecha se cuenta
--    desde ahora: "me queda para 2-4 semanas".
-- 4. inventory_estimates: si hay un ajuste de la última compra, manda sobre
--    el cálculo. Una compra nueva lo deja sin efecto: vuelve el cálculo normal.
--
-- En una familia, el ajuste es de la lista compartida (para todos), igual que
-- la ✕ (064). Las dos acciones borran lo pospuesto con la ✕ de ese producto:
-- lo que el usuario dice ahora reemplaza el "todavía lo tengo" de antes.
--
-- Seguridad:
-- - La tabla solo se escribe con las funciones (sin insert/update/delete para
--   nadie) y se lee con la RLS de las listas visibles (024), como la 064.
-- - Las dos funciones son security definer porque la tabla no tiene permisos
--   de escritura. La lista la elige find_general_list_id (024), que filtra por
--   auth.uid(). Solo aceptan una presentación con una compra en esa lista: no
--   sirven para saber si existe una presentación ajena ni para guardar filas
--   de productos que no se compraron.
--
-- Número 067: la 066 es de SCRUM-163 (PR #119). Comunicado al equipo antes de
-- aplicarla.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Ajustes del inventario.
-- ----------------------------------------------------------------------------

create table public.inventory_adjustments (
  list_id uuid not null references public.lists (id) on delete cascade,
  product_catalog_id uuid not null references public.product_catalog (id) on delete cascade,
  -- La última compra cuando se ajustó. Si después hay otra, el ajuste ya no aplica.
  purchased_at timestamptz not null,
  status text not null check (status in ('used_up', 'adjusted')),
  -- El chip elegido (mismos valores que list_items.shelf_life_choice, 063).
  shelf_life_choice text check (
    shelf_life_choice in ('few_days', 'two_to_four_weeks', 'one_to_three_months', 'no_expiry')
  ),
  -- Cuándo se acaba según el usuario; null con "No vence".
  expected_out_at timestamptz,
  adjusted_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (list_id, product_catalog_id),
  constraint inventory_adjustments_status_fields check (
    (status = 'used_up' and shelf_life_choice is null and expected_out_at is not null)
    or (status = 'adjusted' and shelf_life_choice is not null)
  )
);

-- Índice de la FK al producto: borrar un producto borra en cascada sus filas.
create index inventory_adjustments_product_catalog_id_idx
  on public.inventory_adjustments (product_catalog_id);

alter table public.inventory_adjustments enable row level security;
revoke all on public.inventory_adjustments from public, anon, authenticated;
grant select on public.inventory_adjustments to authenticated;

-- Las mismas listas que ve quien consulta (la RLS de lists, 024): las suyas y
-- las de su familia. inventory_estimates es invoker y la lee con esta policy.
create policy "reads inventory adjustments of visible lists"
  on public.inventory_adjustments for select
  to authenticated
  using (exists (select 1 from public.lists l where l.id = inventory_adjustments.list_id));

-- ----------------------------------------------------------------------------
-- 2 y 3. Las dos acciones. Comparten la validación y el guardado.
-- ----------------------------------------------------------------------------

-- Interna: valida y guarda un ajuste. Solo la llaman las dos de abajo (sin
-- execute para nadie más).
create function public.save_inventory_adjustment(
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

  -- Solo una presentación que está en esta lista (como la 064). Como la
  -- función es security definer, sin esta condición resolvería cualquier
  -- presentación (también la de un producto personal ajeno) y diría si existe.
  select pcv.product_catalog_id into target_product_id
  from public.product_catalog_variants pcv
  where pcv.id = target_variant_id
    and exists (
      select 1 from public.list_items li
      where li.list_id = general_list_id
        and li.product_catalog_variant_id = target_variant_id
    );

  -- La última compra del producto (cualquier presentación), igual que
  -- inventory_estimates: el ajuste queda atado a ella.
  select max(li.checked_at) into last_purchase_at
  from public.list_items li
  join public.product_catalog_variants pcv on pcv.id = li.product_catalog_variant_id
  where li.list_id = general_list_id
    and li.checked_at is not null
    and pcv.product_catalog_id = target_product_id;

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

  -- Lo que dice ahora reemplaza el "todavía lo tengo" de la ✕ (064).
  delete from public.inventory_suggestion_dismissals dismissal
  where dismissal.list_id = general_list_id
    and dismissal.product_catalog_id = target_product_id;
end;
$$;

-- service_role también: sin JWT fallaría igual (42501), pero así queda explícito.
revoke execute on function public.save_inventory_adjustment(uuid, text, text, timestamptz)
  from public, anon, authenticated, service_role;

-- "Ya se acabó" (CA-01): se acaba ahora.
create function public.mark_inventory_item_used_up(target_variant_id uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  select public.save_inventory_adjustment(target_variant_id, 'used_up', null, now());
$$;

revoke execute on function public.mark_inventory_item_used_up(uuid) from public, anon;
grant execute on function public.mark_inventory_item_used_up(uuid) to authenticated;

-- Ajustar con un chip (CA-02), desde ahora. Los mismos días que el chip al
-- tachar (063): 4, 21 o 60; "No vence" queda sin fecha.
create function public.adjust_inventory_item(target_variant_id uuid, target_choice text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  duration_days integer;
begin
  if target_choice is null
    or target_choice not in ('few_days', 'two_to_four_weeks', 'one_to_three_months', 'no_expiry') then
    raise exception 'Duración no válida'
      using errcode = '22023';
  end if;

  duration_days := case target_choice
    when 'few_days' then 4
    when 'two_to_four_weeks' then 21
    when 'one_to_three_months' then 60
  end;

  perform public.save_inventory_adjustment(
    target_variant_id,
    'adjusted',
    target_choice,
    case when duration_days is null then null else now() + make_interval(days => duration_days) end
  );
end;
$$;

revoke execute on function public.adjust_inventory_item(uuid, text) from public, anon;
grant execute on function public.adjust_inventory_item(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. El cálculo (065) con los ajustes. Igual que en la 065 salvo el join con
--    inventory_adjustments y la fecha final.
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
    -- SCRUM-106: el ajuste de la última compra manda ("ya se acabó" = ahora;
    -- un chip = desde que se eligió; "No vence" = sin fecha). Sin ajuste, o
    -- si hubo una compra después, el cálculo de la 065.
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
