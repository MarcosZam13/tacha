-- ============================================================================
-- SCRUM-101 (HU-69): agregar la semana del plan a la lista general
--
-- 1. add_week_ingredients_to_list: el recorrido de ingredientes de UNA receta
--    sobre una lista, con las cantidades multiplicadas por el ×N del espacio.
--    Es una COPIA, con ese único cambio, del cuerpo de add_recipe_to_general_list
--    (013, con el filtro de lo tachado de 015). Las reglas son las 17 a 26 de
--    features/recipes/specs/SPEC.md.
-- 2. add_week_to_general_list: recorre los espacios de meal_plans de una semana,
--    en orden, y llama a la función de arriba por cada uno. Todo o nada.
--
-- NO modifica ninguna función ni tabla existente: add_recipe_to_general_list,
-- pick_recipe_variant, add_units_to_list_item, list_items y
-- list_item_recipe_requirements quedan como están (decidido con el responsable
-- el 2026-10-10 para no tocar lo de otras historias). Reusa las dos funciones
-- auxiliares tal cual.
--
-- DEUDA: hay dos copias de las reglas 17 a 26. Una corrección a
-- add_recipe_to_general_list hay que hacerla también en
-- add_week_ingredients_to_list. Cuando los dueños lo acuerden,
-- add_recipe_to_general_list puede llamar a esta con multiplicador 1 y se borra
-- la copia. La prueba supabase/tests/022_add_week_to_list.test.sql compara las
-- dos con una receta suelta para detectar que se separen.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- add_week_ingredients_to_list
--
-- security invoker: corre con los permisos de quien llama, así que RLS sigue
-- siendo el control (una receta ajena no se ve, una lista ajena no se toca).
-- No crea la lista: la crea quien la llama, una sola vez para toda la semana.
--
-- Como está expuesta a authenticated (hace falta para que otra función invoker
-- la llame), valida lo mismo que add_recipe_to_general_list y no depende de quien
-- la llama: sesión, multiplicador, que la receta exista (P0002), el tope de 50
-- ingredientes y el bloqueo de la lista. El bloqueo es de transacción y
-- reentrante: si add_week_to_general_list ya lo tomó, tomarlo otra vez no cuesta
-- nada; si alguien la llama directo y en paralelo, las llamadas se hacen una
-- detrás de otra y no leen el mismo "disponible" (regla 20).
--
-- Devuelve: { "added": [nombre], "missing": [{ product_name, quantity, unit }],
--             "skipped": [nombre], "processed": [nombre] }
-- "processed" son todos los productos que quedaron en la lista, también los que
-- ya estaban, para contar ingredientes distintos.
-- ----------------------------------------------------------------------------

create or replace function public.add_week_ingredients_to_list(
  target_list_id uuid,
  target_recipe_id uuid,
  servings_multiplier numeric
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  max_ingredients constant integer := 50;
  ingredient_count integer;
  ingredient record;
  chosen_variant_id uuid;
  chosen_base_quantity numeric;
  target_item_id uuid;
  product_row_count integer;
  listed_quantity numeric;
  claimed_quantity numeric;
  available_quantity numeric;
  missing_quantity numeric;
  added_names text[] := '{}';
  skipped_names text[] := '{}';
  processed_names text[] := '{}';
  missing_items jsonb := '[]'::jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Se requiere una sesión para agregar recetas a la lista'
      using errcode = '42501';
  end if;

  -- Mismo rango y mismo paso que meal_plans.servings_multiplier (019): la
  -- función se puede llamar directo, y un 0, un negativo o un 0,7 escribirían
  -- cantidades que el plan nunca produce.
  if servings_multiplier is null
    or servings_multiplier < 0.5
    or servings_multiplier > 4
    or servings_multiplier * 2 <> trunc(servings_multiplier * 2) then
    raise exception 'El multiplicador debe estar entre 0,5 y 4, en pasos de 0,5'
      using errcode = '22023';
  end if;

  -- RLS oculta las recetas ajenas: no existe y no es tuya dan el mismo error.
  if not exists (select 1 from public.recipes r where r.id = target_recipe_id) then
    raise exception 'Receta no encontrada'
      using errcode = 'P0002';
  end if;

  -- Mismo tope que save_recipe y add_recipe_to_general_list: recipe_ingredients
  -- también se puede escribir directo, sin pasar por save_recipe.
  select count(*) into ingredient_count
  from public.recipe_ingredients ri
  where ri.recipe_id = target_recipe_id;

  if ingredient_count > max_ingredients then
    raise exception 'La receta puede tener hasta % ingredientes', max_ingredients
      using errcode = '22023';
  end if;

  -- Misma clave que add_recipe_to_general_list (015): una receta suelta, una
  -- semana y una llamada directa a esta función sobre la misma lista se hacen
  -- una detrás de otra.
  perform pg_advisory_xact_lock(hashtextextended(target_list_id::text, 0));

  for ingredient in
    select
      ri.product_catalog_id,
      ri.quantity_value * servings_multiplier as needed_quantity,
      ri.quantity_unit as needed_unit,
      pc.name as product_name
    from public.recipe_ingredients ri
    join public.product_catalog pc on pc.id = ri.product_catalog_id
    where ri.recipe_id = target_recipe_id
    order by ri.position
  loop
    chosen_variant_id := null;
    chosen_base_quantity := null;
    target_item_id := null;

    -- Regla 26: sin ninguna presentación usable, el ingrediente no se agrega.
    if not exists (
      select 1 from public.product_catalog_variants v
      where v.product_catalog_id = ingredient.product_catalog_id
        and v.base_quantity > 0
    ) then
      skipped_names := array_append(skipped_names, ingredient.product_name);
      continue;
    end if;

    processed_names := array_append(processed_names, ingredient.product_name);

    if not exists (
      select 1 from public.product_catalog_variants v
      where v.product_catalog_id = ingredient.product_catalog_id
        and v.base_quantity > 0
        and v.base_unit = ingredient.needed_unit
    ) then
      -- ----------------------------------------------------------------------
      -- Regla 22: ninguna presentación tiene la unidad del ingrediente. No se
      -- puede comparar: si el producto ya tiene fila no se suma nada; si no,
      -- 1 unidad de la presentación más chica. Faltante = todo lo pedido.
      -- ----------------------------------------------------------------------
      select li.id into target_item_id
      from public.list_items li
      join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
      where li.list_id = target_list_id
        and li.checked_at is null
        and v.product_catalog_id = ingredient.product_catalog_id
      order by v.base_quantity desc
      limit 1;

      if target_item_id is null then
        -- Sin unidad en común no hay "cubre" posible: la más chica de cualquier unidad.
        select v.id into chosen_variant_id
        from public.product_catalog_variants v
        where v.product_catalog_id = ingredient.product_catalog_id
          and v.base_quantity > 0
        order by v.base_quantity
        limit 1;

        target_item_id := public.add_units_to_list_item(target_list_id, chosen_variant_id, 1);
        added_names := array_append(added_names, ingredient.product_name);
      end if;

      missing_quantity := ingredient.needed_quantity;

    elsif ingredient.needed_unit = 'unidad' then
      -- ----------------------------------------------------------------------
      -- Regla 19 (conteo, CA-03): se suma encima hasta cubrir, aunque sobre.
      -- Presentación: la de la fila si hay exactamente una; si no, pick_recipe_variant.
      -- ----------------------------------------------------------------------
      select count(*) into product_row_count
      from public.list_items li
      join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
      where li.list_id = target_list_id
        and li.checked_at is null
        and v.product_catalog_id = ingredient.product_catalog_id
        and v.base_unit = ingredient.needed_unit
        and v.base_quantity > 0;

      if product_row_count = 1 then
        select v.id, v.base_quantity into chosen_variant_id, chosen_base_quantity
        from public.list_items li
        join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
        where li.list_id = target_list_id
          and li.checked_at is null
          and v.product_catalog_id = ingredient.product_catalog_id
          and v.base_unit = ingredient.needed_unit
          and v.base_quantity > 0;
      else
        select picked.variant_id, picked.base_quantity into chosen_variant_id, chosen_base_quantity
        from public.pick_recipe_variant(
          ingredient.product_catalog_id, ingredient.needed_unit, ingredient.needed_quantity
        ) as picked;
      end if;

      perform public.add_units_to_list_item(
        target_list_id,
        chosen_variant_id,
        ceil(ingredient.needed_quantity / chosen_base_quantity)::integer
      );

      added_names := array_append(added_names, ingredient.product_name);
      -- Los conteos nunca dejan registro: siempre alcanzan (HU-76 CA-03).
      continue;

    else
      -- ----------------------------------------------------------------------
      -- Volumen o peso con la misma unidad.
      -- ----------------------------------------------------------------------
      select
        coalesce(sum(li.quantity_requested * v.base_quantity), 0),
        (array_agg(li.id order by v.base_quantity desc))[1]
      into listed_quantity, target_item_id
      from public.list_items li
      join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
      where li.list_id = target_list_id
        and li.checked_at is null
        and v.product_catalog_id = ingredient.product_catalog_id
        and v.base_unit = ingredient.needed_unit
        and v.base_quantity > 0;

      if target_item_id is not null then
        -- Regla 20: lo que hay cuenta, menos lo que ya pidieron otras recetas
        -- (y la misma receta, si se agrega otra vez) sobre este producto.
        select coalesce(sum(req.quantity_needed), 0) into claimed_quantity
        from public.list_item_recipe_requirements req
        join public.list_items li on li.id = req.list_item_id
        join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
        where li.list_id = target_list_id
          and li.checked_at is null
          and v.product_catalog_id = ingredient.product_catalog_id
          and req.quantity_unit = ingredient.needed_unit;

        available_quantity := greatest(listed_quantity - claimed_quantity, 0);
        missing_quantity := greatest(ingredient.needed_quantity - available_quantity, 0);
      else
        -- Regla 21: el producto no está. 1 unidad de pick_recipe_variant, y lo
        -- que esa unidad no cubre queda como faltante.
        select picked.variant_id, picked.base_quantity into chosen_variant_id, chosen_base_quantity
        from public.pick_recipe_variant(
          ingredient.product_catalog_id, ingredient.needed_unit, ingredient.needed_quantity
        ) as picked;

        target_item_id := public.add_units_to_list_item(target_list_id, chosen_variant_id, 1);
        added_names := array_append(added_names, ingredient.product_name);
        missing_quantity := greatest(ingredient.needed_quantity - chosen_base_quantity, 0);
      end if;
    end if;

    -- Reglas 20 a 24: se registra lo pedido aunque alcance (faltante 0), para
    -- que lo que sigue descuente lo que esto ya usó.
    insert into public.list_item_recipe_requirements
      (list_item_id, recipe_id, quantity_needed, quantity_missing, quantity_unit)
    values
      (target_item_id, target_recipe_id, ingredient.needed_quantity, missing_quantity, ingredient.needed_unit)
    on conflict (list_item_id, recipe_id, quantity_unit)
    do update set
      quantity_needed = public.list_item_recipe_requirements.quantity_needed + excluded.quantity_needed,
      quantity_missing = public.list_item_recipe_requirements.quantity_missing + excluded.quantity_missing;

    if missing_quantity > 0 then
      missing_items := missing_items || jsonb_build_array(jsonb_build_object(
        'product_name', ingredient.product_name,
        'quantity', missing_quantity,
        'unit', ingredient.needed_unit
      ));
    end if;
  end loop;

  return jsonb_build_object(
    'added', to_jsonb(added_names),
    'missing', missing_items,
    'skipped', to_jsonb(skipped_names),
    'processed', to_jsonb(processed_names)
  );
end;
$$;

-- Necesita el permiso para que otra función security invoker (la de abajo) la
-- llame, igual que pick_recipe_variant y add_units_to_list_item (013). Corre con
-- los permisos y la RLS de quien llama: no abre nada.
revoke execute on function public.add_week_ingredients_to_list(uuid, uuid, numeric) from public, anon;
grant execute on function public.add_week_ingredients_to_list(uuid, uuid, numeric) to authenticated;

-- ----------------------------------------------------------------------------
-- add_week_to_general_list
--
-- Agrega a la lista general los ingredientes de cada espacio de meal_plans entre
-- week_from y week_to (inclusive), uno por uno y en orden (fecha y luego
-- desayuno, almuerzo, cena). El orden importa: las reglas 19 y 20 dependen de lo
-- que ya hay en la lista, así que con un orden fijo el resultado se repite.
--
-- security invoker: solo ve y agrega sobre el plan, las recetas y la lista del
-- propio usuario. No recibe ids de usuario.
-- El rango es de a lo más 7 días: una llamada directa no recorre un plan enorme
-- con la lista bloqueada.
--
-- Una semana sin comidas no escribe nada (ni crea la lista).
--
-- Devuelve: { "meals": n, "ingredients": n (productos distintos),
--             "added": [nombre], "missing": [{ product_name, quantity, unit }],
--             "skipped": [nombre] }
-- ----------------------------------------------------------------------------

create or replace function public.add_week_to_general_list(week_from date, week_to date)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  max_range_days constant integer := 6;
  general_list_id uuid;
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

  -- Sin comidas no hay nada que escribir: ni siquiera se crea la lista.
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

  -- Misma lista general que add_recipe_to_general_list (013): se crea si no existe.
  insert into public.lists (owner_id, type)
  values (current_user_id, 'general')
  on conflict (owner_id) where type = 'general' and household_id is null
  do nothing;

  select l.id into general_list_id
  from public.lists l
  where l.owner_id = current_user_id
    and l.type = 'general'
    and l.household_id is null;

  -- La misma clave que add_recipe_to_general_list: una receta suelta y una
  -- semana agregadas a la vez se hacen una detrás de otra, y las dos ven el
  -- mismo "disponible" (regla 20). Se toma ya acá para que toda la semana quede
  -- serializada (la interna lo vuelve a tomar sin costo). Se suelta sola al
  -- terminar la transacción.
  perform pg_advisory_xact_lock(hashtextextended(general_list_id::text, 0));

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
      general_list_id, slot.recipe_id, slot.servings_multiplier
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

revoke execute on function public.add_week_to_general_list(date, date) from public, anon;
grant execute on function public.add_week_to_general_list(date, date) to authenticated;
