-- ============================================================================
-- SCRUM-115 (HU-77): resolver el faltante al tachar ("¿Qué hiciste?")
--
-- 1. Descarte: list_item_recipe_requirements.dismissed_at ("Ya tenía suficiente").
-- 2. Foto para deshacer: list_item_shortfall_snapshots, cómo estaba la fila
--    antes del primer cambio del panel.
-- 3. get_general_list_recipe_shortfalls(local_day_start): el faltante en vivo
--    (regla 33 de features/shopping-list/specs/SPEC.md §18).
-- 4. get_general_list_shortfall_snapshots(local_day_start): qué filas tienen
--    foto y a qué vuelven, para el diálogo de deshacer.
-- 5. resolve_list_item_shortfall: las tres opciones del panel.
-- 6. undo_shortfall_resolution_and_uncheck: deshacer y destachar, todo o nada.
-- 7. Trigger: destachar quita el descarte y la foto.
-- 8. get_recipe_coverage_today: "Ver qué falta" (SCRUM-98) con la misma cuenta.
--
-- Nombres nuevos a propósito: get_general_list_shortfalls() (033) y
-- get_recipe_coverage(uuid) (017/024) quedan como están porque el código de
-- develop las sigue llamando hasta que esta PR se mergee. Se borran en un
-- ticket de limpieza después.
--
-- No cambia set_list_item_checked (035) ni stamp_list_item_check (018).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Descarte. Sin permisos de columna nuevos: solo lo escriben las funciones
--    security definer de abajo.
-- ----------------------------------------------------------------------------
alter table public.list_item_recipe_requirements
  add column dismissed_at timestamptz;

-- ----------------------------------------------------------------------------
-- 2. Foto de la fila antes del panel (regla 46). Una por fila: el primer cambio
--    del panel la guarda y los siguientes no la reemplazan. Se va con la fila.
--    RLS activada y sin políticas ni permisos: solo la tocan las funciones de
--    abajo (security definer).
-- ----------------------------------------------------------------------------
create table public.list_item_shortfall_snapshots (
  list_item_id uuid primary key references public.list_items (id) on delete cascade,
  previous_variant_id uuid not null references public.product_catalog_variants (id) on delete cascade,
  previous_quantity_requested integer not null check (previous_quantity_requested >= 1),
  created_at timestamptz not null default now()
);

alter table public.list_item_shortfall_snapshots enable row level security;
revoke all on public.list_item_shortfall_snapshots from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Medianoche local que manda el cliente (como start_purchase_session, 016).
-- Es la de hoy en su zona: entre hace 26 h y ahora (+10 min de margen de
-- reloj). Otra fecha no es "hoy" y se rechaza.
-- ----------------------------------------------------------------------------
create or replace function public.assert_local_day_start(local_day_start timestamptz)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if local_day_start is null
    or local_day_start < now() - interval '26 hours'
    or local_day_start > now() + interval '10 minutes' then
    raise exception 'local_day_start tiene que ser la medianoche de hoy'
      using errcode = '22023';
  end if;
end;
$$;

revoke execute on function public.assert_local_day_start(timestamptz) from public, anon;
grant execute on function public.assert_local_day_start(timestamptz) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. El faltante en vivo (regla 33). security definer por la misma razón que
--    la 033: en la lista de la familia, el nombre de la receta de otro miembro
--    no se lee por RLS. La lista sale de find_general_list_id(), que filtra
--    por auth.uid() explícito: no hay id ajeno que probar.
--
--    Por producto madre y unidad:
--      - filas del ciclo: pendientes o tachadas desde local_day_start;
--      - lo que hay: unidades × cantidad de la presentación (lo comprado si la
--        fila está en una compra, si no lo pedido);
--      - lo que se pide: registros en ml o g, no descartados, en orden;
--      - lo que hay se reparte en ese orden; lo que no alcanza es el faltante.
-- ----------------------------------------------------------------------------
create or replace function public.get_general_list_recipe_shortfalls(local_day_start timestamptz)
returns table (
  list_item_id uuid,
  recipe_id uuid,
  recipe_name text,
  quantity_missing numeric,
  quantity_unit text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  general_list_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión para ver la lista'
      using errcode = '42501';
  end if;

  perform public.assert_local_day_start(local_day_start);

  general_list_id := public.find_general_list_id();
  if general_list_id is null then
    return;
  end if;

  return query
  with cycle_items as (
    select
      li.id,
      li.created_at,
      v.product_catalog_id,
      v.base_unit,
      coalesce(li.quantity_bought, li.quantity_requested) * v.base_quantity as content
    from public.list_items li
    join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
    where li.list_id = general_list_id
      and (li.checked_at is null or li.checked_at >= local_day_start)
  ),
  available as (
    select ci.product_catalog_id, ci.base_unit, sum(ci.content) as quantity
    from cycle_items ci
    group by ci.product_catalog_id, ci.base_unit
  ),
  requests as (
    select
      req.list_item_id,
      req.recipe_id,
      req.quantity_needed,
      req.quantity_unit,
      ci.product_catalog_id,
      ci.created_at as item_created_at,
      req.created_at,
      req.id,
      sum(req.quantity_needed) over (
        partition by ci.product_catalog_id, req.quantity_unit
        order by req.created_at, req.id
      ) as cumulative_needed
    from public.list_item_recipe_requirements req
    join cycle_items ci on ci.id = req.list_item_id
    where req.quantity_unit in ('ml', 'g')
      and req.dismissed_at is null
  ),
  shortfalls as (
    select
      rq.*,
      least(
        rq.quantity_needed,
        greatest(0, rq.cumulative_needed - coalesce(a.quantity, 0))
      ) as missing
    from requests rq
    left join available a
      on a.product_catalog_id = rq.product_catalog_id
     and a.base_unit = rq.quantity_unit
  )
  select s.list_item_id, s.recipe_id, r.name, s.missing, s.quantity_unit
  from shortfalls s
  join public.recipes r on r.id = s.recipe_id
  where s.missing > 0
  order by s.item_created_at, s.list_item_id, s.created_at, s.id;
end;
$$;

revoke execute on function public.get_general_list_recipe_shortfalls(timestamptz) from public, anon;
grant execute on function public.get_general_list_recipe_shortfalls(timestamptz) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Fotos de las filas del ciclo de la lista general de quien llama: a qué
--    presentación y cantidad vuelve cada una al deshacer. Mismo criterio de
--    acceso que la función de arriba.
-- ----------------------------------------------------------------------------
create or replace function public.get_general_list_shortfall_snapshots(local_day_start timestamptz)
returns table (
  list_item_id uuid,
  previous_base_quantity numeric,
  previous_base_unit text,
  previous_quantity_requested integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  general_list_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión para ver la lista'
      using errcode = '42501';
  end if;

  perform public.assert_local_day_start(local_day_start);

  general_list_id := public.find_general_list_id();
  if general_list_id is null then
    return;
  end if;

  return query
  select s.list_item_id, v.base_quantity, v.base_unit, s.previous_quantity_requested
  from public.list_item_shortfall_snapshots s
  join public.list_items li on li.id = s.list_item_id
  join public.product_catalog_variants v on v.id = s.previous_variant_id
  where li.list_id = general_list_id
    and (li.checked_at is null or li.checked_at >= local_day_start)
  order by li.created_at, li.id;
end;
$$;

revoke execute on function public.get_general_list_shortfall_snapshots(timestamptz) from public, anon;
grant execute on function public.get_general_list_shortfall_snapshots(timestamptz) to authenticated;

-- ----------------------------------------------------------------------------
-- Acceso a una fila: la misma regla que la política "owner or household member
-- reads lists" (024) y que set_list_item_checked (035). Si esa política
-- cambia, cambian las tres.
-- ----------------------------------------------------------------------------
create or replace function public.lock_visible_list_item(target_item_id uuid)
returns public.list_items
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_item public.list_items;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para cambiar la lista'
      using errcode = '42501';
  end if;

  select li.* into target_item
  from public.list_items li
  join public.lists l on l.id = li.list_id
  where li.id = target_item_id
    and (
      (l.household_id is null and l.owner_id = current_user_id)
      or l.household_id in (
        select m.household_id from public.household_members m
        where m.user_id = current_user_id
      )
    )
  for update of li;

  if target_item.id is null then
    raise exception 'El producto no está en tu lista'
      using errcode = 'P0002';
  end if;

  return target_item;
end;
$$;

-- Solo la llaman las funciones de abajo (security definer, como su dueño).
revoke execute on function public.lock_visible_list_item(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. Las tres opciones del panel (reglas 36, 40, 43 y 46).
--    - sameAgain: +1 a lo comprado si la fila está en una compra, si no a lo pedido.
--    - otherPresentation: otra presentación del mismo producto madre.
--    - hadEnough: descarta los registros de la fila.
--    Solo filas tachadas, y nunca sobre una compra cerrada.
-- ----------------------------------------------------------------------------
create or replace function public.resolve_list_item_shortfall(
  target_item_id uuid,
  resolution text,
  target_variant_id uuid default null
)
returns public.list_items
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  max_item_quantity constant bigint := 2147483647;
  target_item public.list_items;
  changed_item public.list_items;
begin
  target_item := public.lock_visible_list_item(target_item_id);

  if target_item.checked_at is null then
    raise exception 'Solo se resuelve el faltante de un producto tachado'
      using errcode = '22023';
  end if;

  if resolution is null or resolution not in ('sameAgain', 'otherPresentation', 'hadEnough') then
    raise exception 'Resolución desconocida'
      using errcode = '22023';
  end if;

  if target_item.purchase_session_id is not null and exists (
    select 1 from public.purchase_sessions s
    where s.id = target_item.purchase_session_id and s.closed_at is not null
  ) then
    raise exception 'Esa compra ya está cerrada'
      using errcode = '42501';
  end if;

  if resolution = 'hadEnough' then
    update public.list_item_recipe_requirements
    set dismissed_at = now()
    where list_item_id = target_item_id
      and dismissed_at is null;

    return target_item;
  end if;

  if resolution = 'otherPresentation' and (
    target_variant_id is null
    or target_variant_id = target_item.product_catalog_variant_id
    or not exists (
      select 1
      from public.product_catalog_variants chosen
      join public.product_catalog_variants current_variant
        on current_variant.id = target_item.product_catalog_variant_id
      where chosen.id = target_variant_id
        and chosen.product_catalog_id = current_variant.product_catalog_id
    )
  ) then
    raise exception 'La presentación tiene que ser otra del mismo producto'
      using errcode = '22023';
  end if;

  -- Foto de antes del panel: solo la primera vez (regla 46).
  insert into public.list_item_shortfall_snapshots (
    list_item_id, previous_variant_id, previous_quantity_requested
  )
  values (target_item_id, target_item.product_catalog_variant_id, target_item.quantity_requested)
  on conflict (list_item_id) do nothing;

  if resolution = 'sameAgain' then
    if target_item.purchase_session_id is not null then
      update public.list_items
      set quantity_bought = least(quantity_bought::bigint + 1, max_item_quantity)::integer
      where id = target_item_id
      returning * into changed_item;
    else
      update public.list_items
      set quantity_requested = least(quantity_requested::bigint + 1, max_item_quantity)::integer
      where id = target_item_id
      returning * into changed_item;
    end if;
  else
    -- La fila está tachada: el índice de una pendiente por variante (035) no aplica.
    update public.list_items
    set product_catalog_variant_id = target_variant_id
    where id = target_item_id
    returning * into changed_item;
  end if;

  return changed_item;
end;
$$;

revoke execute on function public.resolve_list_item_shortfall(uuid, text, uuid) from public, anon;
grant execute on function public.resolve_list_item_shortfall(uuid, text, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. Deshacer y destachar (regla 45). Con foto, la fila vuelve a su
--    presentación y cantidad de antes mientras sigue tachada (así el índice de
--    una pendiente por variante no aplica todavía) y después se destacha con
--    set_list_item_checked (035), que la junta con una pendiente si hace
--    falta. Todo en una transacción: entra todo o nada.
-- ----------------------------------------------------------------------------
create or replace function public.undo_shortfall_resolution_and_uncheck(target_item_id uuid)
returns public.list_items
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_item public.list_items;
  snapshot public.list_item_shortfall_snapshots;
begin
  target_item := public.lock_visible_list_item(target_item_id);

  if target_item.checked_at is null then
    raise exception 'El producto ya no está tachado'
      using errcode = '22023';
  end if;

  select s.* into snapshot
  from public.list_item_shortfall_snapshots s
  where s.list_item_id = target_item_id;

  if snapshot.list_item_id is not null then
    update public.list_items
    set
      product_catalog_variant_id = snapshot.previous_variant_id,
      quantity_requested = snapshot.previous_quantity_requested
    where id = target_item_id;

    delete from public.list_item_shortfall_snapshots
    where list_item_id = target_item_id;
  end if;

  return public.set_list_item_checked(target_item_id, false);
end;
$$;

revoke execute on function public.undo_shortfall_resolution_and_uncheck(uuid) from public, anon;
grant execute on function public.undo_shortfall_resolution_and_uncheck(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. Destachar (por cualquier camino) quita el descarte y la foto de la fila
--    (regla 41). Si destachar la junta con una pendiente (035), la fila se
--    borra: su foto se va en cascada y los registros llegan a la pendiente sin
--    dismissed_at (el insert de la 035 no lo copia).
-- ----------------------------------------------------------------------------
create or replace function public.clear_shortfall_resolution_on_uncheck()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.list_item_recipe_requirements
  set dismissed_at = null
  where list_item_id = new.id
    and dismissed_at is not null;

  delete from public.list_item_shortfall_snapshots
  where list_item_id = new.id;

  return null;
end;
$$;

revoke execute on function public.clear_shortfall_resolution_on_uncheck() from public, anon, authenticated;

create trigger list_items_clear_shortfall_resolution_on_uncheck
  after update of checked_at on public.list_items
  for each row
  when (old.checked_at is not null and new.checked_at is null)
  execute function public.clear_shortfall_resolution_on_uncheck();

-- ----------------------------------------------------------------------------
-- 8. "Ver qué falta" (SCRUM-98) con la misma cuenta. El cuerpo es el de la
--    024 con dos cambios: solo cuentan las filas del ciclo, y el faltante de
--    "short" sale de get_general_list_recipe_shortfalls para esta receta.
-- ----------------------------------------------------------------------------
create or replace function public.get_recipe_coverage_today(
  target_recipe_id uuid,
  local_day_start timestamptz
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  found_recipe_id uuid;
  general_list_id uuid;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para revisar una receta'
      using errcode = '42501';
  end if;

  perform public.assert_local_day_start(local_day_start);

  -- RLS oculta las recetas ajenas: no existe y no es tuya dan el mismo error.
  select r.id into found_recipe_id
  from public.recipes r
  where r.id = target_recipe_id;

  if found_recipe_id is null then
    raise exception 'Receta no encontrada'
      using errcode = 'P0002';
  end if;

  general_list_id := public.find_general_list_id();

  return coalesce(
    (
      with live_shortfalls as materialized (
        select s.list_item_id, s.quantity_missing, s.quantity_unit
        from public.get_general_list_recipe_shortfalls(local_day_start) s
        where s.recipe_id = found_recipe_id
      )
      select jsonb_agg(
        jsonb_build_object(
          'ingredient_id', summary.ingredient_id,
          'product_name', summary.product_name,
          'quantity_value', summary.quantity_value,
          'quantity_unit', summary.quantity_unit,
          'status', case when summary.reason is null then 'covered' else 'missing' end,
          'reason', summary.reason,
          'missing_quantity', case when summary.reason = 'short' then summary.missing_total end
        )
        order by summary.position
      )
      from (
        select
          ri.id as ingredient_id,
          ri.position,
          pc.name as product_name,
          ri.quantity_value,
          ri.quantity_unit,
          shortfall.missing_total,
          case
            when counts.row_count = 0 then 'notInList'
            when counts.unchecked_count > 0 then 'notChecked'
            when shortfall.missing_total > 0 then 'short'
          end as reason
        from public.recipe_ingredients ri
        join public.product_catalog pc on pc.id = ri.product_catalog_id
        cross join lateral (
          select
            count(li.id) as row_count,
            count(li.id) filter (where li.checked_at is null) as unchecked_count
          from public.list_items li
          join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
          where li.list_id = general_list_id
            and v.product_catalog_id = ri.product_catalog_id
            and (li.checked_at is null or li.checked_at >= local_day_start)
        ) counts
        cross join lateral (
          select coalesce(sum(ls.quantity_missing), 0) as missing_total
          from live_shortfalls ls
          join public.list_items li on li.id = ls.list_item_id
          join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
          where v.product_catalog_id = ri.product_catalog_id
            and ls.quantity_unit = ri.quantity_unit
        ) shortfall
        where ri.recipe_id = found_recipe_id
      ) summary
    ),
    '[]'::jsonb
  );
end;
$$;

revoke execute on function public.get_recipe_coverage_today(uuid, timestamptz) from public, anon;
grant execute on function public.get_recipe_coverage_today(uuid, timestamptz) to authenticated;
