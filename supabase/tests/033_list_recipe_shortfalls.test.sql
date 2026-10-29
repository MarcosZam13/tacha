-- ============================================================================
-- Prueba de la migración 033 (SCRUM-114): get_general_list_shortfalls.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 033. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios, familias ni listas en la base
-- compartida. Si una regla no se cumple, un `assert` corta con su mensaje; si
-- termina sin error, pasó. Contra la base sin 033 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- Datos:
--   familia 1: A (admin) y B (miembro), con la lista general de la familia.
--   familia 2: C (admin, único miembro), sin lista.
--   E: usuario sin familia, con su lista general personal.
--   Recetas: "Receta A" de A, "Receta B" de B, "Receta E" de E.
--   Lista de la familia 1:
--     item1 (v1): Receta A faltan 600 ml, después Receta B faltan 200 g → 2 avisos.
--     item2 (v2): Receta A con faltante 0 ml                          → sin aviso.
--     item3 (v3): Receta B faltan 2 unidad                            → sin aviso (conteo).
--   Lista de E: item4 (v1): Receta E faltan 100 ml                     → 1 aviso.
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
  user_e uuid := gen_random_uuid();
  household_1 uuid := gen_random_uuid();
  household_2 uuid := gen_random_uuid();
  recipe_a uuid := gen_random_uuid();
  recipe_b uuid := gen_random_uuid();
  recipe_e uuid := gen_random_uuid();
  list_family uuid := gen_random_uuid();
  list_e uuid := gen_random_uuid();
  item_1 uuid := gen_random_uuid();
  item_2 uuid := gen_random_uuid();
  item_3 uuid := gen_random_uuid();
  item_4 uuid := gen_random_uuid();
  variant_ids uuid[];
begin
  select array_agg(v.id order by v.id) into variant_ids
  from (select v.id from public.product_catalog_variants v order by v.id limit 3) v;

  if coalesce(array_length(variant_ids, 1), 0) < 3 then
    raise exception 'Hacen falta al menos 3 variantes en product_catalog_variants para esta prueba';
  end if;

  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha', '{"name": "Ana"}'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha', '{"name": "Beto"}'),
    (user_c, 'authenticated', 'authenticated', user_c || '@prueba.tacha', '{"name": "Caro"}'),
    (user_e, 'authenticated', 'authenticated', user_e || '@prueba.tacha', '{"name": "Eva"}');

  insert into public.households (id, name)
  values (household_1, 'Familia 1 SCRUM-114'), (household_2, 'Familia 2 SCRUM-114');

  insert into public.household_members (user_id, household_id, role)
  values
    (user_a, household_1, 'admin'),
    (user_b, household_1, 'member'),
    (user_c, household_2, 'admin');

  insert into public.lists (id, owner_id, household_id, type)
  values (list_family, user_a, household_1, 'general'), (list_e, user_e, null, 'general');

  -- created_at explícito: fija el orden de las filas que devuelve la RPC.
  insert into public.list_items (id, list_id, product_catalog_variant_id, quantity_requested, created_at)
  values
    (item_1, list_family, variant_ids[1], 1, now() - interval '3 minutes'),
    (item_2, list_family, variant_ids[2], 1, now() - interval '2 minutes'),
    (item_3, list_family, variant_ids[3], 1, now() - interval '1 minute'),
    (item_4, list_e, variant_ids[1], 1, now());

  insert into public.recipes (id, owner_id, household_id, name, base_servings)
  values
    (recipe_a, user_a, null, 'Receta A SCRUM-114', 2),
    (recipe_b, user_b, null, 'Receta B SCRUM-114', 2),
    (recipe_e, user_e, null, 'Receta E SCRUM-114', 2);

  insert into public.list_item_recipe_requirements (
    list_item_id, recipe_id, quantity_needed, quantity_missing, quantity_unit, created_at
  )
  values
    (item_1, recipe_a, 1800, 600, 'ml', now() - interval '2 minutes'),
    (item_1, recipe_b, 500, 200, 'g', now() - interval '1 minute'),
    (item_2, recipe_a, 800, 0, 'ml', now()),
    (item_3, recipe_b, 3, 2, 'unidad', now()),
    (item_4, recipe_e, 1100, 100, 'ml', now());

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_b', user_b::text, true);
  perform set_config('tacha_test.user_c', user_c::text, true);
  perform set_config('tacha_test.user_e', user_e::text, true);
  perform set_config('tacha_test.recipe_a', recipe_a::text, true);
  perform set_config('tacha_test.item_1', item_1::text, true);
  perform set_config('tacha_test.item_4', item_4::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos: anon no ejecuta la función; authenticated sí. Es security
--    definer con search_path fijo.
-- ----------------------------------------------------------------------------

do $$
begin
  assert not has_function_privilege('anon', 'public.get_general_list_shortfalls()', 'execute'),
    'anon no ejecuta get_general_list_shortfalls';
  assert has_function_privilege('authenticated', 'public.get_general_list_shortfalls()', 'execute'),
    'authenticated ejecuta get_general_list_shortfalls';
  assert (select p.prosecdef from pg_proc p where p.oid = 'public.get_general_list_shortfalls()'::regprocedure),
    'get_general_list_shortfalls es security definer';
  assert (select p.proconfig from pg_proc p where p.oid = 'public.get_general_list_shortfalls()'::regprocedure)
         = array['search_path=""'],
    'get_general_list_shortfalls fija search_path vacío';
end $$;

set local role authenticated;

-- ----------------------------------------------------------------------------
-- 2. Sin sesión: 42501.
-- ----------------------------------------------------------------------------

select set_config('request.jwt.claims', '{}', true);

do $$
begin
  begin
    perform * from public.get_general_list_shortfalls();
    assert false, 'sin sesión se pudieron leer faltantes';
  exception
    when insufficient_privilege then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 3. A (dueña de la lista de la familia): los dos avisos de item1, en orden,
--    con el nombre de las dos recetas. Ni el faltante 0 ni el de unidad.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  shortfall_rows jsonb;
begin
  select jsonb_agg(to_jsonb(s)) into shortfall_rows from public.get_general_list_shortfalls() s;

  assert shortfall_rows = jsonb_build_array(
    jsonb_build_object(
      'list_item_id', current_setting('tacha_test.item_1'), 'recipe_name', 'Receta A SCRUM-114',
      'quantity_missing', 600, 'quantity_unit', 'ml'
    ),
    jsonb_build_object(
      'list_item_id', current_setting('tacha_test.item_1'), 'recipe_name', 'Receta B SCRUM-114',
      'quantity_missing', 200, 'quantity_unit', 'g'
    )
  ), format('A: avisos inesperados %s', shortfall_rows);
end $$;

-- ----------------------------------------------------------------------------
-- 4. B (miembro): los mismos avisos, con el nombre de la receta de A. Y la RLS
--    de recipes no cambió: B sigue sin ver la receta de A.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert (select count(*) from public.get_general_list_shortfalls()) = 2,
    'B ve los dos avisos de la lista de la familia';
  assert exists (
    select 1 from public.get_general_list_shortfalls() s
    where s.recipe_name = 'Receta A SCRUM-114'
  ), 'B ve el nombre de la receta de A';
  assert not exists (
    select 1 from public.recipes r where r.id = current_setting('tacha_test.recipe_a')::uuid
  ), 'B no lee la receta de A en recipes (la RLS sigue igual)';
end $$;

-- ----------------------------------------------------------------------------
-- 5. C (otra familia, sin lista): nada.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_c'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert (select count(*) from public.get_general_list_shortfalls()) = 0,
    'C no recibe faltantes de otra familia';
end $$;

-- ----------------------------------------------------------------------------
-- 6. E (sin familia): solo el aviso de su lista personal.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert (select count(*) from public.get_general_list_shortfalls()) = 1,
    'E ve solo su aviso';
  assert (
    select s.list_item_id = current_setting('tacha_test.item_4')::uuid
      and s.recipe_name = 'Receta E SCRUM-114'
    from public.get_general_list_shortfalls() s
  ), 'E ve el aviso de su receta en su lista';
end $$;

rollback;
