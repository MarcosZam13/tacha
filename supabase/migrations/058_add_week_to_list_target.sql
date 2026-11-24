-- ============================================================================
-- SCRUM-160 (HU-69 CA-03): elegir a qué lista se agrega la semana.
--
-- 1. add_week_to_list: lo que hacía add_week_to_general_list (última versión:
--    024), con una sublista por fecha como destino opcional. Sin destino, la
--    lista general.
-- 2. add_week_to_general_list: queda como envoltorio, con la misma firma, la
--    misma respuesta y los mismos errores. El código ya mergeado la llama.
--
-- No cambia add_week_ingredients_to_list (022), las funciones de sublistas (038,
-- 043), ninguna tabla ni la RLS.
-- Spec: features/meal-planner/specs/SPEC.md, sección 17.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- add_week_to_list
--
-- Nombre nuevo y no un parámetro más en add_week_to_general_list: cambiar la
-- firma crearía una sobrecarga que PostgREST no sabe resolver.
--
-- security invoker: la RLS decide qué plan, qué recetas y qué listas ve quien
-- llama. No recibe ids de usuario.
--
-- No valida event_date: el "hoy" de la base está en UTC y en la noche de Costa
-- Rica ya es mañana. Eso lo filtra la pantalla, con la fecha local.
--
-- Errores: 42501 sin sesión; 22023 rango inválido; P0002 con hint
-- date_list_unavailable si el destino no es una sublista pendiente y visible.
-- Devuelve: { "meals": n, "ingredients": n (productos distintos),
--             "added": [nombre], "missing": [{ product_name, quantity, unit }],
--             "skipped": [nombre] }
-- ----------------------------------------------------------------------------
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
declare
  current_user_id uuid := auth.uid();
  max_range_days constant integer := 6;
  destination_list_id uuid;
  slot record;
  slot_result jsonb;
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
  if not exists (
    select 1 from public.meal_plans mp
    where mp.date between week_from and week_to
  ) then
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
    select mp.recipe_id, mp.servings_multiplier
    from public.meal_plans mp
    where mp.date between week_from and week_to
    order by
      mp.date,
      case mp.meal_type when 'breakfast' then 1 when 'lunch' then 2 else 3 end
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

revoke execute on function public.add_week_to_list(date, date, uuid) from public, anon;
grant execute on function public.add_week_to_list(date, date, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- add_week_to_general_list: mismo contrato de siempre. Conserva sus permisos
-- (create or replace no los toca).
-- ----------------------------------------------------------------------------
create or replace function public.add_week_to_general_list(week_from date, week_to date)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return public.add_week_to_list(week_from, week_to);
end;
$$;
