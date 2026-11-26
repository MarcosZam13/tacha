-- ============================================================================
-- Prueba de la migración 057 (SCRUM-111 / HU-74): agregar un grupo a la lista.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 054 y 057. Todo pasa dentro de una transacción que termina en
-- rollback (mismo patrón que 056_create_product_group.test.sql): nada de esto
-- queda en la base compartida. Los grupos se siembran como dueño de las
-- tablas: la prueba no depende de create_product_group (056).
--
-- Datos:
--   E: usuario sin familia. Tiene un producto personal archivado.
--   A: otro usuario. Tiene un producto personal que E no puede ver.
--   Familia 1: F (admin) y M (miembro).
--   "Leche" (dos presentaciones) y "Chocolate": productos globales reales.
--
-- Casos (SPEC §13):
--   1. Permisos: anon no ejecuta la función; authenticated sí.
--   2. Sin sesión: 42501.
--   3. Un grupo ajeno o inexistente: P0002.
--   4. Lista vacía: una fila por producto con la cantidad del grupo; otra
--      presentación del mismo producto va en fila aparte (casos 19 y 22).
--   5. Agregar el mismo grupo otra vez suma las cantidades, sin filas nuevas
--      (caso 21).
--   5b. Con filas que ya estaban en la lista: la misma presentación suma en
--      su fila (caso 20) y otra presentación va en fila aparte (caso 22).
--   6. Una fila tachada no se reabre: se crea una pendiente nueva (caso 23).
--   7. Un producto archivado y uno que el usuario no puede ver se saltan y se
--      nombran; el resto se agrega y suma (caso 24).
--   8. Un miembro agrega un grupo compartido: va a la lista de la familia y
--      no a su lista personal (caso 25).
--   9. No escribe list_item_recipe_requirements (no es una receta), y la
--      lista no guarda ninguna referencia al grupo (regla 6).
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
  leche_small_id uuid;
  leche_large_id uuid;
  chocolate_id uuid;
begin
  select id into lacteos_id from categories where name = 'Lácteos';
  assert lacteos_id is not null, 'No se encontró la categoría "Lácteos"';

  -- Dos presentaciones distintas de "Leche" y una de "Chocolate".
  select pcv.id into leche_small_id
  from product_catalog pc
  join product_catalog_variants pcv on pcv.product_catalog_id = pc.id
  where pc.name = 'Leche' and pc.owner_id is null and pc.household_id is null
  order by pcv.base_quantity, pcv.id
  limit 1;
  select pcv.id into leche_large_id
  from product_catalog pc
  join product_catalog_variants pcv on pcv.product_catalog_id = pc.id
  where pc.name = 'Leche' and pc.owner_id is null and pc.household_id is null
  order by pcv.base_quantity desc, pcv.id
  limit 1;
  select pcv.id into chocolate_id
  from product_catalog pc
  join product_catalog_variants pcv on pcv.product_catalog_id = pc.id
  where pc.name = 'Chocolate' and pc.owner_id is null and pc.household_id is null
  order by pcv.id
  limit 1;
  assert leche_small_id is not null and leche_large_id is not null and leche_small_id <> leche_large_id,
    'Se necesitan dos presentaciones distintas del producto global "Leche"';
  assert chocolate_id is not null, 'No se encontró el producto global "Chocolate"';

  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha', '{"name": "Ana"}'),
    (user_e, 'authenticated', 'authenticated', user_e || '@prueba.tacha', '{"name": "Eva"}'),
    (user_f, 'authenticated', 'authenticated', user_f || '@prueba.tacha', '{"name": "Fer"}'),
    (user_m, 'authenticated', 'authenticated', user_m || '@prueba.tacha', '{"name": "Mario"}');

  insert into public.households (id, name) values (household_1, 'Familia 1 SCRUM-111');
  insert into public.household_members (user_id, household_id, role)
  values (user_f, household_1, 'admin'), (user_m, household_1, 'member');

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_e', user_e::text, true);
  perform set_config('tacha_test.user_f', user_f::text, true);
  perform set_config('tacha_test.user_m', user_m::text, true);
  perform set_config('tacha_test.household_1', household_1::text, true);
  perform set_config('tacha_test.lacteos_id', lacteos_id::text, true);
  perform set_config('tacha_test.leche_small_id', leche_small_id::text, true);
  perform set_config('tacha_test.leche_large_id', leche_large_id::text, true);
  perform set_config('tacha_test.chocolate_id', chocolate_id::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos de ejecución.
-- ----------------------------------------------------------------------------
do $$
begin
  assert not has_function_privilege('anon', 'public.add_group_to_general_list(uuid)', 'execute'),
    'anon no debe ejecutar add_group_to_general_list';
  assert has_function_privilege('authenticated', 'public.add_group_to_general_list(uuid)', 'execute'),
    'authenticated debe ejecutar add_group_to_general_list';
end $$;

-- Productos personales (función de 031), como cada dueño.
set local role authenticated;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text, true);

do $$
begin
  perform set_config('tacha_test.e_archived_product_id', public.create_personal_product(
    'Natilla Scrumciento archivada', current_setting('tacha_test.lacteos_id')::uuid, 'ml', 250, null, false
  )::text, true);
end $$;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text, true);

do $$
begin
  perform set_config('tacha_test.a_product_id', public.create_personal_product(
    'Tortillas Scrumciento de Ana', current_setting('tacha_test.lacteos_id')::uuid, 'unidad', 10, null, false
  )::text, true);
end $$;

-- Grupos sembrados (rol dueño): el cliente no tiene INSERT sobre estas tablas.
reset role;

do $$
declare
  e_group_id uuid;
  e_mixed_group_id uuid;
  m_shared_group_id uuid;
  a_group_id uuid;
  archived_variant_id uuid;
  a_variant_id uuid;
begin
  update public.product_catalog set archived_at = now()
  where id = current_setting('tacha_test.e_archived_product_id')::uuid;

  select id into archived_variant_id from public.product_catalog_variants
  where product_catalog_id = current_setting('tacha_test.e_archived_product_id')::uuid;
  select id into a_variant_id from public.product_catalog_variants
  where product_catalog_id = current_setting('tacha_test.a_product_id')::uuid;

  insert into public.product_groups (owner_id, household_id, name)
  values (current_setting('tacha_test.user_e')::uuid, null, 'Desayuno SCRUM-111')
  returning id into e_group_id;
  insert into public.product_group_items (group_id, product_catalog_variant_id, quantity, position)
  values
    (e_group_id, current_setting('tacha_test.leche_small_id')::uuid, 2, 0),
    (e_group_id, current_setting('tacha_test.chocolate_id')::uuid, 1, 1),
    (e_group_id, current_setting('tacha_test.leche_large_id')::uuid, 1, 2);

  -- Un producto archivado de E y uno de A que E no puede ver.
  insert into public.product_groups (owner_id, household_id, name)
  values (current_setting('tacha_test.user_e')::uuid, null, 'Mezcla SCRUM-111')
  returning id into e_mixed_group_id;
  insert into public.product_group_items (group_id, product_catalog_variant_id, quantity, position)
  values
    (e_mixed_group_id, archived_variant_id, 1, 0),
    (e_mixed_group_id, a_variant_id, 1, 1),
    (e_mixed_group_id, current_setting('tacha_test.chocolate_id')::uuid, 4, 2);

  insert into public.product_groups (owner_id, household_id, name)
  values (current_setting('tacha_test.user_m')::uuid, current_setting('tacha_test.household_1')::uuid, 'Semana SCRUM-111')
  returning id into m_shared_group_id;
  insert into public.product_group_items (group_id, product_catalog_variant_id, quantity, position)
  values (m_shared_group_id, current_setting('tacha_test.leche_small_id')::uuid, 3, 0);

  -- Para el caso 5b: la presentación chica (que A ya tendrá en su lista) y la grande.
  insert into public.product_groups (owner_id, household_id, name)
  values (current_setting('tacha_test.user_a')::uuid, null, 'Merienda SCRUM-111')
  returning id into a_group_id;
  insert into public.product_group_items (group_id, product_catalog_variant_id, quantity, position)
  values
    (a_group_id, current_setting('tacha_test.leche_small_id')::uuid, 2, 0),
    (a_group_id, current_setting('tacha_test.leche_large_id')::uuid, 1, 1);

  perform set_config('tacha_test.a_group_id', a_group_id::text, true);
  perform set_config('tacha_test.e_group_id', e_group_id::text, true);
  perform set_config('tacha_test.e_mixed_group_id', e_mixed_group_id::text, true);
  perform set_config('tacha_test.m_shared_group_id', m_shared_group_id::text, true);
end $$;

set local role authenticated;

-- ----------------------------------------------------------------------------
-- 2. Sin sesión.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{}', true);

do $$
begin
  perform public.add_group_to_general_list(current_setting('tacha_test.e_group_id')::uuid);
  assert false, 'sin sesión se pudo agregar un grupo';
exception
  when insufficient_privilege then null;
end $$;

-- ----------------------------------------------------------------------------
-- 3. Grupo ajeno o inexistente.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text, true);

do $$
declare
  missing_group_id uuid;
begin
  foreach missing_group_id in array array[current_setting('tacha_test.e_group_id')::uuid, gen_random_uuid()] loop
    begin
      perform public.add_group_to_general_list(missing_group_id);
      assert false, 'se pudo agregar un grupo ajeno o inexistente';
    exception
      when no_data_found then
        assert sqlerrm = 'Grupo no encontrado', 'grupo ajeno: ' || sqlerrm;
    end;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 4 y 5. Lista vacía; después, el mismo grupo otra vez.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text, true);

do $$
declare
  result jsonb;
  general_list_id uuid;
  quantities jsonb;
  pending_rows integer;
begin
  result := public.add_group_to_general_list(current_setting('tacha_test.e_group_id')::uuid);
  assert result -> 'added' = '["Leche", "Chocolate", "Leche"]'::jsonb, 'agregados: ' || (result -> 'added')::text;
  assert result -> 'skipped' = '[]'::jsonb, 'nada se salta: ' || (result -> 'skipped')::text;

  select id into general_list_id
  from public.lists
  where owner_id = current_setting('tacha_test.user_e')::uuid and type = 'general' and household_id is null;
  assert general_list_id is not null, 'debe existir la lista general personal de E';
  perform set_config('tacha_test.e_list_id', general_list_id::text, true);

  select jsonb_object_agg(product_catalog_variant_id::text, quantity_requested) into quantities
  from public.list_items
  where list_id = general_list_id and checked_at is null;
  assert quantities = jsonb_build_object(
    current_setting('tacha_test.leche_small_id'), 2,
    current_setting('tacha_test.chocolate_id'), 1,
    current_setting('tacha_test.leche_large_id'), 1
  ), 'una fila por presentación, con la cantidad del grupo: ' || quantities::text;

  -- Otra vez: suma en las filas pendientes, sin filas nuevas.
  perform public.add_group_to_general_list(current_setting('tacha_test.e_group_id')::uuid);

  select count(*) into pending_rows from public.list_items where list_id = general_list_id and checked_at is null;
  assert pending_rows = 3, 'agregar dos veces no crea filas nuevas, hay ' || pending_rows;
  assert (select quantity_requested from public.list_items
          where list_id = general_list_id and checked_at is null
            and product_catalog_variant_id = current_setting('tacha_test.leche_small_id')::uuid) = 4,
    'la cantidad de la misma presentación se suma (2 + 2)';
end $$;

-- ----------------------------------------------------------------------------
-- 5b. Con filas que ya estaban: A ya tiene la Leche chica ×1 en su lista.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text, true);

do $$
declare
  general_list_id uuid;
  small_quantity integer;
  large_quantity integer;
  pending_rows integer;
begin
  -- La fila previa, por el mismo camino que usa la app (013/035).
  general_list_id := public.ensure_general_list_id();
  perform public.add_units_to_list_item(general_list_id, current_setting('tacha_test.leche_small_id')::uuid, 1);

  perform public.add_group_to_general_list(current_setting('tacha_test.a_group_id')::uuid);

  select quantity_requested into small_quantity from public.list_items
  where list_id = general_list_id and checked_at is null
    and product_catalog_variant_id = current_setting('tacha_test.leche_small_id')::uuid;
  select quantity_requested into large_quantity from public.list_items
  where list_id = general_list_id and checked_at is null
    and product_catalog_variant_id = current_setting('tacha_test.leche_large_id')::uuid;
  select count(*) into pending_rows from public.list_items where list_id = general_list_id and checked_at is null;

  assert small_quantity = 3, 'la fila previa de la misma presentación suma (1 + 2), tiene ' || small_quantity;
  assert large_quantity = 1, 'la otra presentación va en su propia fila, tiene ' || coalesce(large_quantity::text, 'ninguna');
  assert pending_rows = 2, 'dos filas: una por presentación, hay ' || pending_rows;
end $$;

-- De vuelta a E para los casos 6 y 7.
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text, true);

-- ----------------------------------------------------------------------------
-- 6. Una fila tachada no se reabre.
-- ----------------------------------------------------------------------------
reset role;

update public.list_items
set checked_at = now()
where list_id = current_setting('tacha_test.e_list_id')::uuid
  and product_catalog_variant_id = current_setting('tacha_test.leche_small_id')::uuid;

set local role authenticated;

do $$
declare
  checked_quantity integer;
  pending_quantity integer;
begin
  perform public.add_group_to_general_list(current_setting('tacha_test.e_group_id')::uuid);

  select quantity_requested into checked_quantity from public.list_items
  where list_id = current_setting('tacha_test.e_list_id')::uuid and checked_at is not null
    and product_catalog_variant_id = current_setting('tacha_test.leche_small_id')::uuid;
  select quantity_requested into pending_quantity from public.list_items
  where list_id = current_setting('tacha_test.e_list_id')::uuid and checked_at is null
    and product_catalog_variant_id = current_setting('tacha_test.leche_small_id')::uuid;

  assert checked_quantity = 4, 'la fila tachada no cambia, tiene ' || checked_quantity;
  assert pending_quantity = 2, 'se crea una fila pendiente nueva con la cantidad del grupo, tiene ' || pending_quantity;
end $$;

-- ----------------------------------------------------------------------------
-- 7. Archivado y no visible: se saltan y se nombran.
-- ----------------------------------------------------------------------------
do $$
declare
  result jsonb;
begin
  result := public.add_group_to_general_list(current_setting('tacha_test.e_mixed_group_id')::uuid);

  assert result -> 'added' = '["Chocolate"]'::jsonb, 'solo se agrega lo disponible: ' || (result -> 'added')::text;
  assert result -> 'skipped' = '["Natilla Scrumciento archivada", "un producto que ya no está disponible"]'::jsonb,
    'saltados: ' || (result -> 'skipped')::text;
  assert not exists (
    select 1 from public.list_items li
    join public.product_catalog_variants pcv on pcv.id = li.product_catalog_variant_id
    where li.list_id = current_setting('tacha_test.e_list_id')::uuid
      and pcv.product_catalog_id = current_setting('tacha_test.e_archived_product_id')::uuid
  ), 'el producto archivado no llega a la lista';
  -- Lo disponible se suma igual: Chocolate tenía 3 (1 + 1 + 1 de los casos 4-6) y el grupo trae 4.
  assert (select quantity_requested from public.list_items
          where list_id = current_setting('tacha_test.e_list_id')::uuid and checked_at is null
            and product_catalog_variant_id = current_setting('tacha_test.chocolate_id')::uuid) = 7,
    'el Chocolate del grupo mixto se suma aunque se salten los otros (3 + 4)';
end $$;

-- ----------------------------------------------------------------------------
-- 8. Grupo compartido: va a la lista de la familia.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_f'), 'role', 'authenticated')::text, true);

do $$
begin
  perform public.add_group_to_general_list(current_setting('tacha_test.m_shared_group_id')::uuid);

  assert exists (
    select 1 from public.list_items li
    join public.lists l on l.id = li.list_id
    where l.household_id = current_setting('tacha_test.household_1')::uuid
      and l.type = 'general'
      and li.product_catalog_variant_id = current_setting('tacha_test.leche_small_id')::uuid
      and li.quantity_requested = 3
  ), 'F agrega el grupo compartido de M a la lista de la familia';
  assert not exists (
    select 1 from public.list_items li
    join public.lists l on l.id = li.list_id
    where l.owner_id = current_setting('tacha_test.user_f')::uuid and l.household_id is null
  ), 'el grupo compartido no cae en una lista personal de F';
end $$;

-- ----------------------------------------------------------------------------
-- 9. No es una receta: sin requerimientos de receta.
-- ----------------------------------------------------------------------------
reset role;

do $$
begin
  assert not exists (
    select 1 from public.list_item_recipe_requirements r
    join public.list_items li on li.id = r.list_item_id
    join public.lists l on l.id = li.list_id
    where l.owner_id in (
      current_setting('tacha_test.user_a')::uuid,
      current_setting('tacha_test.user_e')::uuid,
      current_setting('tacha_test.user_f')::uuid
    )
  ), 'agregar un grupo no escribe list_item_recipe_requirements';
  -- Regla 6: se copian presentación y cantidad; editar o borrar el grupo no toca la lista.
  assert not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'list_items' and column_name like '%group%'
  ), 'list_items no guarda ninguna referencia al grupo';
end $$;

select 'SQL test 057 passed' as result;

rollback;
