-- ============================================================================
-- Prueba de la migración 056 (SCRUM-110 / HU-73): crear un grupo de productos.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 052 a 056. Todo pasa dentro de una transacción que termina en
-- rollback (mismo patrón que 052_edit_delete_personal_products.test.sql):
-- nada de esto queda en la base compartida.
--
-- Datos:
--   E: usuario sin familia. Tiene un producto personal y uno archivado.
--   A: otro usuario, sin relación con E. Tiene un producto personal.
--   Familia 1: F (admin) y M (miembro). F tiene un producto compartido con la
--              familia y uno personal sin compartir.
--   "Leche": producto global real (020/SCRUM-131).
--
-- Casos:
--   1. Permisos: anon no ejecuta las funciones nuevas; authenticated sí.
--   2. Búsqueda: global sí, mío sí, de mi familia sí, personal ajeno no,
--      archivado no, menos de 2 letras vacío, is_personal correcto.
--   3. create_product_group sin sesión: 42501.
--   4. Validaciones (22023): nombre vacío o de 61; 0 o 51 productos;
--      cantidad 0, 100 o con decimales; producto repetido; elemento sin forma.
--   5. P0002: presentación de un producto ajeno, archivado o inexistente.
--   6. E crea un grupo personal: dueño, sin familia, nombre recortado,
--      posiciones en orden; aunque pida compartir, sin familia queda personal.
--   7. Familia: M sin compartir → personal (F no lo ve); compartiendo → F lo
--      ve; un producto compartido de la familia entra en un grupo compartido.
--   8. Regla 7: F comparte un grupo con su producto personal sin compartir →
--      22023 con el nombre; sin compartir, se guarda.
--   9. 052 ampliada: un producto en un grupo cuenta en group_count y al
--      eliminarlo se archiva; uno sin uso se borra.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño).
-- ----------------------------------------------------------------------------
do $$
declare
  user_a uuid := gen_random_uuid();
  user_e uuid := gen_random_uuid();
  user_f uuid := gen_random_uuid();
  user_m uuid := gen_random_uuid();
  household_1 uuid := gen_random_uuid();
  lacteos_id uuid;
  global_leche_variant_id uuid;
begin
  select id into lacteos_id from categories where name = 'Lácteos';
  assert lacteos_id is not null, 'No se encontró la categoría "Lácteos" (¿se aplicó la migración 020?)';

  select pcv.id into global_leche_variant_id
  from product_catalog pc
  join product_catalog_variants pcv on pcv.product_catalog_id = pc.id
  where pc.name = 'Leche' and pc.household_id is null and pc.owner_id is null
  order by pcv.id
  limit 1;
  assert global_leche_variant_id is not null, 'No se encontró una presentación del producto global "Leche"';

  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha', '{"name": "Ana"}'),
    (user_e, 'authenticated', 'authenticated', user_e || '@prueba.tacha', '{"name": "Eva"}'),
    (user_f, 'authenticated', 'authenticated', user_f || '@prueba.tacha', '{"name": "Fer"}'),
    (user_m, 'authenticated', 'authenticated', user_m || '@prueba.tacha', '{"name": "Mario"}');

  insert into public.households (id, name) values (household_1, 'Familia 1 SCRUM-110');
  insert into public.household_members (user_id, household_id, role)
  values (user_f, household_1, 'admin'), (user_m, household_1, 'member');

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_e', user_e::text, true);
  perform set_config('tacha_test.user_f', user_f::text, true);
  perform set_config('tacha_test.user_m', user_m::text, true);
  perform set_config('tacha_test.household_1', household_1::text, true);
  perform set_config('tacha_test.lacteos_id', lacteos_id::text, true);
  perform set_config('tacha_test.leche_variant_id', global_leche_variant_id::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos de ejecución.
-- ----------------------------------------------------------------------------
do $$
begin
  assert not has_function_privilege('anon', 'public.search_catalog_including_own(text, uuid)', 'execute'),
    'anon no debe ejecutar search_catalog_including_own';
  assert has_function_privilege('authenticated', 'public.search_catalog_including_own(text, uuid)', 'execute'),
    'authenticated debe ejecutar search_catalog_including_own';
  assert not has_function_privilege('anon', 'public.create_product_group(text, boolean, jsonb)', 'execute'),
    'anon no debe ejecutar create_product_group';
  assert has_function_privilege('authenticated', 'public.create_product_group(text, boolean, jsonb)', 'execute'),
    'authenticated debe ejecutar create_product_group';
  assert not has_function_privilege('anon', 'public.get_personal_product_usage(uuid)', 'execute'),
    'anon no debe ejecutar get_personal_product_usage';
  assert has_function_privilege('authenticated', 'public.delete_personal_product(uuid)', 'execute'),
    'authenticated debe seguir ejecutando delete_personal_product';
end $$;

set local role authenticated;

-- ----------------------------------------------------------------------------
-- Productos de prueba (función de 031/051).
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text, true);

do $$
begin
  perform set_config('tacha_test.e_product_id', public.create_personal_product(
    'Queso Scrumciento E', current_setting('tacha_test.lacteos_id')::uuid, 'g', 500, null, false
  )::text, true);
  perform set_config('tacha_test.e_archived_id', public.create_personal_product(
    'Natilla Scrumciento archivada', current_setting('tacha_test.lacteos_id')::uuid, 'ml', 250, null, false
  )::text, true);
  perform set_config('tacha_test.e_unused_id', public.create_personal_product(
    'Crema Scrumciento sin uso', current_setting('tacha_test.lacteos_id')::uuid, 'ml', 200, null, false
  )::text, true);
end $$;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text, true);

do $$
begin
  perform set_config('tacha_test.a_product_id', public.create_personal_product(
    'Tortillas Scrumciento A', current_setting('tacha_test.lacteos_id')::uuid, 'unidad', 10, null, false
  )::text, true);
end $$;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_f'), 'role', 'authenticated')::text, true);

do $$
begin
  perform set_config('tacha_test.f_shared_id', public.create_personal_product(
    'Salsa Scrumciento familia', current_setting('tacha_test.lacteos_id')::uuid, 'ml', 500, null, true
  )::text, true);
  perform set_config('tacha_test.f_personal_id', public.create_personal_product(
    'Chile Scrumciento de Fer', current_setting('tacha_test.lacteos_id')::uuid, 'unidad', 2, null, false
  )::text, true);
end $$;

-- Ids de las presentaciones y el archivado (rol dueño: datos directos).
reset role;

do $$
declare
  product_setting text;
begin
  foreach product_setting in array array['e_product_id', 'e_archived_id', 'e_unused_id', 'a_product_id', 'f_shared_id', 'f_personal_id'] loop
    perform set_config(
      'tacha_test.' || replace(product_setting, '_id', '_variant_id'),
      (select pcv.id from public.product_catalog_variants pcv
       where pcv.product_catalog_id = current_setting('tacha_test.' || product_setting)::uuid)::text,
      true
    );
  end loop;

  update public.product_catalog set archived_at = now()
  where id = current_setting('tacha_test.e_archived_id')::uuid;
end $$;

set local role authenticated;

-- ----------------------------------------------------------------------------
-- 2. Búsqueda.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_m'), 'role', 'authenticated')::text, true);

do $$
declare
  found_ids uuid[];
  personal_flag boolean;
begin
  -- M (familia 1) ve el compartido de F, pero no el personal de F ni nada de E o A.
  select array_agg(r.product_catalog_id) into found_ids
  from public.search_catalog_including_own('scrumciento') r;
  assert current_setting('tacha_test.f_shared_id')::uuid = any(found_ids), 'M debe ver el producto compartido de su familia';
  assert not current_setting('tacha_test.f_personal_id')::uuid = any(coalesce(found_ids, '{}')), 'M no debe ver el producto personal de F';
  assert not current_setting('tacha_test.e_product_id')::uuid = any(coalesce(found_ids, '{}')), 'M no debe ver productos de E';

  select r.is_personal into personal_flag
  from public.search_catalog_including_own('scrumciento') r
  where r.product_catalog_id = current_setting('tacha_test.f_shared_id')::uuid;
  assert personal_flag = false, 'un producto compartido con la familia no es personal';

  assert exists (
    select 1 from public.search_catalog_including_own('leche') r
    join public.product_catalog_variants pcv on pcv.product_catalog_id = r.product_catalog_id
    where pcv.id = current_setting('tacha_test.leche_variant_id')::uuid
      and r.is_personal = false
  ), 'el catálogo global debe aparecer, sin marca de personal';

  assert not exists (select 1 from public.search_catalog_including_own('s')),
    'con menos de 2 letras no debe devolver nada';
end $$;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text, true);

do $$
declare
  found_ids uuid[];
  personal_flag boolean;
begin
  select array_agg(r.product_catalog_id) into found_ids
  from public.search_catalog_including_own('scrumciento') r;
  assert current_setting('tacha_test.e_product_id')::uuid = any(found_ids), 'E debe ver su producto personal';
  assert not current_setting('tacha_test.e_archived_id')::uuid = any(found_ids), 'un producto archivado no debe aparecer';
  assert not current_setting('tacha_test.a_product_id')::uuid = any(found_ids), 'E no debe ver el producto personal de A';
  assert not current_setting('tacha_test.f_shared_id')::uuid = any(found_ids), 'E no debe ver productos de una familia ajena';

  select r.is_personal into personal_flag
  from public.search_catalog_including_own('scrumciento') r
  where r.product_catalog_id = current_setting('tacha_test.e_product_id')::uuid;
  assert personal_flag = true, 'el producto personal de E debe venir marcado como personal';
end $$;

-- ----------------------------------------------------------------------------
-- 3. Sin sesión.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{}', true);

do $$
begin
  perform public.create_product_group(
    'Sin sesión', false,
    jsonb_build_array(jsonb_build_object('variant_id', current_setting('tacha_test.leche_variant_id'), 'quantity', 1))
  );
  assert false, 'sin sesión se pudo crear un grupo';
exception
  when insufficient_privilege then null;
end $$;

-- ----------------------------------------------------------------------------
-- 4. Validaciones (sesión de E).
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text, true);

do $$
declare
  leche_item jsonb := jsonb_build_object('variant_id', current_setting('tacha_test.leche_variant_id'), 'quantity', 1);
  invalid_case record;
begin
  for invalid_case in
    select * from (values
      ('nombre vacío', '   ', jsonb_build_array(leche_item), 'El nombre del grupo es obligatorio'),
      ('nombre de 61', repeat('a', 61), jsonb_build_array(leche_item), 'El nombre del grupo es demasiado largo'),
      ('sin productos', 'Mercado', '[]'::jsonb, 'Agrega al menos un producto'),
      ('no es una lista', 'Mercado', '{}'::jsonb, 'Agrega al menos un producto'),
      ('cantidad 0', 'Mercado', jsonb_build_array(leche_item || '{"quantity": 0}'), 'La cantidad de cada producto tiene que ser un entero de 1 a 99'),
      ('cantidad 100', 'Mercado', jsonb_build_array(leche_item || '{"quantity": 100}'), 'La cantidad de cada producto tiene que ser un entero de 1 a 99'),
      ('cantidad 1.5', 'Mercado', jsonb_build_array(leche_item || '{"quantity": 1.5}'), 'La cantidad de cada producto tiene que ser un entero de 1 a 99'),
      ('cantidad como texto', 'Mercado', jsonb_build_array(leche_item || '{"quantity": "2"}'), 'Cada producto necesita una presentación y una cantidad'),
      ('variant_id que no es uuid', 'Mercado', jsonb_build_array(leche_item || '{"variant_id": "x"}'), 'Cada producto necesita una presentación y una cantidad'),
      ('repetido', 'Mercado', jsonb_build_array(leche_item, leche_item), 'Un producto aparece dos veces en el grupo')
    ) as cases(label, group_name, item_list, expected_message)
  loop
    begin
      perform public.create_product_group(invalid_case.group_name, false, invalid_case.item_list);
      assert false, invalid_case.label || ': se pudo guardar';
    exception
      when invalid_parameter_value then
        assert sqlerrm = invalid_case.expected_message, invalid_case.label || ': ' || sqlerrm;
    end;
  end loop;

  -- 51 productos (el tope es 50). El límite se revisa antes que la visibilidad.
  begin
    perform public.create_product_group(
      'Mercado', false,
      (select jsonb_agg(jsonb_build_object('variant_id', gen_random_uuid(), 'quantity', 1)) from generate_series(1, 51))
    );
    assert false, '51 productos: se pudo guardar';
  exception
    when invalid_parameter_value then
      assert sqlerrm = 'Un grupo puede tener hasta 50 productos', '51 productos: ' || sqlerrm;
  end;

  assert not exists (select 1 from public.product_groups where owner_id = current_setting('tacha_test.user_e')::uuid),
    'ninguna validación debe dejar un grupo creado';
end $$;

-- ----------------------------------------------------------------------------
-- 5. Presentaciones que E no puede usar: P0002.
-- ----------------------------------------------------------------------------
do $$
declare
  blocked_case record;
begin
  for blocked_case in
    select * from (values
      ('producto de A', current_setting('tacha_test.a_product_variant_id')),
      ('producto archivado', current_setting('tacha_test.e_archived_variant_id')),
      ('producto de una familia ajena', current_setting('tacha_test.f_shared_variant_id')),
      ('presentación inexistente', gen_random_uuid()::text)
    ) as cases(label, variant_id)
  loop
    begin
      perform public.create_product_group(
        'Mercado', false,
        jsonb_build_array(jsonb_build_object('variant_id', blocked_case.variant_id, 'quantity', 1))
      );
      assert false, blocked_case.label || ': se pudo guardar';
    exception
      when no_data_found then
        assert sqlerrm = 'Alguno de los productos ya no está disponible', blocked_case.label || ': ' || sqlerrm;
    end;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 6. E crea un grupo personal.
-- ----------------------------------------------------------------------------
do $$
declare
  group_row public.product_groups;
  item_positions integer[];
  item_quantities integer[];
begin
  perform set_config('tacha_test.e_group_id', public.create_product_group(
    '  Desayuno  ',
    -- Pide compartir, pero no tiene familia: queda personal.
    true,
    jsonb_build_array(
      jsonb_build_object('variant_id', current_setting('tacha_test.e_product_variant_id'), 'quantity', 2),
      jsonb_build_object('variant_id', current_setting('tacha_test.leche_variant_id'), 'quantity', 3)
    )
  )::text, true);

  select * into group_row from public.product_groups where id = current_setting('tacha_test.e_group_id')::uuid;
  assert group_row.name = 'Desayuno', 'el nombre se guarda recortado';
  assert group_row.owner_id = current_setting('tacha_test.user_e')::uuid, 'el dueño es quien lo crea';
  assert group_row.household_id is null, 'sin familia, el grupo queda personal aunque pida compartir';

  select array_agg(pgi.position order by pgi.position), array_agg(pgi.quantity order by pgi.position)
  into item_positions, item_quantities
  from public.product_group_items pgi
  where pgi.group_id = group_row.id;
  assert item_positions = array[0, 1], 'las posiciones siguen el orden del array';
  assert item_quantities = array[2, 3], 'las cantidades se guardan en ese orden';
end $$;

-- ----------------------------------------------------------------------------
-- 7. Familia: personal por defecto, compartido si se pide.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_m'), 'role', 'authenticated')::text, true);

do $$
begin
  perform set_config('tacha_test.m_personal_group_id', public.create_product_group(
    'Antojos de Mario', false,
    jsonb_build_array(jsonb_build_object('variant_id', current_setting('tacha_test.leche_variant_id'), 'quantity', 1))
  )::text, true);

  -- Compartido, con un producto compartido de la familia (de F).
  perform set_config('tacha_test.m_shared_group_id', public.create_product_group(
    'Compra de la semana', true,
    jsonb_build_array(
      jsonb_build_object('variant_id', current_setting('tacha_test.leche_variant_id'), 'quantity', 2),
      jsonb_build_object('variant_id', current_setting('tacha_test.f_shared_variant_id'), 'quantity', 1)
    )
  )::text, true);

  assert (select household_id from public.product_groups where id = current_setting('tacha_test.m_personal_group_id')::uuid) is null,
    'sin marcar compartir, el grupo es personal';
  assert (select household_id from public.product_groups where id = current_setting('tacha_test.m_shared_group_id')::uuid)
    = current_setting('tacha_test.household_1')::uuid, 'marcando compartir, el grupo queda con la familia';
end $$;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_f'), 'role', 'authenticated')::text, true);

do $$
begin
  assert exists (select 1 from public.product_groups where id = current_setting('tacha_test.m_shared_group_id')::uuid),
    'F debe ver el grupo compartido de M';
  assert not exists (select 1 from public.product_groups where id = current_setting('tacha_test.m_personal_group_id')::uuid),
    'F no debe ver el grupo personal de M';
end $$;

-- ----------------------------------------------------------------------------
-- 8. Regla 7: un grupo compartido no admite productos personales sin compartir.
-- ----------------------------------------------------------------------------
do $$
declare
  personal_items jsonb := jsonb_build_array(
    jsonb_build_object('variant_id', current_setting('tacha_test.leche_variant_id'), 'quantity', 1),
    jsonb_build_object('variant_id', current_setting('tacha_test.f_personal_variant_id'), 'quantity', 1)
  );
begin
  begin
    perform public.create_product_group('Para todos', true, personal_items);
    assert false, 'se pudo compartir un grupo con un producto personal';
  exception
    when invalid_parameter_value then
      assert sqlerrm = 'Para compartir el grupo, quita estos productos personales: Chile Scrumciento de Fer',
        'regla 7: ' || sqlerrm;
  end;

  assert public.create_product_group('Solo para mí', false, personal_items) is not null,
    'sin compartir, el mismo grupo se guarda';
end $$;

-- ----------------------------------------------------------------------------
-- 9. 052 ampliada: grupos en el uso y en eliminar.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text, true);

do $$
declare
  usage_row record;
begin
  select * into usage_row from public.get_personal_product_usage(current_setting('tacha_test.e_product_id')::uuid);
  assert usage_row.group_count = 1, 'el producto de E está en 1 grupo, salió ' || usage_row.group_count;
  assert usage_row.active_list_count = 0 and usage_row.recipe_count = 0, 'sin listas ni recetas';

  assert public.delete_personal_product(current_setting('tacha_test.e_product_id')::uuid) = 'archived',
    'un producto que está en un grupo debe archivarse';
  assert exists (
    select 1 from public.product_group_items
    where product_catalog_variant_id = current_setting('tacha_test.e_product_variant_id')::uuid
  ), 'el grupo conserva el producto archivado';

  assert public.delete_personal_product(current_setting('tacha_test.e_unused_id')::uuid) = 'deleted',
    'un producto sin uso se sigue borrando';
end $$;

select 'SQL test 056 passed' as result;

rollback;
