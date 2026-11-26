-- ============================================================================
-- Prueba de la migración de SCRUM-163 (fix): un grupo no mete productos
-- personales sin compartir en la lista de la familia.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar la migración. Todo pasa dentro de una transacción que termina en
-- rollback (mismo patrón que 057_add_group_to_general_list.test.sql): nada de
-- esto queda en la base compartida.
--
-- Datos:
--   Familia 1: F (admin) y M (miembro). E: usuario sin familia.
--   F tiene un producto personal sin compartir y uno compartido con la familia.
--   E tiene un producto personal sin compartir.
--   "Chocolate": producto global real.
--
-- Casos:
--   1. Permisos: siguen iguales (anon no, authenticated sí).
--   2. F (en familia) agrega su grupo personal: el global y el compartido
--      entran; el personal sin compartir no entra y vuelve en "personal".
--   3. Para M, toda fila de la lista de la familia tiene producto visible.
--   4. E (sin familia) agrega su grupo con su producto personal: entra como
--      antes, "personal" vacío.
-- ============================================================================

begin;

do $$
declare
  user_e uuid := gen_random_uuid();
  user_f uuid := gen_random_uuid();
  user_m uuid := gen_random_uuid();
  household_1 uuid := gen_random_uuid();
  lacteos_id uuid;
  chocolate_id uuid;
begin
  select id into lacteos_id from categories where name = 'Lácteos';
  assert lacteos_id is not null, 'No se encontró la categoría "Lácteos"';

  select pcv.id into chocolate_id
  from product_catalog pc
  join product_catalog_variants pcv on pcv.product_catalog_id = pc.id
  where pc.name = 'Chocolate' and pc.owner_id is null and pc.household_id is null
  order by pcv.id
  limit 1;
  assert chocolate_id is not null, 'No se encontró el producto global "Chocolate"';

  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values
    (user_e, 'authenticated', 'authenticated', user_e || '@prueba.tacha', '{"name": "Eva"}'),
    (user_f, 'authenticated', 'authenticated', user_f || '@prueba.tacha', '{"name": "Fer"}'),
    (user_m, 'authenticated', 'authenticated', user_m || '@prueba.tacha', '{"name": "Mario"}');

  insert into public.households (id, name) values (household_1, 'Familia 1 SCRUM-163');
  insert into public.household_members (user_id, household_id, role)
  values (user_f, household_1, 'admin'), (user_m, household_1, 'member');

  perform set_config('tacha_test.user_e', user_e::text, true);
  perform set_config('tacha_test.user_f', user_f::text, true);
  perform set_config('tacha_test.user_m', user_m::text, true);
  perform set_config('tacha_test.household_1', household_1::text, true);
  perform set_config('tacha_test.lacteos_id', lacteos_id::text, true);
  perform set_config('tacha_test.chocolate_id', chocolate_id::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos de ejecución (create or replace los conserva).
-- ----------------------------------------------------------------------------
do $$
begin
  assert not has_function_privilege('anon', 'public.add_group_to_general_list(uuid)', 'execute'),
    'anon no debe ejecutar add_group_to_general_list';
  assert has_function_privilege('authenticated', 'public.add_group_to_general_list(uuid)', 'execute'),
    'authenticated debe ejecutar add_group_to_general_list';
end $$;

-- Productos personales (función de 031/032), como cada dueño.
set local role authenticated;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_f'), 'role', 'authenticated')::text, true);

do $$
begin
  perform set_config('tacha_test.f_private_product_id', public.create_personal_product(
    'Tortillas Scrumciento de Fer', current_setting('tacha_test.lacteos_id')::uuid, 'unidad', 10, null, false
  )::text, true);
  perform set_config('tacha_test.f_shared_product_id', public.create_personal_product(
    'Queso Scrumciento de la familia', current_setting('tacha_test.lacteos_id')::uuid, 'g', 500, null, true
  )::text, true);
end $$;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text, true);

do $$
begin
  perform set_config('tacha_test.e_private_product_id', public.create_personal_product(
    'Natilla Scrumciento de Eva', current_setting('tacha_test.lacteos_id')::uuid, 'ml', 250, null, false
  )::text, true);
end $$;

-- Grupos sembrados (rol dueño): el cliente no tiene INSERT sobre estas tablas.
reset role;

do $$
declare
  f_group_id uuid;
  e_group_id uuid;
  f_private_variant_id uuid;
  f_shared_variant_id uuid;
  e_private_variant_id uuid;
begin
  -- 032: compartir deja owner_id null y household_id de la familia.
  assert (select owner_id is null and household_id = current_setting('tacha_test.household_1')::uuid
          from public.product_catalog where id = current_setting('tacha_test.f_shared_product_id')::uuid),
    'el producto compartido queda de la familia y sin dueño';

  select id into f_private_variant_id from public.product_catalog_variants
  where product_catalog_id = current_setting('tacha_test.f_private_product_id')::uuid;
  select id into f_shared_variant_id from public.product_catalog_variants
  where product_catalog_id = current_setting('tacha_test.f_shared_product_id')::uuid;
  select id into e_private_variant_id from public.product_catalog_variants
  where product_catalog_id = current_setting('tacha_test.e_private_product_id')::uuid;

  insert into public.product_groups (owner_id, household_id, name)
  values (current_setting('tacha_test.user_f')::uuid, null, 'Desayuno SCRUM-163')
  returning id into f_group_id;
  insert into public.product_group_items (group_id, product_catalog_variant_id, quantity, position)
  values
    (f_group_id, current_setting('tacha_test.chocolate_id')::uuid, 2, 0),
    (f_group_id, f_private_variant_id, 1, 1),
    (f_group_id, f_shared_variant_id, 3, 2);

  insert into public.product_groups (owner_id, household_id, name)
  values (current_setting('tacha_test.user_e')::uuid, null, 'Merienda SCRUM-163')
  returning id into e_group_id;
  insert into public.product_group_items (group_id, product_catalog_variant_id, quantity, position)
  values (e_group_id, e_private_variant_id, 2, 0);

  perform set_config('tacha_test.f_group_id', f_group_id::text, true);
  perform set_config('tacha_test.e_group_id', e_group_id::text, true);
  perform set_config('tacha_test.f_private_variant_id', f_private_variant_id::text, true);
  perform set_config('tacha_test.e_private_variant_id', e_private_variant_id::text, true);
end $$;

set local role authenticated;

-- ----------------------------------------------------------------------------
-- 2. F, en una familia, agrega su grupo personal.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_f'), 'role', 'authenticated')::text, true);

do $$
declare
  result jsonb;
  household_list_id uuid;
begin
  result := public.add_group_to_general_list(current_setting('tacha_test.f_group_id')::uuid);

  assert result -> 'added' = '["Chocolate", "Queso Scrumciento de la familia"]'::jsonb,
    'entran el global y el compartido: ' || (result -> 'added')::text;
  assert result -> 'personal' = '["Tortillas Scrumciento de Fer"]'::jsonb,
    'el personal sin compartir vuelve aparte: ' || (result -> 'personal')::text;
  assert result -> 'skipped' = '[]'::jsonb, 'nada archivado ni oculto: ' || (result -> 'skipped')::text;

  select id into household_list_id
  from public.lists
  where household_id = current_setting('tacha_test.household_1')::uuid and type = 'general';
  assert household_list_id is not null, 'el grupo fue a la lista de la familia';
  perform set_config('tacha_test.household_list_id', household_list_id::text, true);

  assert not exists (
    select 1 from public.list_items
    where list_id = household_list_id
      and product_catalog_variant_id = current_setting('tacha_test.f_private_variant_id')::uuid
  ), 'el producto personal sin compartir no está en la lista de la familia';
end $$;

-- ----------------------------------------------------------------------------
-- 3. Para M, todo lo de la lista de la familia tiene producto visible.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_m'), 'role', 'authenticated')::text, true);

do $$
declare
  row_count integer;
  hidden_count integer;
begin
  select count(*), count(*) filter (where pc.id is null) into row_count, hidden_count
  from public.list_items li
  left join public.product_catalog_variants pcv on pcv.id = li.product_catalog_variant_id
  left join public.product_catalog pc on pc.id = pcv.product_catalog_id
  where li.list_id = current_setting('tacha_test.household_list_id')::uuid;

  assert row_count = 2, 'M ve las dos filas del grupo, ve ' || row_count;
  assert hidden_count = 0, 'ninguna fila llega sin producto para M, hay ' || hidden_count;
end $$;

-- ----------------------------------------------------------------------------
-- 4. E, sin familia: su producto personal entra a su lista como antes.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text, true);

do $$
declare
  result jsonb;
begin
  result := public.add_group_to_general_list(current_setting('tacha_test.e_group_id')::uuid);

  assert result -> 'added' = '["Natilla Scrumciento de Eva"]'::jsonb, 'sin familia entra: ' || (result -> 'added')::text;
  assert result -> 'personal' = '[]'::jsonb, 'sin familia no hay personales apartados: ' || (result -> 'personal')::text;
  assert exists (
    select 1 from public.list_items li
    join public.lists l on l.id = li.list_id
    where l.owner_id = current_setting('tacha_test.user_e')::uuid and l.household_id is null
      and li.product_catalog_variant_id = current_setting('tacha_test.e_private_variant_id')::uuid
      and li.quantity_requested = 2
  ), 'el producto personal de E está en su lista personal con la cantidad del grupo';
end $$;

select 'SQL test SCRUM-163 passed' as result;

rollback;
