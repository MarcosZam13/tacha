-- ============================================================================
-- Prueba de la migración 024 (SCRUM-59): lista general de la familia y
-- decidir qué hacer con la lista personal.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 024. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios, familias ni listas en la base
-- compartida. Si una regla no se cumple, un `assert` corta con su mensaje; si
-- termina sin error, pasó. Contra la base sin 024 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- Datos:
--   familia 1: A (admin), B (miembro) y D (miembro).
--   familia 2: C (admin, único miembro).
--   E: usuario registrado sin familia.
--   A tiene una lista general personal con v1 x1 pendiente.
--   B tiene una lista general personal con v1 x2 pendiente (con un requisito
--   de su receta), v2 x1 tachado, v3 x3 pendiente y v4 x1 pendiente.
--   D tiene una lista general personal con solo v4 x2 pendiente.
--   v1 a v4 son cuatro variantes cualesquiera del catálogo; la tienda, la
--   primera de public.stores (la usa la compra de A en el paso 6).
--
-- La concurrencia real (dos sesiones a la vez) no se puede reproducir en una
-- sola transacción: esta prueba comprueba los estados finales. El diseño de
-- bloqueos está en features/household/specs/plan.md (SCRUM-59).
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
  user_d uuid := gen_random_uuid();
  user_e uuid := gen_random_uuid();
  household_1 uuid := gen_random_uuid();
  household_2 uuid := gen_random_uuid();
  recipe_a uuid := gen_random_uuid();
  recipe_b uuid := gen_random_uuid();
  list_a uuid := gen_random_uuid();
  list_b uuid := gen_random_uuid();
  list_d uuid := gen_random_uuid();
  item_b_v1 uuid := gen_random_uuid();
  variant_ids uuid[];
  store_id uuid := (select s.id from public.stores s order by s.slug limit 1);
begin
  select array_agg(v.id order by v.id) into variant_ids
  from (select v.id from public.product_catalog_variants v order by v.id limit 4) v;

  if coalesce(array_length(variant_ids, 1), 0) < 4 then
    raise exception 'Hacen falta al menos 4 variantes en product_catalog_variants para esta prueba';
  end if;

  -- Mismo origen de tienda que 016, 018 y 023: las crea schema.sql.
  if store_id is null then
    raise exception 'No hay tiendas en public.stores: aplicar schema.sql antes de esta prueba';
  end if;

  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha', '{"name": "Ana"}'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha', '{"name": "Beto"}'),
    (user_c, 'authenticated', 'authenticated', user_c || '@prueba.tacha', '{"name": "Caro"}'),
    (user_d, 'authenticated', 'authenticated', user_d || '@prueba.tacha', '{"name": "Dani"}'),
    (user_e, 'authenticated', 'authenticated', user_e || '@prueba.tacha', '{"name": "Eva"}');

  insert into public.households (id, name)
  values (household_1, 'Familia 1 SCRUM-59'), (household_2, 'Familia 2 SCRUM-59');

  insert into public.household_members (user_id, household_id, role)
  values
    (user_a, household_1, 'admin'),
    (user_b, household_1, 'member'),
    (user_d, household_1, 'member'),
    (user_c, household_2, 'admin');

  insert into public.lists (id, owner_id, household_id, type)
  values (list_a, user_a, null, 'general'), (list_b, user_b, null, 'general'), (list_d, user_d, null, 'general');

  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested)
  values (list_a, variant_ids[1], 1);

  insert into public.list_items (id, list_id, product_catalog_variant_id, quantity_requested)
  values (item_b_v1, list_b, variant_ids[1], 2);
  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested, checked_at)
  values (list_b, variant_ids[2], 1, now());
  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested)
  values (list_b, variant_ids[3], 3);
  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested)
  values (list_b, variant_ids[4], 1);
  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested)
  values (list_d, variant_ids[4], 2);

  insert into public.recipes (id, owner_id, household_id, name, base_servings)
  values
    (recipe_a, user_a, null, 'Receta A SCRUM-59', 2),
    (recipe_b, user_b, null, 'Receta B SCRUM-59', 2);
  insert into public.list_item_recipe_requirements (
    list_item_id, recipe_id, quantity_needed, quantity_missing, quantity_unit
  )
  values (item_b_v1, recipe_b, 2, 1, 'unidad');

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_b', user_b::text, true);
  perform set_config('tacha_test.user_c', user_c::text, true);
  perform set_config('tacha_test.user_d', user_d::text, true);
  perform set_config('tacha_test.list_d', list_d::text, true);
  perform set_config('tacha_test.user_e', user_e::text, true);
  perform set_config('tacha_test.household_1', household_1::text, true);
  perform set_config('tacha_test.household_2', household_2::text, true);
  perform set_config('tacha_test.recipe_a', recipe_a::text, true);
  perform set_config('tacha_test.recipe_b', recipe_b::text, true);
  perform set_config('tacha_test.list_a', list_a::text, true);
  perform set_config('tacha_test.list_b', list_b::text, true);
  perform set_config('tacha_test.v1', variant_ids[1]::text, true);
  perform set_config('tacha_test.v2', variant_ids[2]::text, true);
  perform set_config('tacha_test.v3', variant_ids[3]::text, true);
  perform set_config('tacha_test.v4', variant_ids[4]::text, true);
  perform set_config('tacha_test.store', store_id::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos y sesiones: anon no ejecuta las funciones nuevas; sin sesión y
--    con sesión anónima, las de la decisión rechazan con 42501.
-- ----------------------------------------------------------------------------

do $$
begin
  assert not has_function_privilege('anon', 'public.get_personal_lists_decision_state()', 'execute'),
    'anon no ejecuta get_personal_lists_decision_state';
  assert not has_function_privilege('anon', 'public.decide_personal_lists(text)', 'execute'),
    'anon no ejecuta decide_personal_lists';
  assert not has_function_privilege('anon', 'public.ensure_general_list_id()', 'execute'),
    'anon no ejecuta ensure_general_list_id';
  assert not has_function_privilege('anon', 'public.find_general_list_id()', 'execute'),
    'anon no ejecuta find_general_list_id';
  assert has_function_privilege('authenticated', 'public.decide_personal_lists(text)', 'execute'),
    'authenticated ejecuta decide_personal_lists';
  assert not has_function_privilege('authenticated', 'public.release_household_personal_data()', 'execute'),
    'nadie llama a mano a la función del trigger';

  -- Quedan exactamente las políticas nuevas: ninguna vieja de solo la dueña
  -- (004, 012, 013) sigue abierta al lado.
  assert (select array_agg(p.policyname::text order by p.policyname) from pg_policies p
          where p.schemaname = 'public' and p.tablename = 'lists')
         = array['owner creates own lists', 'owner or household member reads lists'],
    'políticas de lists';
  assert (select array_agg(p.policyname::text order by p.policyname) from pg_policies p
          where p.schemaname = 'public' and p.tablename = 'list_items')
         = array['adds items to visible lists', 'deletes items of visible lists',
                 'reads items of visible lists', 'updates items of visible lists'],
    'políticas de list_items';
  assert (select array_agg(p.policyname::text order by p.policyname) from pg_policies p
          where p.schemaname = 'public' and p.tablename = 'list_item_recipe_requirements')
         = array['adds requirements of own recipes to visible items', 'reads requirements of visible items',
                 'updates requirements of own recipes on visible items'],
    'políticas de list_item_recipe_requirements';
end $$;

set local role authenticated;

select set_config('request.jwt.claims', '{}', true);

do $$
begin
  begin
    perform public.decide_personal_lists('share');
    assert false, 'sin sesión se pudo decidir';
  exception
    when insufficient_privilege then
      assert sqlerrm like 'Se requiere una cuenta registrada%', 'sin sesión: el 42501 tiene que ser por falta de cuenta';
  end;
end $$;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('tacha_test.user_b'), 'role', 'authenticated', 'is_anonymous', true
  )::text,
  true
);

do $$
begin
  begin
    perform public.get_personal_lists_decision_state();
    assert false, 'una sesión anónima pudo leer el estado de la decisión';
  exception
    when insufficient_privilege then
      assert sqlerrm like 'Se requiere una cuenta registrada%', 'sesión anónima: el 42501 tiene que ser por anónima';
  end;

  begin
    perform public.decide_personal_lists('share');
    assert false, 'una sesión anónima pudo decidir';
  exception
    when insufficient_privilege then
      assert sqlerrm like 'Se requiere una cuenta registrada%', 'sesión anónima: el 42501 tiene que ser por anónima';
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 2. A (admin de la familia 1) agrega un producto: va a la lista de la
--    familia (CA-05), que se crea en ese momento. Su lista personal no cambia.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  added_item public.list_items;
  household_list_id uuid;
begin
  assert public.find_general_list_id() is null,
    'antes de agregar, la familia 1 todavía no tiene lista general';

  added_item := public.add_item_to_general_list(current_setting('tacha_test.v2')::uuid);

  select l.id into household_list_id
  from public.lists l
  where l.household_id = current_setting('tacha_test.household_1')::uuid
    and l.type = 'general';

  assert household_list_id is not null, 'agregar como miembro crea la lista de la familia';
  assert added_item.list_id = household_list_id, 'el producto va a la lista de la familia, no a la personal';
  assert public.find_general_list_id() = household_list_id, 'find devuelve la lista de la familia';
  assert (select count(*) from public.list_items li
          where li.list_id = current_setting('tacha_test.list_a')::uuid) = 1,
    'la lista personal de A no cambia al agregar';

  perform set_config('tacha_test.household_list_1', household_list_id::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 3. B (miembro de la familia 1) ve y edita la lista de la familia (CA-04).
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  updated_rows integer;
begin
  assert (select count(*) from public.lists l
          where l.id = current_setting('tacha_test.household_list_1')::uuid) = 1,
    'B ve la lista de la familia';
  assert (select count(*) from public.list_items li
          where li.list_id = current_setting('tacha_test.household_list_1')::uuid) = 1,
    'B ve los productos de la lista de la familia';

  update public.list_items li
  set quantity_requested = 4
  where li.list_id = current_setting('tacha_test.household_list_1')::uuid;
  get diagnostics updated_rows = row_count;
  assert updated_rows = 1, 'B puede cambiar la cantidad en la lista de la familia';

  assert public.get_personal_lists_decision_state() = 'pending',
    'B tiene pendientes en su lista personal y no decidió: hay que preguntar (D1)';
end $$;

-- ----------------------------------------------------------------------------
-- 4. C (otra familia) y E (sin familia) no ven ni tocan la lista de la
--    familia 1. Nadie crea una lista de una familia desde el cliente.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_c'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  affected_rows integer;
begin
  assert (select count(*) from public.lists l
          where l.household_id = current_setting('tacha_test.household_1')::uuid) = 0,
    'C no ve la lista de otra familia';
  assert (select count(*) from public.list_items li
          where li.list_id = current_setting('tacha_test.household_list_1')::uuid) = 0,
    'C no ve los productos de otra familia';

  update public.list_items li
  set quantity_requested = 9
  where li.list_id = current_setting('tacha_test.household_list_1')::uuid;
  get diagnostics affected_rows = row_count;
  assert affected_rows = 0, 'C no puede cambiar productos de otra familia';

  delete from public.list_items li
  where li.list_id = current_setting('tacha_test.household_list_1')::uuid;
  get diagnostics affected_rows = row_count;
  assert affected_rows = 0, 'C no puede borrar productos de otra familia';

  begin
    insert into public.list_items (list_id, product_catalog_variant_id)
    values (current_setting('tacha_test.household_list_1')::uuid, current_setting('tacha_test.v3')::uuid);
    assert false, 'C pudo agregar a la lista de otra familia';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.lists (owner_id, household_id, type)
    values (
      current_setting('tacha_test.user_c')::uuid,
      current_setting('tacha_test.household_1')::uuid,
      'general'
    );
    assert false, 'C pudo crear una lista en una familia ajena';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.lists (owner_id, household_id, type)
    values (
      current_setting('tacha_test.user_c')::uuid,
      current_setting('tacha_test.household_2')::uuid,
      'general'
    );
    assert false, 'desde el cliente no se crea la lista de la familia (solo ensure_general_list_id)';
  exception
    when insufficient_privilege then null;
  end;

  assert public.get_personal_lists_decision_state() = 'nothing_to_decide',
    'C no tiene lista personal: no hay nada que decidir';

  assert (select count(*) from public.list_item_recipe_requirements r
          join public.list_items li on li.id = r.list_item_id
          where li.list_id = current_setting('tacha_test.household_list_1')::uuid) = 0,
    'C no ve requisitos de recetas de otra familia';
end $$;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  added_item public.list_items;
begin
  assert (select count(*) from public.lists l
          where l.household_id = current_setting('tacha_test.household_1')::uuid) = 0,
    'E (sin familia) no ve la lista de la familia 1';
  assert public.get_personal_lists_decision_state() = 'not_member', 'E no es miembro: not_member';
  assert public.decide_personal_lists('share') = 'not_member', 'E no puede compartir: not_member';

  -- Sin familia, todo sigue como antes: la lista general es personal.
  added_item := public.add_item_to_general_list(current_setting('tacha_test.v1')::uuid);
  assert (select l.household_id from public.lists l where l.id = added_item.list_id) is null,
    'sin familia, agregar va a la lista personal';
  assert (select l.owner_id from public.lists l where l.id = added_item.list_id)
         = current_setting('tacha_test.user_e')::uuid,
    'la lista personal es de E';
end $$;

-- ----------------------------------------------------------------------------
-- 5. Restricciones de la tabla (rol dueño): una lista privada no es de una
--    familia (D3) y cada familia tiene una sola lista general (D2).
-- ----------------------------------------------------------------------------

reset role;

do $$
begin
  begin
    insert into public.lists (owner_id, household_id, type)
    values (
      current_setting('tacha_test.user_a')::uuid,
      current_setting('tacha_test.household_1')::uuid,
      'private'
    );
    assert false, 'una lista privada quedó asociada a una familia';
  exception
    when check_violation then null;
  end;

  begin
    insert into public.lists (owner_id, household_id, type)
    values (
      current_setting('tacha_test.user_b')::uuid,
      current_setting('tacha_test.household_1')::uuid,
      'general'
    );
    assert false, 'la familia 1 quedó con dos listas generales';
  exception
    when unique_violation then null;
  end;

  begin
    insert into public.lists (owner_id, household_id, type)
    values (current_setting('tacha_test.user_a')::uuid, gen_random_uuid(), 'general');
    assert false, 'una lista quedó asociada a una familia que no existe';
  exception
    when foreign_key_violation then null;
  end;

  -- Para el paso 7: v3 en la lista de la familia, a 1 del máximo de integer.
  -- Compartir v3 x3 encima tiene que quedar en el tope, sin desbordar.
  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested)
  values (
    current_setting('tacha_test.household_list_1')::uuid,
    current_setting('tacha_test.v3')::uuid,
    2147483646
  );
end $$;

-- ----------------------------------------------------------------------------
-- 6. A decide "mantener": nada cambia (CA-03) y no se vuelve a preguntar
--    (CA-02). Una segunda decisión no hace nada.
-- ----------------------------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert public.get_personal_lists_decision_state() = 'pending', 'A tiene pendientes y no decidió';
  assert public.decide_personal_lists('keep') = 'kept', 'A mantiene su lista';
  assert public.get_personal_lists_decision_state() = 'decided', 'después de decidir no se vuelve a preguntar';
  assert public.decide_personal_lists('share') = 'already_decided', 'una segunda decisión no cambia nada';

  assert (select count(*) from public.list_items li
          where li.list_id = current_setting('tacha_test.list_a')::uuid
            and li.product_catalog_variant_id = current_setting('tacha_test.v1')::uuid
            and li.quantity_requested = 1
            and li.checked_at is null) = 1,
    'la lista personal de A sigue igual';
  assert (select count(*) from public.list_items li
          where li.list_id = current_setting('tacha_test.household_list_1')::uuid
            and li.product_catalog_variant_id = current_setting('tacha_test.v1')::uuid) = 0,
    'mantener no pasa nada a la lista de la familia';
  assert (select count(*) from public.lists l
          where l.id = current_setting('tacha_test.list_a')::uuid) = 1,
    'A sigue viendo su lista personal (D4)';
end $$;

-- A agrega v4 a la lista de la familia y lo compra en su compra (modo compra):
-- en el paso 7, compartir no puede borrar ese registro.
do $$
declare
  added_item public.list_items;
  session_id uuid;
begin
  added_item := public.add_item_to_general_list(current_setting('tacha_test.v4')::uuid);

  insert into public.purchase_sessions (store_id)
  values (current_setting('tacha_test.store')::uuid)
  returning id into session_id;

  update public.list_items li
  set checked_at = now(), purchase_session_id = session_id, quantity_bought = 1
  where li.id = added_item.id;

  perform set_config('tacha_test.session_a', session_id::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 7. B decide "compartir": sus pendientes pasan a la lista de la familia sin
--    duplicar variantes, con su requisito de receta; lo tachado se queda en
--    su lista personal (CA-04, T1). v3 suma hasta el tope de integer sin
--    desbordar. v4 ya lo compró A: no se toca su compra y, desde 035
--    (SCRUM-156), el pendiente de B entra como fila pendiente nueva (antes se
--    quedaba en su lista personal y devolvía 'shared_partially'). Una opción
--    inválida se rechaza.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  begin
    perform public.decide_personal_lists('borrar');
    assert false, 'se aceptó una opción inválida';
  exception
    when invalid_parameter_value then null;
  end;

  -- Para probar la suma: la familia ya tiene v1 pendiente x5.
  perform public.add_units_to_list_item(
    current_setting('tacha_test.household_list_1')::uuid,
    current_setting('tacha_test.v1')::uuid,
    5
  );

  assert public.decide_personal_lists('share') = 'shared',
    'B comparte todo, también v4 aunque A lo tenga comprado (035)';

  assert (select count(*) from public.list_items li
          where li.list_id = current_setting('tacha_test.household_list_1')::uuid
            and li.product_catalog_variant_id = current_setting('tacha_test.v1')::uuid) = 1,
    'v1 queda en una sola fila de la lista de la familia';
  assert (select li.quantity_requested from public.list_items li
          where li.list_id = current_setting('tacha_test.household_list_1')::uuid
            and li.product_catalog_variant_id = current_setting('tacha_test.v1')::uuid) = 7,
    'v1: 5 de la familia + 2 de B';
  assert (select li.quantity_requested from public.list_items li
          where li.list_id = current_setting('tacha_test.household_list_1')::uuid
            and li.product_catalog_variant_id = current_setting('tacha_test.v3')::uuid
            and li.checked_at is null) = 2147483647,
    'v3: 2147483646 + 3 queda en el máximo de integer, sin desbordar';

  assert (select count(*) from public.list_items li
          where li.list_id = current_setting('tacha_test.household_list_1')::uuid
            and li.product_catalog_variant_id = current_setting('tacha_test.v4')::uuid
            and li.checked_at is not null
            and li.purchase_session_id = current_setting('tacha_test.session_a')::uuid
            and li.quantity_bought = 1
            and li.quantity_requested = 1) = 1,
    'la compra de v4 de A sigue intacta';

  assert (select count(*) from public.list_item_recipe_requirements r
          join public.list_items li on li.id = r.list_item_id
          where li.list_id = current_setting('tacha_test.household_list_1')::uuid
            and li.product_catalog_variant_id = current_setting('tacha_test.v1')::uuid
            and r.recipe_id = current_setting('tacha_test.recipe_b')::uuid
            and r.quantity_needed = 2
            and r.quantity_missing = 1) = 1,
    'el requisito de la receta de B pasa a la fila de la familia';

  assert (select count(*) from public.list_items li
          where li.list_id = current_setting('tacha_test.household_list_1')::uuid
            and li.product_catalog_variant_id = current_setting('tacha_test.v4')::uuid
            and li.checked_at is null
            and li.quantity_requested = 1) = 1,
    'v4 de B entra como pendiente nueva junto a la compra de A (035)';

  assert not exists (
    select 1 from public.list_items li
    where li.list_id = current_setting('tacha_test.list_b')::uuid
      and li.checked_at is null
  ), 'a B no le queda nada pendiente en su lista personal';
  assert (select count(*) from public.list_items li
          where li.list_id = current_setting('tacha_test.list_b')::uuid
            and li.product_catalog_variant_id = current_setting('tacha_test.v2')::uuid
            and li.checked_at is not null) = 1,
    'lo tachado se queda en la lista personal de B';

  -- Un requisito solo se escribe con una receta propia, aunque el ítem sea de la familia.
  begin
    insert into public.list_item_recipe_requirements (
      list_item_id, recipe_id, quantity_needed, quantity_missing, quantity_unit
    )
    select li.id, current_setting('tacha_test.recipe_a')::uuid, 1, 1, 'unidad'
    from public.list_items li
    where li.list_id = current_setting('tacha_test.household_list_1')::uuid
      and li.product_catalog_variant_id = current_setting('tacha_test.v3')::uuid;
    assert false, 'B colgó un requisito con la receta de A';
  exception
    when insufficient_privilege then null;
  end;

  assert public.get_personal_lists_decision_state() = 'decided', 'B ya decidió';
  assert public.decide_personal_lists('share') = 'already_decided', 'compartir dos veces no hace nada';
  assert (select li.quantity_requested from public.list_items li
          where li.list_id = current_setting('tacha_test.household_list_1')::uuid
            and li.product_catalog_variant_id = current_setting('tacha_test.v1')::uuid) = 7,
    'el segundo intento no volvió a sumar';
end $$;

-- ----------------------------------------------------------------------------
-- 7b. D decide "compartir" su único pendiente (v4), que A ya compró. Desde 035
--     (SCRUM-156) se suma a la pendiente de v4 que dejó B y la compra de A
--     sigue intacta (antes no pasaba nada y devolvía 'nothing_shared').
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_d'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert public.decide_personal_lists('share') = 'shared',
    'D comparte su v4 aunque A ya lo haya comprado (035)';

  assert (select li.quantity_requested from public.list_items li
          where li.list_id = current_setting('tacha_test.household_list_1')::uuid
            and li.product_catalog_variant_id = current_setting('tacha_test.v4')::uuid
            and li.checked_at is null) = 3,
    'v4: la pendiente que dejó B (1) + 2 de D';
  assert not exists (
    select 1 from public.list_items li
    where li.list_id = current_setting('tacha_test.list_d')::uuid
      and li.checked_at is null
  ), 'a D no le queda nada pendiente en su lista personal';
  assert (select count(*) from public.list_items li
          where li.list_id = current_setting('tacha_test.household_list_1')::uuid
            and li.product_catalog_variant_id = current_setting('tacha_test.v4')::uuid
            and li.purchase_session_id = current_setting('tacha_test.session_a')::uuid
            and li.quantity_bought = 1
            and li.quantity_requested = 1) = 1,
    'la compra de v4 de A sigue intacta';
  assert public.get_personal_lists_decision_state() = 'decided', 'la decisión de D quedó guardada';
end $$;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);

-- ----------------------------------------------------------------------------
-- 8. B sale de la familia (D6): deja de ver la lista de la familia y
--    conserva su lista personal. La lista queda en la familia.
-- ----------------------------------------------------------------------------

do $$
begin
  assert public.leave_household() = 'left', 'B sale de la familia 1';

  assert (select count(*) from public.lists l
          where l.id = current_setting('tacha_test.household_list_1')::uuid) = 0,
    'B ya no ve la lista de la familia';
  assert (select count(*) from public.list_items li
          where li.list_id = current_setting('tacha_test.household_list_1')::uuid) = 0,
    'B ya no ve sus productos';
  assert (select count(*) from public.lists l
          where l.id = current_setting('tacha_test.list_b')::uuid) = 1,
    'B conserva su lista personal';
  assert public.get_personal_lists_decision_state() = 'not_member',
    'al salir se borra la decisión junto con la membresía';
  assert (select count(*) from public.list_item_recipe_requirements r
          where r.recipe_id = current_setting('tacha_test.recipe_b')::uuid) = 0,
    'B ya no ve los requisitos que pasó a la lista de la familia';
end $$;

-- Quien salió tampoco puede escribir en la lista de la familia.
do $$
declare
  affected_rows integer;
begin
  update public.list_items li
  set quantity_requested = 1
  where li.list_id = current_setting('tacha_test.household_list_1')::uuid;
  get diagnostics affected_rows = row_count;
  assert affected_rows = 0, 'B (ex-miembro) no puede cambiar productos de la familia';

  delete from public.list_items li
  where li.list_id = current_setting('tacha_test.household_list_1')::uuid;
  get diagnostics affected_rows = row_count;
  assert affected_rows = 0, 'B (ex-miembro) no puede borrar productos de la familia';

  begin
    insert into public.list_items (list_id, product_catalog_variant_id)
    values (current_setting('tacha_test.household_list_1')::uuid, current_setting('tacha_test.v2')::uuid);
    assert false, 'B (ex-miembro) pudo agregar a la lista de la familia';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

do $$
begin
  assert (select count(*) from public.list_items li
          where li.list_id = current_setting('tacha_test.household_list_1')::uuid) = 5,
    'la lista de la familia sigue con sus productos (v1, v2 y v4 comprado de A, v3, y v4 pendiente de B y D desde 035)';
end $$;

-- ----------------------------------------------------------------------------
-- 9. La familia 2 se elimina (sale C, su único miembro): su lista se va con
--    ella; las recetas y los planes que la nombraban quedan personales. Un
--    plan de la familia que choca con un espacio personal se borra (gana el
--    personal) y de dos planes de la familia en el mismo espacio queda uno.
-- ----------------------------------------------------------------------------

do $$
declare
  recipe_c uuid := gen_random_uuid();
  user_c uuid := current_setting('tacha_test.user_c')::uuid;
  household_2 uuid := current_setting('tacha_test.household_2')::uuid;
begin
  insert into public.recipes (id, owner_id, household_id, name, base_servings)
  values (recipe_c, user_c, household_2, 'Receta C SCRUM-59', 2);

  insert into public.meal_plans (owner_id, household_id, date, meal_type, recipe_id, servings_multiplier)
  values
    -- Choca con el personal de abajo: gana el personal (x2).
    (user_c, household_2, date '2026-10-22', 'lunch', recipe_c, 1),
    (user_c, null, date '2026-10-22', 'lunch', recipe_c, 2),
    -- Sin choque: queda personal.
    (user_c, household_2, date '2026-10-23', 'dinner', recipe_c, 1),
    -- Dos de la familia en el mismo espacio: queda uno.
    (user_c, household_2, date '2026-10-24', 'breakfast', recipe_c, 1),
    (user_c, household_2, date '2026-10-24', 'breakfast', recipe_c, 1.5);

  perform set_config('tacha_test.recipe_c', recipe_c::text, true);
end $$;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_c'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  added_item public.list_items;
begin
  -- Sin lista personal no hay nada que pasar: todo se compartió.
  assert public.decide_personal_lists('share') = 'shared', 'C comparte sin pendientes: shared';

  added_item := public.add_item_to_general_list(current_setting('tacha_test.v1')::uuid);
  perform set_config('tacha_test.household_list_2', added_item.list_id::text, true);

  assert public.leave_household() = 'household_deleted', 'C era el único miembro: la familia 2 se elimina';
end $$;

reset role;

do $$
begin
  assert not exists (select 1 from public.lists l
                     where l.id = current_setting('tacha_test.household_list_2')::uuid),
    'la lista de la familia 2 se eliminó con ella';
  -- Se cuentan filas: si el trigger o una cascada las borrara, un subselect
  -- devolvería null y la prueba pasaría por el motivo equivocado.
  assert (select count(*) from public.recipes r
          where r.id = current_setting('tacha_test.recipe_c')::uuid
            and r.household_id is null) = 1,
    'la receta que nombraba la familia 2 sigue existiendo, ahora personal';
  assert not exists (select 1 from public.meal_plans p
                     where p.recipe_id = current_setting('tacha_test.recipe_c')::uuid
                       and p.household_id is not null),
    'ningún plan queda con el household_id de la familia borrada';
  assert (select array_agg(p.servings_multiplier) from public.meal_plans p
          where p.recipe_id = current_setting('tacha_test.recipe_c')::uuid
            and p.date = date '2026-10-22' and p.meal_type = 'lunch') = array[2::numeric],
    'el espacio personal gana: queda solo el plan personal (x2)';
  assert (select count(*) from public.meal_plans p
          where p.recipe_id = current_setting('tacha_test.recipe_c')::uuid
            and p.date = date '2026-10-23' and p.meal_type = 'dinner') = 1,
    'el plan de la familia sin choque sigue existiendo, ahora personal';
  assert (select count(*) from public.meal_plans p
          where p.recipe_id = current_setting('tacha_test.recipe_c')::uuid
            and p.date = date '2026-10-24' and p.meal_type = 'breakfast') = 1,
    'de dos planes de la familia en el mismo espacio queda uno';
  assert not exists (select 1 from public.lists l
                     where l.household_id is not null
                       and not exists (select 1 from public.households h where h.id = l.household_id)),
    'ninguna lista queda con un household_id inválido';
end $$;

select set_config('tacha_test.done', 'ok', true);

rollback;
