-- ============================================================================
-- Prueba de la migración 058 (SCRUM-160): elegir a qué lista se agrega la semana.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 058. Todo pasa dentro de una transacción que termina en rollback,
-- así que no deja usuarios, familias, recetas ni listas en la base compartida.
-- Si una regla no se cumple, un `assert` corta con su mensaje; si termina sin
-- error, pasó. Contra la base sin 058 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes.
--
-- Datos (todos propios de la prueba, para no depender del catálogo):
--   P: una presentación de 1000 ml. Q: una de 6 unidades. S: sin presentación.
--   A (admin) y B (miembro) en la familia 1; C en la familia 2; W sin familia.
--   Receta de cada uno: 800 ml de P, 3 unidades de Q y 1 unidad de S.
--   A, B y W la planean el lunes ×2 y el martes ×1 de 2030-01-07.
--     P: lunes 1600 (entra 1 de 1000, faltan 600) y martes 800 (lo de la lista
--     ya lo pidió el lunes, faltan 800): 1 envase, pedido 2400, falta 1400.
--     Q: lunes ceil(6/6) = 1 y martes ceil(3/6) = 1: 2 paquetes.
--   A, además, el lunes 2030-01-21 tiene la receta normal y el martes una de
--   51 ingredientes (el tope es 50): la semana entera falla.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño).
-- ----------------------------------------------------------------------------

do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  user_c uuid := gen_random_uuid();
  user_w uuid := gen_random_uuid();
  household_1 uuid := gen_random_uuid();
  household_2 uuid := gen_random_uuid();
  product_p uuid := gen_random_uuid();
  product_q uuid := gen_random_uuid();
  product_s uuid := gen_random_uuid();
  variant_p uuid := gen_random_uuid();
  variant_q uuid := gen_random_uuid();
  big_recipe uuid := gen_random_uuid();
  recipe_owner uuid;
  new_recipe uuid;
  new_list uuid;
  list_spec record;
begin
  insert into public.product_catalog (id, name, source)
  values
    (product_p, 'P160 leche ' || product_p, 'manual'),
    (product_q, 'P160 huevo ' || product_q, 'manual'),
    (product_s, 'P160 sal ' || product_s, 'manual');

  insert into public.product_catalog_variants (id, product_catalog_id, name, base_unit, base_quantity)
  values
    (variant_p, product_p, 'P160 leche 1000 ml', 'ml', 1000),
    (variant_q, product_q, 'P160 huevo 6 unidades', 'unidad', 6);

  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  select id, 'authenticated', 'authenticated', id || '@prueba.tacha', '{"name": "Prueba"}'
  from unnest(array[user_a, user_b, user_c, user_w]) as t(id);

  insert into public.households (id, name)
  values (household_1, 'Familia 1 SCRUM-160'), (household_2, 'Familia 2 SCRUM-160');
  insert into public.household_members (user_id, household_id, role)
  values (user_a, household_1, 'admin'), (user_b, household_1, 'member'), (user_c, household_2, 'admin');

  foreach recipe_owner in array array[user_a, user_b, user_w] loop
    new_recipe := gen_random_uuid();

    insert into public.recipes (id, owner_id, name, base_servings)
    values (new_recipe, recipe_owner, 'Receta SCRUM-160', 2);

    insert into public.recipe_ingredients (recipe_id, product_catalog_id, quantity_value, quantity_unit, position)
    values
      (new_recipe, product_p, 800, 'ml', 0),
      (new_recipe, product_q, 3, 'unidad', 1),
      (new_recipe, product_s, 1, 'unidad', 2);

    insert into public.meal_plans (owner_id, date, meal_type, recipe_id, servings_multiplier)
    values
      (recipe_owner, date '2030-01-07', 'lunch', new_recipe, 2),
      (recipe_owner, date '2030-01-08', 'lunch', new_recipe, 1);

    if recipe_owner = user_a then
      insert into public.meal_plans (owner_id, date, meal_type, recipe_id, servings_multiplier)
      values (user_a, date '2030-01-21', 'lunch', new_recipe, 1);
    end if;
  end loop;

  insert into public.recipes (id, owner_id, name, base_servings)
  values (big_recipe, user_a, 'Receta enorme SCRUM-160', 2);

  with extra_products as (
    insert into public.product_catalog (name, source)
    select 'P160 extra ' || n || ' ' || big_recipe, 'manual'
    from generate_series(0, 50) as n
    returning id
  )
  insert into public.recipe_ingredients (recipe_id, product_catalog_id, quantity_value, quantity_unit, position)
  select big_recipe, id, 1, 'unidad', row_number() over () - 1
  from extra_products;

  insert into public.meal_plans (owner_id, date, meal_type, recipe_id, servings_multiplier)
  values (user_a, date '2030-01-22', 'lunch', big_recipe, 1);

  -- Las listas, cada una con su id en tacha_test.<nombre>.
  for list_spec in
    select * from (values
      ('family_list', user_a, household_1, 'active'),
      ('family_list_2', user_a, household_1, 'active'),
      ('cancelled_list', user_a, household_1, 'cancelled'),
      ('completed_list', user_a, household_1, 'completed'),
      ('foreign_list', user_c, household_2, 'active'),
      ('w_list', user_w, null::uuid, 'active')
    ) as t(list_key, owner_id, household_id, status)
  loop
    insert into public.lists (owner_id, household_id, type, status, name, event_date)
    values (list_spec.owner_id, list_spec.household_id, 'date', list_spec.status, list_spec.list_key, date '2030-01-10')
    returning id into new_list;

    perform set_config('tacha_test.' || list_spec.list_key, new_list::text, true);
  end loop;

  insert into public.lists (owner_id, household_id, type)
  values (user_a, household_1, 'general')
  returning id into new_list;
  perform set_config('tacha_test.family_general', new_list::text, true);

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_b', user_b::text, true);
  perform set_config('tacha_test.user_w', user_w::text, true);
  perform set_config('tacha_test.variant_p', variant_p::text, true);
  perform set_config('tacha_test.variant_q', variant_q::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos y forma de las funciones.
-- ----------------------------------------------------------------------------

do $$
begin
  assert to_regprocedure('public.add_week_to_list(date, date, uuid)') is not null,
    'no existe add_week_to_list: falta aplicar la 058';
  assert not has_function_privilege('anon', 'public.add_week_to_list(date, date, uuid)', 'execute'),
    'anon no debe ejecutar add_week_to_list';
  assert has_function_privilege('authenticated', 'public.add_week_to_list(date, date, uuid)', 'execute'),
    'authenticated debe ejecutar add_week_to_list';
  assert not has_function_privilege('anon', 'public.add_week_to_general_list(date, date)', 'execute'),
    'anon no debe ejecutar add_week_to_general_list';
  assert has_function_privilege('authenticated', 'public.add_week_to_general_list(date, date)', 'execute'),
    'authenticated debe ejecutar add_week_to_general_list';
  assert (
    select bool_and(not p.prosecdef) and count(*) = 2
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('add_week_to_list', 'add_week_to_general_list')
  ), 'las dos son security invoker y sin sobrecargas';
end $$;

-- ----------------------------------------------------------------------------
-- 2. Sin sesión.
-- ----------------------------------------------------------------------------

select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
set local role authenticated;

do $$
begin
  perform public.add_week_to_list(
    date '2030-01-07', date '2030-01-13', current_setting('tacha_test.family_list')::uuid
  );
  raise exception using errcode = 'P0004', message = 'sin sesión se agregó';
exception
  when insufficient_privilege then null;
end $$;

-- ----------------------------------------------------------------------------
-- 3. A: rango inválido y destinos que no sirven. Nada se escribe.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);
select set_config('request.jwt.claim.sub', current_setting('tacha_test.user_a'), true);

do $$
declare
  bad_range record;
  bad_target record;
  error_hint text;
begin
  for bad_range in
    select * from (values
      (date '2030-01-13', date '2030-01-07'),
      (date '2030-01-07', date '2030-01-14'),
      (null::date, date '2030-01-13'),
      (date '2030-01-07', null::date)
    ) as t(week_from, week_to)
  loop
    begin
      perform public.add_week_to_list(
        bad_range.week_from, bad_range.week_to, current_setting('tacha_test.family_list')::uuid
      );
      raise exception using errcode = 'P0004', message = 'aceptó un rango inválido';
    exception
      when invalid_parameter_value then null;
    end;
  end loop;

  -- Con comidas y con la semana vacía (2030-02-04): el destino se valida igual.
  for bad_target in
    select t.label, t.list_id, w.week_from
    from (values
      ('cancelada', current_setting('tacha_test.cancelled_list')::uuid),
      ('completada', current_setting('tacha_test.completed_list')::uuid),
      ('ajena', current_setting('tacha_test.foreign_list')::uuid),
      ('general', current_setting('tacha_test.family_general')::uuid),
      ('inexistente', gen_random_uuid())
    ) as t(label, list_id)
    cross join (values (date '2030-01-07'), (date '2030-02-04')) as w(week_from)
  loop
    begin
      perform public.add_week_to_list(
        bad_target.week_from, bad_target.week_from + 6, bad_target.list_id
      );
      raise exception using errcode = 'P0004', message = 'aceptó una sublista ' || bad_target.label;
    exception
      when no_data_found then
        get stacked diagnostics error_hint = pg_exception_hint;
        assert error_hint = 'date_list_unavailable', 'hint de ' || bad_target.label || ': ' || error_hint;
    end;
  end loop;

  -- Semana vacía y destino válido: ceros, sin error.
  assert public.add_week_to_list(
    date '2030-02-04', date '2030-02-10', current_setting('tacha_test.family_list')::uuid
  ) = '{"meals": 0, "ingredients": 0, "added": [], "missing": [], "skipped": []}'::jsonb,
    'la semana vacía responde ceros';
end $$;

-- Todo o nada: la segunda comida pasa el tope de 50 ingredientes.
do $$
begin
  perform public.add_week_to_list(
    date '2030-01-21', date '2030-01-27', current_setting('tacha_test.family_list')::uuid
  );
  raise exception using errcode = 'P0004', message = 'agregó una semana que debía fallar';
exception
  when invalid_parameter_value then null;
end $$;

reset role;

do $$
begin
  assert not exists (
    select 1 from public.list_items li
    where li.list_id in (
      current_setting('tacha_test.family_list')::uuid,
      current_setting('tacha_test.cancelled_list')::uuid,
      current_setting('tacha_test.completed_list')::uuid,
      current_setting('tacha_test.foreign_list')::uuid,
      current_setting('tacha_test.family_general')::uuid
    )
  ), 'los pasos que fallan no dejan productos';
end $$;

-- ----------------------------------------------------------------------------
-- 4. A agrega a la sublista de la familia: cantidades, faltante y una sola fila.
-- ----------------------------------------------------------------------------

set local role authenticated;

do $$
declare
  result jsonb;
begin
  result := public.add_week_to_list(
    date '2030-01-07', date '2030-01-13', current_setting('tacha_test.family_list')::uuid
  );

  assert (result ->> 'meals')::integer = 2, 'dos comidas: ' || result;
  assert (result ->> 'ingredients')::integer = 2, 'dos productos distintos: ' || result;
  assert jsonb_array_length(result -> 'skipped') = 1, 'S no tiene presentación: ' || result;
  assert jsonb_array_length(result -> 'missing') = 1
    and (result -> 'missing' -> 0 ->> 'quantity')::numeric = 1400,
    'a P le faltan 1400 ml: ' || result;
end $$;

reset role;

do $$
begin
  assert (
    select count(*) = 2
      and bool_and(li.checked_at is null)
      and sum(li.quantity_requested) filter (
        where li.product_catalog_variant_id = current_setting('tacha_test.variant_p')::uuid
      ) = 1
      and sum(li.quantity_requested) filter (
        where li.product_catalog_variant_id = current_setting('tacha_test.variant_q')::uuid
      ) = 2
    from public.list_items li
    where li.list_id = current_setting('tacha_test.family_list')::uuid
  ), 'una fila de P (1) y una de Q (2)';

  assert (
    select count(*) = 1
      and sum(req.quantity_needed) = 2400
      and sum(req.quantity_missing) = 1400
    from public.list_item_recipe_requirements req
    join public.list_items li on li.id = req.list_item_id
    where li.list_id = current_setting('tacha_test.family_list')::uuid
  ), 'el faltante queda registrado una sola vez por receta';

  assert not exists (
    select 1 from public.list_items li
    where li.list_id in (
      current_setting('tacha_test.family_list_2')::uuid,
      current_setting('tacha_test.family_general')::uuid
    )
  ), 'las otras listas no cambian (regla 43)';

  assert (
    select l.status = 'active' from public.lists l
    where l.id = current_setting('tacha_test.family_list')::uuid
  ), 'la sublista sigue pendiente';
end $$;

-- El faltante de la sublista no sale en la lista general (regla 44).
set local role authenticated;

do $$
begin
  assert not exists (
    select 1 from public.get_general_list_recipe_shortfalls(date_trunc('day', now()))
  ), 'la lista general no muestra el faltante de una sublista';
end $$;

-- ----------------------------------------------------------------------------
-- 5. B, otro miembro, agrega su plan a otra sublista de la misma familia.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);
select set_config('request.jwt.claim.sub', current_setting('tacha_test.user_b'), true);

do $$
declare
  result jsonb;
begin
  result := public.add_week_to_list(
    date '2030-01-07', date '2030-01-13', current_setting('tacha_test.family_list_2')::uuid
  );
  assert (result ->> 'meals')::integer = 2, 'B agrega solo su plan: ' || result;
  assert (
    select count(*) = 2 from public.list_items li
    where li.list_id = current_setting('tacha_test.family_list_2')::uuid
  ), 'un miembro agrega a la sublista de su familia';
end $$;

-- ----------------------------------------------------------------------------
-- 6. W, sin familia: la sublista y la general quedan con las mismas filas, la
--    general se crea recién al usarla, y las dos formas de llamar a la general
--    responden igual.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_w'), 'role', 'authenticated')::text,
  true
);
select set_config('request.jwt.claim.sub', current_setting('tacha_test.user_w'), true);

do $$
declare
  date_result jsonb;
  general_result jsonb;
  list_w uuid := current_setting('tacha_test.w_list')::uuid;
  general_w uuid;
begin
  -- Semana vacía sin destino: no crea la general.
  perform public.add_week_to_list(date '2030-02-04', date '2030-02-10');
  assert public.find_general_list_id() is null, 'la semana vacía no crea la lista general';

  date_result := public.add_week_to_list(date '2030-01-07', date '2030-01-13', list_w);
  assert public.find_general_list_id() is null, 'agregar a una sublista no crea la lista general';

  general_result := public.add_week_to_general_list(date '2030-01-07', date '2030-01-13');
  general_w := public.find_general_list_id();

  assert date_result = general_result, format('%s <> %s', date_result, general_result);

  assert not exists (
    select li.product_catalog_variant_id, li.quantity_requested from public.list_items li where li.list_id = list_w
    except
    select li.product_catalog_variant_id, li.quantity_requested from public.list_items li where li.list_id = general_w
  ) and (
    select count(*) from public.list_items li where li.list_id = list_w
  ) = (
    select count(*) from public.list_items li where li.list_id = general_w
  ), 'sublista y general quedan con las mismas filas';

  -- Sin destino es la general: Q suma otros 2 paquetes ahí y no en la sublista.
  perform public.add_week_to_list(date '2030-01-07', date '2030-01-13');
  assert (
    select li.quantity_requested = 4 from public.list_items li
    where li.list_id = general_w
      and li.product_catalog_variant_id = current_setting('tacha_test.variant_q')::uuid
  ), 'sin destino agrega a la general';
  assert (
    select li.quantity_requested = 2 from public.list_items li
    where li.list_id = list_w
      and li.product_catalog_variant_id = current_setting('tacha_test.variant_q')::uuid
  ), 'la sublista no cambia al agregar a la general';

  begin
    perform public.add_week_to_general_list(date '2030-01-13', date '2030-01-07');
    raise exception using errcode = 'P0004', message = 'la general aceptó un rango invertido';
  exception
    when invalid_parameter_value then null;
  end;
end $$;

reset role;
rollback;
