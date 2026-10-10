-- ============================================================================
-- Prueba de la migración 022 (SCRUM-101): agregar la semana a la lista.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 019 y 022. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios, recetas, planes ni listas en la base
-- compartida. Si una regla no se cumple, un `assert` corta con su mensaje; si
-- termina sin error, pasó. Contra la base sin 022 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- El editor muestra el resultado de la última sentencia que devuelve filas: al
-- terminar bien se ve la fila del último `select set_config(...)`. Un error
-- sale en rojo.
--
-- Datos: un producto con una sola presentación en ml o g (así
-- pick_recipe_variant no tiene otra que elegir y la cuenta es exacta, con
-- base_quantity = b) y cuatro usuarios:
--   A  semana con dos comidas de la misma receta (×2 el lunes, ×1 el martes);
--   B  sin plan, para el aislamiento y la semana vacía;
--   W  una comida ×1 con la semana, y R la misma receta suelta con
--      add_recipe_to_general_list: deben dejar la lista igual (equivalencia).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño). Los ids viajan entre pasos en variables de la
--    transacción (set_config(..., true)).
-- ----------------------------------------------------------------------------

do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  user_w uuid := gen_random_uuid();
  user_r uuid := gen_random_uuid();
  recipe_a uuid := gen_random_uuid();
  recipe_w uuid := gen_random_uuid();
  recipe_r uuid := gen_random_uuid();
  test_variant record;
begin
  select v.id, v.product_catalog_id, v.base_quantity, v.base_unit into test_variant
  from public.product_catalog_variants v
  where v.base_unit in ('ml', 'g')
    and v.base_quantity > 0
    and v.base_quantity <= 50000
    and not exists (
      select 1 from public.product_catalog_variants other
      where other.product_catalog_id = v.product_catalog_id
        and other.id <> v.id
        and other.base_quantity > 0
    )
  limit 1;

  assert test_variant.id is not null, 'el catálogo no tiene un producto con una sola presentación usable';

  insert into auth.users (id, aud, role, email)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha'),
    (user_w, 'authenticated', 'authenticated', user_w || '@prueba.tacha'),
    (user_r, 'authenticated', 'authenticated', user_r || '@prueba.tacha');

  insert into public.recipes (id, owner_id, name, base_servings)
  values
    (recipe_a, user_a, 'Receta A SCRUM-101', 4),
    (recipe_w, user_w, 'Receta W SCRUM-101', 4),
    (recipe_r, user_r, 'Receta R SCRUM-101', 4);

  -- A: pide la mitad de una presentación. W y R: dos presentaciones, para que
  -- la regla 21 deje 1 unidad y un faltante de una presentación.
  insert into public.recipe_ingredients (recipe_id, product_catalog_id, quantity_value, quantity_unit)
  values
    (recipe_a, test_variant.product_catalog_id, test_variant.base_quantity / 2, test_variant.base_unit),
    (recipe_w, test_variant.product_catalog_id, 2 * test_variant.base_quantity, test_variant.base_unit),
    (recipe_r, test_variant.product_catalog_id, 2 * test_variant.base_quantity, test_variant.base_unit);

  -- El plan de A: lunes ×2 y martes ×1, los dos con la misma receta. El de W: lunes ×1.
  insert into public.meal_plans (owner_id, date, meal_type, recipe_id, servings_multiplier)
  values
    (user_a, date '2026-10-12', 'lunch', recipe_a, 2),
    (user_a, date '2026-10-13', 'lunch', recipe_a, 1),
    (user_w, date '2026-10-12', 'lunch', recipe_w, 1);

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_b', user_b::text, true);
  perform set_config('tacha_test.user_w', user_w::text, true);
  perform set_config('tacha_test.user_r', user_r::text, true);
  perform set_config('tacha_test.recipe_a', recipe_a::text, true);
  perform set_config('tacha_test.recipe_r', recipe_r::text, true);
  perform set_config('tacha_test.product_id', test_variant.product_catalog_id::text, true);
  perform set_config('tacha_test.variant_id', test_variant.id::text, true);
  perform set_config('tacha_test.base_quantity', test_variant.base_quantity::text, true);
  perform set_config('tacha_test.base_unit', test_variant.base_unit, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Las funciones existen, no abren nada a anon y son security invoker con
--    search_path vacío.
-- ----------------------------------------------------------------------------

do $$
declare
  week_fn pg_proc;
  core_fn pg_proc;
begin
  select * into week_fn from pg_proc
  where oid = 'public.add_week_to_general_list(date, date)'::regprocedure;
  select * into core_fn from pg_proc
  where oid = 'public.add_week_ingredients_to_list(uuid, uuid, numeric)'::regprocedure;

  assert not week_fn.prosecdef, 'add_week_to_general_list es security invoker';
  assert not core_fn.prosecdef, 'add_week_ingredients_to_list es security invoker';
  assert coalesce(week_fn.proconfig, array[]::text[]) @> array['search_path=""'],
    'add_week_to_general_list fija un search_path vacío';
  assert coalesce(core_fn.proconfig, array[]::text[]) @> array['search_path=""'],
    'add_week_ingredients_to_list fija un search_path vacío';

  assert not has_function_privilege('anon', 'public.add_week_to_general_list(date, date)', 'execute'),
    'anon no ejecuta add_week_to_general_list';
  assert has_function_privilege('authenticated', 'public.add_week_to_general_list(date, date)', 'execute'),
    'authenticated ejecuta add_week_to_general_list';
  assert not has_function_privilege('anon', 'public.add_week_ingredients_to_list(uuid, uuid, numeric)', 'execute'),
    'anon no ejecuta add_week_ingredients_to_list';
  assert has_function_privilege('authenticated', 'public.add_week_ingredients_to_list(uuid, uuid, numeric)', 'execute'),
    'authenticated ejecuta add_week_ingredients_to_list';
end $$;

-- ----------------------------------------------------------------------------
-- 2. Usuario A: la semana con dos comidas de la misma receta (×2 y ×1).
--    El producto cae en UNA fila de la lista, lo pedido se escala por el
--    multiplicador y el faltante del segundo día descuenta lo que ya pidió el
--    primero (reglas 20 y 21).
-- ----------------------------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  base_quantity numeric := current_setting('tacha_test.base_quantity')::numeric;
  week_result jsonb;
  item_count integer;
  item public.list_items;
  requirement public.list_item_recipe_requirements;
begin
  week_result := public.add_week_to_general_list(date '2026-10-12', date '2026-10-18');

  assert (week_result ->> 'meals')::integer = 2, format('dos comidas en la semana. Resultado: %s', week_result);
  assert (week_result ->> 'ingredients')::integer = 1,
    format('un solo ingrediente distinto aunque salga dos días. Resultado: %s', week_result);

  -- CA-02: una sola fila del producto, sin duplicarse.
  select count(*) into item_count
  from public.list_items li
  join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
  where v.product_catalog_id = current_setting('tacha_test.product_id')::uuid;
  assert item_count = 1, 'el mismo ingrediente de dos días queda en una sola fila de la lista';

  select li.* into item
  from public.list_items li
  where li.product_catalog_variant_id = current_setting('tacha_test.variant_id')::uuid;
  assert item.quantity_requested = 1, 'una unidad: la presentación cubre lo del lunes y lo del martes se descuenta';

  -- El multiplicador escala: lunes ×2 pide b/2 × 2 = b, martes ×1 pide b/2.
  -- Si el multiplicador se ignorara serían b/2 + b/2 = b.
  select req.* into requirement
  from public.list_item_recipe_requirements req
  where req.list_item_id = item.id and req.recipe_id = current_setting('tacha_test.recipe_a')::uuid;
  assert requirement.quantity_needed = base_quantity * 1.5,
    format('lo pedido es b (lunes ×2) + b/2 (martes ×1) = 1,5 b, y fue %s con b = %s', requirement.quantity_needed, base_quantity);
  assert requirement.quantity_missing = base_quantity / 2,
    format('el martes ya no hay disponible: falta b/2, y fue %s', requirement.quantity_missing);

  -- Regla 22 del plan: el faltante de la semana se suma por producto y unidad.
  assert jsonb_array_length(week_result -> 'missing') = 1, format('un faltante. Resultado: %s', week_result);
  assert (week_result -> 'missing' -> 0 ->> 'quantity')::numeric = base_quantity / 2,
    format('el faltante del resumen es b/2. Resultado: %s', week_result);
  assert week_result -> 'skipped' = '[]'::jsonb, 'nada omitido';
end $$;

-- ----------------------------------------------------------------------------
-- 3. Usuario A: límites y errores.
-- ----------------------------------------------------------------------------

do $$
declare
  general_list_id uuid;
  bad_multiplier numeric;
  rows_before integer;
  empty_result jsonb;
begin
  -- Rango invertido, de más de 7 días o con nulos: 22023.
  begin
    perform public.add_week_to_general_list(date '2026-10-18', date '2026-10-12');
    assert false, 'un rango invertido no se rechazó';
  exception when invalid_parameter_value then null; end;

  begin
    perform public.add_week_to_general_list(date '2026-10-12', date '2026-10-19');
    assert false, 'un rango de 8 días no se rechazó';
  exception when invalid_parameter_value then null; end;

  begin
    perform public.add_week_to_general_list(null, date '2026-10-18');
    assert false, 'un rango con nulo no se rechazó';
  exception when invalid_parameter_value then null; end;

  -- Siete días exactos sí se aceptan (una ventana sin comidas, para no repetir lo de arriba).
  perform public.add_week_to_general_list(date '2026-11-02', date '2026-11-08');

  -- El multiplicador de la función interna se valida aunque se llame directo.
  select l.id into general_list_id from public.lists l
  where l.owner_id = auth.uid() and l.type = 'general' and l.household_id is null;

  foreach bad_multiplier in array array[0, 0.4, 4.5, 5, -1]
  loop
    begin
      perform public.add_week_ingredients_to_list(
        general_list_id, current_setting('tacha_test.recipe_a')::uuid, bad_multiplier
      );
      assert false, format('el multiplicador %s no se rechazó', bad_multiplier);
    exception when invalid_parameter_value then null; end;
  end loop;

  begin
    perform public.add_week_ingredients_to_list(general_list_id, current_setting('tacha_test.recipe_a')::uuid, null);
    assert false, 'un multiplicador nulo no se rechazó';
  exception when invalid_parameter_value then null; end;

  -- Una semana sin comidas no cambia la lista.
  select count(*) into rows_before from public.list_items;
  empty_result := public.add_week_to_general_list(date '2026-10-26', date '2026-11-01');
  assert (empty_result ->> 'meals')::integer = 0 and (empty_result ->> 'ingredients')::integer = 0,
    format('semana vacía: 0 comidas y 0 ingredientes. Resultado: %s', empty_result);
  assert (select count(*) from public.list_items) = rows_before, 'una semana vacía no escribe en la lista';
end $$;

-- ----------------------------------------------------------------------------
-- 4. Usuario B: sin plan, no ve ni suma nada de A, y una semana vacía no crea
--    ni la lista.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  other_result jsonb;
begin
  other_result := public.add_week_to_general_list(date '2026-10-12', date '2026-10-18');

  assert (other_result ->> 'meals')::integer = 0,
    format('B no tiene plan: la semana de A no le cuenta. Resultado: %s', other_result);
  assert (select count(*) from public.list_items) = 0, 'B no ve ninguna fila de la lista de A';
  assert (select count(*) from public.list_item_recipe_requirements) = 0, 'B no ve ningún registro de A';
end $$;

reset role;

do $$
begin
  assert not exists (
    select 1 from public.lists where owner_id = current_setting('tacha_test.user_b')::uuid
  ), 'una semana vacía no crea la lista general';

  -- Y lo de A sigue igual: ninguna llamada de B lo tocó.
  assert (
    select li.quantity_requested
    from public.list_items li
    join public.lists l on l.id = li.list_id
    where l.owner_id = current_setting('tacha_test.user_a')::uuid
  ) = 1, 'la lista de A no cambió';
end $$;

-- ----------------------------------------------------------------------------
-- 5. Sin sesión y como anon.
-- ----------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{}', true);

do $$
begin
  perform public.add_week_to_general_list(date '2026-10-12', date '2026-10-18');
  assert false, 'sin sesión no se puede agregar la semana';
exception
  when insufficient_privilege then null; -- 42501
end $$;

reset role;
set local role anon;

do $$
begin
  perform public.add_week_to_general_list(date '2026-10-12', date '2026-10-18');
  assert false, 'anon no tiene permiso de ejecución';
exception
  when insufficient_privilege then null;
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 6. Todo o nada: una semana cuya segunda comida es una receta con 51
--    ingredientes se aborta entera, y la primera comida no deja nada. Solo si
--    el catálogo tiene 51 productos distintos.
-- ----------------------------------------------------------------------------

do $$
declare
  product_ids uuid[];
  big_recipe uuid := gen_random_uuid();
begin
  select array_agg(id) into product_ids from (select id from public.product_catalog limit 51) as products;

  if coalesce(cardinality(product_ids), 0) < 51 then
    raise notice 'Paso 6 omitido: el catálogo tiene menos de 51 productos.';
    perform set_config('tacha_test.big_recipe', '', true);
    return;
  end if;

  insert into public.recipes (id, owner_id, name, base_servings)
  values (big_recipe, current_setting('tacha_test.user_a')::uuid, 'Receta grande SCRUM-101', 4);

  insert into public.recipe_ingredients (recipe_id, product_catalog_id, quantity_value, quantity_unit)
  select big_recipe, product_id, 1, 'g' from unnest(product_ids) as product_id;

  -- Miércoles: la receta buena (se agregaría). Jueves: la de 51 ingredientes (falla).
  insert into public.meal_plans (owner_id, date, meal_type, recipe_id, servings_multiplier)
  values
    (current_setting('tacha_test.user_a')::uuid, date '2026-10-14', 'breakfast', current_setting('tacha_test.recipe_a')::uuid, 1),
    (current_setting('tacha_test.user_a')::uuid, date '2026-10-15', 'breakfast', big_recipe, 1);

  perform set_config('tacha_test.big_recipe', big_recipe::text, true);
end $$;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  needed_before numeric;
  items_before integer;
begin
  if current_setting('tacha_test.big_recipe') = '' then
    return;
  end if;

  select coalesce(sum(quantity_needed), 0) into needed_before from public.list_item_recipe_requirements;
  select count(*) into items_before from public.list_items;

  begin
    perform public.add_week_to_general_list(date '2026-10-12', date '2026-10-18');
    assert false, 'la semana con una receta de 51 ingredientes no se rechazó';
  exception when invalid_parameter_value then null; end;

  assert (select coalesce(sum(quantity_needed), 0) from public.list_item_recipe_requirements) = needed_before,
    'todo o nada: la comida anterior no dejó registros';
  assert (select count(*) from public.list_items) = items_before, 'todo o nada: la lista quedó como estaba';
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 7. Equivalencia: una semana con una sola comida ×1 deja la lista igual que
--    agregar esa receta suelta con add_recipe_to_general_list. Si alguien
--    corrige una de las dos copias de las reglas 17 a 26 y no la otra, esto
--    falla.
-- ----------------------------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_w'), 'role', 'authenticated')::text,
  true
);

select set_config(
  'tacha_test.week_result',
  public.add_week_to_general_list(date '2026-10-12', date '2026-10-18')::text,
  true
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_r'), 'role', 'authenticated')::text,
  true
);

select set_config(
  'tacha_test.recipe_result',
  public.add_recipe_to_general_list(current_setting('tacha_test.recipe_r')::uuid)::text,
  true
);

reset role;

do $$
declare
  week_result jsonb := current_setting('tacha_test.week_result')::jsonb;
  recipe_result jsonb := current_setting('tacha_test.recipe_result')::jsonb;
  week_item record;
  recipe_item record;
begin
  assert week_result -> 'added' = recipe_result -> 'added',
    format('lo agregado coincide. Semana: %s. Receta: %s', week_result, recipe_result);
  assert week_result -> 'missing' = recipe_result -> 'missing',
    format('lo que falta coincide. Semana: %s. Receta: %s', week_result, recipe_result);
  assert week_result -> 'skipped' = recipe_result -> 'skipped',
    format('lo omitido coincide. Semana: %s. Receta: %s', week_result, recipe_result);

  select li.product_catalog_variant_id, li.quantity_requested, req.quantity_needed, req.quantity_missing, req.quantity_unit
  into week_item
  from public.list_items li
  join public.lists l on l.id = li.list_id
  join public.list_item_recipe_requirements req on req.list_item_id = li.id
  where l.owner_id = current_setting('tacha_test.user_w')::uuid;

  select li.product_catalog_variant_id, li.quantity_requested, req.quantity_needed, req.quantity_missing, req.quantity_unit
  into recipe_item
  from public.list_items li
  join public.lists l on l.id = li.list_id
  join public.list_item_recipe_requirements req on req.list_item_id = li.id
  where l.owner_id = current_setting('tacha_test.user_r')::uuid;

  assert week_item.product_catalog_variant_id = recipe_item.product_catalog_variant_id,
    'la misma presentación en la lista';
  assert week_item.quantity_requested = recipe_item.quantity_requested, 'la misma cantidad en la lista';
  assert week_item.quantity_needed = recipe_item.quantity_needed, 'el mismo registro de lo pedido';
  assert week_item.quantity_missing = recipe_item.quantity_missing, 'el mismo registro del faltante';
  assert week_item.quantity_unit = recipe_item.quantity_unit, 'la misma unidad';
end $$;

select set_config('tacha_test.done', 'ok', true);

rollback;
