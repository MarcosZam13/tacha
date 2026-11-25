-- ============================================================================
-- SCRUM-162 (HU-68 CA-01): plan semanal de la familia.
--
-- El plan de la familia son las filas de meal_plans con household_id. Las
-- políticas y permisos de la tabla NO cambian: por la API directa cada quien ve y
-- cambia solo lo personal. El cliente desplegado lee el plan sin filtrar y borra
-- un espacio por fecha y comida: con políticas de miembros mezclaría los planes y
-- al quitar lo personal borraría lo de la familia. Por eso todo va por funciones.
--
--  1. FK e índice único por familia, día y comida.
--  2. Leer, asignar y quitar.
--  3. Agregar la semana de cualquiera de los dos planes a la lista.
--  4. El trigger de salida (060) deja de tocar el plan de la familia, y quita a
--     quien sale de cocinero.
--
-- Necesita la 060. Spec: features/meal-planner/specs/SPEC.md, sección 18.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. La FK es diferida: al borrar una familia, el trigger de la 024 pasa los
--    espacios a personales y resuelve los que chocan. set null chocaría antes con
--    el índice personal, y sin diferir fallaría antes de que corra.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from public.meal_plans p
    where p.household_id is not null
      and not exists (select 1 from public.households h where h.id = p.household_id)
  ) then
    raise exception 'Hay espacios con household_id de una familia que no existe: revisarlos antes de aplicar la 062';
  end if;
end $$;

alter table public.meal_plans
  add constraint meal_plans_household_id_fkey
  foreign key (household_id) references public.households (id)
  deferrable initially deferred;

-- También es el índice de la FK.
create unique index meal_plans_one_slot_per_household
  on public.meal_plans (household_id, date, meal_type)
  where household_id is not null;

-- ----------------------------------------------------------------------------
-- 2. La familia sale siempre de current_household_id() (060), nunca del cliente.
-- ----------------------------------------------------------------------------

-- La familia de quien llama, o el error de no tenerla. Interna.
create function public.require_household_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  member_household_id uuid := public.current_household_id();
begin
  if member_household_id is null then
    raise exception 'Se requiere pertenecer a una familia'
      using errcode = '42501', hint = 'plan_no_household';
  end if;

  return member_household_id;
end;
$$;

revoke execute on function public.require_household_id() from public, anon, authenticated;

create function public.get_household_meal_plan(plan_from date, plan_to date)
returns table (
  slot_id uuid,
  slot_date date,
  meal_type text,
  servings_multiplier numeric,
  recipe_id uuid,
  recipe_name text,
  recipe_base_servings integer,
  cook_user_id uuid,
  cook_name text,
  cook_is_current_user boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  -- Las dos semanas que muestra la pantalla.
  max_range_days constant integer := 13;
  member_household_id uuid;
begin
  -- Sin rango no hay filas: lo usa add_plan_week_to_list para el plan personal.
  if plan_from is null or plan_to is null then
    return;
  end if;

  member_household_id := public.require_household_id();

  if plan_to < plan_from or plan_to - plan_from > max_range_days then
    raise exception 'El rango debe ser de 1 a 14 días'
      using errcode = '22023';
  end if;

  return query
  select
    mp.id,
    mp.date,
    mp.meal_type,
    mp.servings_multiplier,
    r.id,
    r.name,
    r.base_servings,
    u.id,
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    coalesce(u.id = auth.uid(), false)
  from public.meal_plans mp
  join public.recipes r on r.id = mp.recipe_id
  left join auth.users u on u.id = mp.assigned_cook
  where mp.household_id = member_household_id
    and mp.date between plan_from and plan_to
  order by mp.date, mp.meal_type;
end;
$$;

revoke execute on function public.get_household_meal_plan(date, date) from public, anon;
grant execute on function public.get_household_meal_plan(date, date) to authenticated;

-- Asigna o reemplaza un espacio. Los límites de fecha, comida y multiplicador son
-- los check de la tabla (019).
create function public.assign_household_meal_slot(
  slot_date date,
  slot_meal_type text,
  target_recipe_id uuid,
  slot_servings_multiplier numeric,
  cook_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  member_household_id uuid;
  saved_slot_id uuid;
begin
  -- Familia y después membresías, como 023, 026 y share_recipe. Se relee porque
  -- alguien pudo salir mientras se esperaba.
  perform 1
  from public.households h
  where h.id = public.require_household_id()
  for key share;

  member_household_id := public.require_household_id();

  perform 1
  from public.household_members m
  where m.household_id = member_household_id
    and m.user_id in (current_user_id, cook_user_id)
  for key share;

  if not exists (
    select 1 from public.household_members m
    where m.user_id = current_user_id and m.household_id = member_household_id
  ) then
    raise exception 'Se requiere pertenecer a una familia'
      using errcode = '42501', hint = 'plan_no_household';
  end if;

  if cook_user_id is not null and not exists (
    select 1 from public.household_members m
    where m.user_id = cook_user_id and m.household_id = member_household_id
  ) then
    raise exception 'Quien cocina no es de la familia'
      using errcode = 'P0002', hint = 'plan_cook_not_member';
  end if;

  -- Inexistente, personal o de otra familia: el mismo error.
  perform 1
  from public.recipes r
  where r.id = target_recipe_id and r.household_id = member_household_id
  for key share;

  if not found then
    raise exception 'Receta no encontrada'
      using errcode = 'P0002';
  end if;

  insert into public.meal_plans
    (owner_id, household_id, date, meal_type, recipe_id, assigned_cook, servings_multiplier)
  values
    (current_user_id, member_household_id, slot_date, slot_meal_type, target_recipe_id, cook_user_id, slot_servings_multiplier)
  on conflict (household_id, date, meal_type) where household_id is not null
  do update set
    recipe_id = excluded.recipe_id,
    assigned_cook = excluded.assigned_cook,
    servings_multiplier = excluded.servings_multiplier
  returning id into saved_slot_id;

  return saved_slot_id;
end;
$$;

revoke execute on function public.assign_household_meal_slot(date, text, uuid, numeric, uuid) from public, anon;
grant execute on function public.assign_household_meal_slot(date, text, uuid, numeric, uuid) to authenticated;

-- Quita un espacio. Si ya estaba libre no falla.
create function public.clear_household_meal_slot(slot_date date, slot_meal_type text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_household_id uuid := public.require_household_id();
begin
  delete from public.meal_plans mp
  where mp.household_id = member_household_id
    and mp.date = slot_date
    and mp.meal_type = slot_meal_type;
end;
$$;

revoke execute on function public.clear_household_meal_slot(date, text) from public, anon;
grant execute on function public.clear_household_meal_slot(date, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. La semana a la lista. Es add_week_to_list (058) con el plan de origen; esa
--    queda como "el plan personal", con la misma firma. security invoker: la RLS
--    decide el plan personal, las recetas y las listas; el de la familia sale de
--    su función.
-- ----------------------------------------------------------------------------
create function public.add_plan_week_to_list(
  week_from date,
  week_to date,
  from_household boolean,
  target_list_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  max_range_days constant integer := 6;
  destination_list_id uuid;
  slot record;
  slot_result jsonb;
  has_meals boolean;
  meal_count integer := 0;
  added_names text[] := '{}';
  skipped_names text[] := '{}';
  processed_names text[] := '{}';
  missing_items jsonb := '[]'::jsonb;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para agregar la semana a la lista'
      using errcode = '42501';
  end if;

  if week_from is null
    or week_to is null
    or week_to < week_from
    or week_to - week_from > max_range_days then
    raise exception 'El rango debe ser de 1 a 7 días'
      using errcode = '22023';
  end if;

  -- Nulo se trataría como "personal" en unas condiciones y como nada en otras.
  if from_household is null then
    raise exception 'Falta decir de qué plan es la semana'
      using errcode = '22023';
  end if;

  -- Antes que la semana vacía: un destino que no sirve es un error aunque no
  -- haya comidas (regla 45). La RLS oculta las listas ajenas: no existe y no es
  -- tuya dan el mismo error. El hint lo distingue del P0002 de una receta.
  if target_list_id is not null and not exists (
    select 1 from public.lists l
    where l.id = target_list_id
      and l.type = 'date'
      and l.status = 'active'
  ) then
    raise exception 'La sublista no existe o ya no está pendiente'
      using errcode = 'P0002', hint = 'date_list_unavailable';
  end if;

  -- Sin comidas no hay nada que escribir: ni siquiera se crea la lista general.
  if from_household then
    has_meals := exists (select 1 from public.get_household_meal_plan(week_from, week_to));
  else
    has_meals := exists (
      select 1 from public.meal_plans mp
      where mp.date between week_from and week_to
    );
  end if;

  if not has_meals then
    return jsonb_build_object(
      'meals', 0,
      'ingredients', 0,
      'added', '[]'::jsonb,
      'missing', '[]'::jsonb,
      'skipped', '[]'::jsonb
    );
  end if;

  -- Sin destino, la lista general de add_recipe_to_general_list: se crea si no
  -- existe. Con destino no se crea ni se toca (por eso no es un coalesce).
  if target_list_id is null then
    destination_list_id := public.ensure_general_list_id();
  else
    destination_list_id := target_list_id;
  end if;

  -- La misma clave que add_recipe_to_general_list: una receta suelta y una
  -- semana agregadas a la vez se hacen una detrás de otra, y las dos ven el
  -- mismo "disponible" (regla 20). Se toma ya acá para que toda la semana quede
  -- serializada (la interna lo vuelve a tomar sin costo). Se suelta sola al
  -- terminar la transacción.
  perform pg_advisory_xact_lock(hashtextextended(destination_list_id::text, 0));

  -- Otra vez, ya con el bloqueo: mientras se esperaba, alguien pudo cancelarla
  -- o tachar lo último.
  if target_list_id is not null and not exists (
    select 1 from public.lists l
    where l.id = target_list_id
      and l.type = 'date'
      and l.status = 'active'
  ) then
    raise exception 'La sublista no existe o ya no está pendiente'
      using errcode = 'P0002', hint = 'date_list_unavailable';
  end if;

  for slot in
    select planned.recipe_id, planned.servings_multiplier
    from (
      -- La RLS deja solo lo personal de quien llama.
      select mp.recipe_id, mp.servings_multiplier, mp.date as slot_date, mp.meal_type
      from public.meal_plans mp
      where not from_household and mp.date between week_from and week_to
      union all
      select family.recipe_id, family.servings_multiplier, family.slot_date, family.meal_type
      -- Sin rango no devuelve nada (y no exige tener familia).
      from public.get_household_meal_plan(case when from_household then week_from end, week_to) family
    ) planned
    order by
      planned.slot_date,
      case planned.meal_type when 'breakfast' then 1 when 'lunch' then 2 else 3 end
  loop
    -- El tope de 50 ingredientes y el resto de las validaciones los hace la
    -- función interna, por espacio: un 22023 aborta toda la semana.
    slot_result := public.add_week_ingredients_to_list(
      destination_list_id, slot.recipe_id, slot.servings_multiplier
    );

    meal_count := meal_count + 1;
    added_names := added_names || array(select jsonb_array_elements_text(slot_result -> 'added'));
    skipped_names := skipped_names || array(select jsonb_array_elements_text(slot_result -> 'skipped'));
    processed_names := processed_names || array(select jsonb_array_elements_text(slot_result -> 'processed'));
    missing_items := missing_items || (slot_result -> 'missing');
  end loop;

  return jsonb_build_object(
    'meals', meal_count,
    -- Un producto que pide más de una comida cuenta una sola vez.
    'ingredients', (select count(distinct item_name) from unnest(processed_names) as t(item_name)),
    'added', (
      select coalesce(jsonb_agg(distinct item_name), '[]'::jsonb) from unnest(added_names) as t(item_name)
    ),
    -- Lo que falta de un mismo producto en varias comidas se suma.
    'missing', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('product_name', grouped.product_name, 'quantity', grouped.total, 'unit', grouped.unit)
          order by grouped.product_name, grouped.unit
        ),
        '[]'::jsonb
      )
      from (
        select
          item ->> 'product_name' as product_name,
          item ->> 'unit' as unit,
          sum((item ->> 'quantity')::numeric) as total
        from jsonb_array_elements(missing_items) as item
        group by item ->> 'product_name', item ->> 'unit'
      ) as grouped
    ),
    'skipped', (
      select coalesce(jsonb_agg(distinct item_name), '[]'::jsonb) from unnest(skipped_names) as t(item_name)
    )
  );
end;
$$;

revoke execute on function public.add_plan_week_to_list(date, date, boolean, uuid) from public, anon;
grant execute on function public.add_plan_week_to_list(date, date, boolean, uuid) to authenticated;

create or replace function public.add_week_to_list(
  week_from date,
  week_to date,
  target_list_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return public.add_plan_week_to_list(week_from, week_to, false, target_list_id);
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. El trigger de salida: igual que en la 060, pero mueve y borra solo espacios
--    personales. En el plan de la familia, quien sale deja de ser cocinero y lo
--    que asignó pasa al admin (por lo mismo que sus recetas: la 024 devuelve cada
--    espacio a su owner_id al disolver).
-- ----------------------------------------------------------------------------
create or replace function public.keep_recipes_on_household_exit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_user_id uuid;
  shared_recipe_id uuid;
  copied_recipe_id uuid;
begin
  if not exists (select 1 from public.households h where h.id = old.household_id)
    or not exists (select 1 from auth.users u where u.id = old.user_id) then
    return old;
  end if;

  select m.user_id into admin_user_id
  from public.household_members m
  where m.household_id = old.household_id
  -- Si no queda admin (se borró su cuenta), el miembro más antiguo.
  order by (m.role = 'admin') desc, m.created_at, m.user_id
  limit 1;

  for shared_recipe_id in
    select r.id
    from public.recipes r
    where r.household_id = old.household_id and r.owner_id = old.user_id
    order by r.id
    for update
  loop
    copied_recipe_id := public.clone_recipe(shared_recipe_id, old.user_id, old.household_id);

    if copied_recipe_id is not null then
      update public.meal_plans mp
      set recipe_id = copied_recipe_id
      where mp.recipe_id = shared_recipe_id
        and mp.owner_id = old.user_id
        and mp.household_id is null;
    end if;

    if admin_user_id is not null then
      update public.recipes
      set owner_id = admin_user_id
      where id = shared_recipe_id;
    end if;
  end loop;

  delete from public.meal_plans mp
  using public.recipes r
  where r.id = mp.recipe_id
    and r.household_id = old.household_id
    and mp.owner_id = old.user_id
    and mp.household_id is null;

  update public.meal_plans mp
  set assigned_cook = null
  where mp.household_id = old.household_id and mp.assigned_cook = old.user_id;

  if admin_user_id is not null then
    update public.meal_plans mp
    set owner_id = admin_user_id
    where mp.household_id = old.household_id and mp.owner_id = old.user_id;
  end if;

  return old;
end;
$$;
