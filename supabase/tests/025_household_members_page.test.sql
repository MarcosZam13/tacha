-- ============================================================================
-- Prueba de la migración 025 (SCRUM-60): consultar a los integrantes de la
-- familia.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 025. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios ni familias en la base compartida. Si una
-- regla no se cumple, un `assert` corta con su mensaje; si termina sin error,
-- pasó. Contra la base sin 025 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- Datos:
--   familia 1, en orden de llegada: B "Beto", C "Carla_Ruiz", D "50% Dani",
--             E (sin nombre) y, al final, A "Ana" (admin). El admin llegó
--             último para comprobar que igual aparece primero.
--   familia 2: F "Fer" (admin) y H "Hugo\Paz" (miembro, con una barra
--             invertida en el nombre para probar que \ se busca como texto).
--   G "Gabi": usuario registrado sin familia.
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
  user_f uuid := gen_random_uuid();
  user_g uuid := gen_random_uuid();
  user_h uuid := gen_random_uuid();
  household_1 uuid := gen_random_uuid();
  household_2 uuid := gen_random_uuid();
begin
  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha', '{"name": "Ana"}'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha', '{"name": "  Beto  "}'),
    (user_c, 'authenticated', 'authenticated', user_c || '@prueba.tacha', '{"name": "Carla_Ruiz"}'),
    (user_d, 'authenticated', 'authenticated', user_d || '@prueba.tacha', '{"name": "50% Dani"}'),
    (user_e, 'authenticated', 'authenticated', user_e || '@prueba.tacha', '{"name": "   "}'),
    (user_f, 'authenticated', 'authenticated', user_f || '@prueba.tacha', '{"name": "Fer"}'),
    (user_g, 'authenticated', 'authenticated', user_g || '@prueba.tacha', '{"name": "Gabi"}'),
    -- En JSON, \\ es una sola barra: el nombre queda Hugo\Paz.
    (user_h, 'authenticated', 'authenticated', user_h || '@prueba.tacha', '{"name": "Hugo\\Paz"}');

  insert into public.households (id, name)
  values (household_1, 'Familia 1 SCRUM-60'), (household_2, 'Familia 2 SCRUM-60');

  insert into public.household_members (user_id, household_id, role, created_at)
  values
    (user_b, household_1, 'member', now() - interval '5 minutes'),
    (user_c, household_1, 'member', now() - interval '4 minutes'),
    (user_d, household_1, 'member', now() - interval '3 minutes'),
    (user_e, household_1, 'member', now() - interval '2 minutes'),
    (user_a, household_1, 'admin', now() - interval '1 minute'),
    (user_f, household_2, 'admin', now() - interval '1 minute'),
    (user_h, household_2, 'member', now());

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_b', user_b::text, true);
  perform set_config('tacha_test.user_c', user_c::text, true);
  perform set_config('tacha_test.user_d', user_d::text, true);
  perform set_config('tacha_test.user_e', user_e::text, true);
  perform set_config('tacha_test.user_f', user_f::text, true);
  perform set_config('tacha_test.user_g', user_g::text, true);
  perform set_config('tacha_test.user_h', user_h::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos y firma (rol dueño): public y anon no ejecutan la función,
--    authenticated sí, y el resultado no tiene columna de correo.
-- ----------------------------------------------------------------------------

do $$
begin
  assert not has_function_privilege('public', 'public.get_household_members_page(text, integer, integer)', 'execute'),
    'public no ejecuta get_household_members_page';
  assert not has_function_privilege('anon', 'public.get_household_members_page(text, integer, integer)', 'execute'),
    'anon no ejecuta get_household_members_page';
  assert has_function_privilege('authenticated', 'public.get_household_members_page(text, integer, integer)', 'execute'),
    'authenticated ejecuta get_household_members_page';
  assert pg_get_function_result('public.get_household_members_page(text, integer, integer)'::regprocedure)
         = 'TABLE(user_id uuid, display_name text, role text, is_current_user boolean)',
    'devuelve solo user_id, display_name, role e is_current_user (sin correo)';
end $$;

-- ----------------------------------------------------------------------------
-- 2. Sin sesión y con sesión anónima: 42501 por falta de cuenta.
-- ----------------------------------------------------------------------------

set local role authenticated;

select set_config('request.jwt.claims', '{}', true);

do $$
begin
  begin
    perform public.get_household_members_page();
    assert false, 'sin sesión se pudo ver a los integrantes';
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
    perform public.get_household_members_page();
    assert false, 'una sesión anónima pudo ver a los integrantes';
  exception
    when insufficient_privilege then
      assert sqlerrm like 'Se requiere una cuenta registrada%', 'sesión anónima: el 42501 tiene que ser por anónima';
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 3. B (miembro) ve a toda su familia, en orden estable: el admin primero
--    aunque llegó último, después por antigüedad. Solo su fila es la propia;
--    el nombre va recortado y el de E es null. F (otra familia) no aparece.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  member_ids uuid[];
begin
  select array_agg(page.user_id order by page.position) into member_ids
  from public.get_household_members_page(null, 50, 0) with ordinality as page(user_id, display_name, role, is_current_user, position);

  assert member_ids = array[
    current_setting('tacha_test.user_a')::uuid,
    current_setting('tacha_test.user_b')::uuid,
    current_setting('tacha_test.user_c')::uuid,
    current_setting('tacha_test.user_d')::uuid,
    current_setting('tacha_test.user_e')::uuid
  ], 'B ve a los 5 de su familia: el admin primero y después por antigüedad';

  assert (select page.role from public.get_household_members_page(null, 50, 0) as page
          where page.user_id = current_setting('tacha_test.user_a')::uuid) = 'admin',
    'el admin trae role = admin';
  assert (select array_agg(page.user_id) from public.get_household_members_page(null, 50, 0) as page
          where page.is_current_user) = array[current_setting('tacha_test.user_b')::uuid],
    'solo la fila de B es is_current_user';
  assert (select page.display_name from public.get_household_members_page(null, 50, 0) as page
          where page.user_id = current_setting('tacha_test.user_b')::uuid) = 'Beto',
    'el nombre de B llega recortado';
  assert (select page.display_name from public.get_household_members_page(null, 50, 0) as page
          where page.user_id = current_setting('tacha_test.user_e')::uuid) is null,
    'E (nombre en blanco) llega con display_name null';
  assert not exists (select 1 from public.get_household_members_page(null, 50, 0) as page
                     where page.user_id = current_setting('tacha_test.user_f')::uuid),
    'F (otra familia) no aparece';
  assert (select count(*) from public.get_household_members_page() as page) = 5,
    'con los valores por defecto (20 por página) también vienen los 5';
end $$;

-- ----------------------------------------------------------------------------
-- 4. Páginas de 2: la primera, la segunda y la tercera juntas dan los 5, en
--    el mismo orden, sin repetidos ni saltos. Pedir más allá del final no
--    devuelve filas.
-- ----------------------------------------------------------------------------

do $$
declare
  all_ids uuid[];
  paged_ids uuid[];
begin
  select array_agg(page.user_id order by page.position) into all_ids
  from public.get_household_members_page(null, 50, 0) with ordinality as page(user_id, display_name, role, is_current_user, position);

  select array_agg(page.user_id order by page.page_number, page.position) into paged_ids
  from (
    select 1 as page_number, p.user_id, p.position
    from public.get_household_members_page(null, 2, 0) with ordinality as p(user_id, display_name, role, is_current_user, position)
    union all
    select 2, p.user_id, p.position
    from public.get_household_members_page(null, 2, 2) with ordinality as p(user_id, display_name, role, is_current_user, position)
    union all
    select 3, p.user_id, p.position
    from public.get_household_members_page(null, 2, 4) with ordinality as p(user_id, display_name, role, is_current_user, position)
  ) as page;

  assert paged_ids = all_ids, 'las páginas de 2 juntas dan los 5 en el mismo orden';
  assert (select count(*) from public.get_household_members_page(null, 2, 4) as page) = 1,
    'la última página tiene 1';
  assert (select count(*) from public.get_household_members_page(null, 2, 6) as page) = 0,
    'más allá del final no hay filas';
end $$;

-- ----------------------------------------------------------------------------
-- 5. Búsqueda: sin distinguir mayúsculas, recortada; %, _ como texto; sin
--    resultados; el miembro sin nombre no coincide; vacía = todos.
-- ----------------------------------------------------------------------------

do $$
begin
  assert (select array_agg(page.user_id) from public.get_household_members_page('beto') as page)
         = array[current_setting('tacha_test.user_b')::uuid],
    'beto encuentra a B';
  assert (select array_agg(page.user_id) from public.get_household_members_page('BETO') as page)
         = array[current_setting('tacha_test.user_b')::uuid],
    'sin distinguir mayúsculas';
  assert (select array_agg(page.user_id) from public.get_household_members_page('  eto ') as page)
         = array[current_setting('tacha_test.user_b')::uuid],
    'la búsqueda se recorta y busca en cualquier parte del nombre';
  assert (select array_agg(page.user_id) from public.get_household_members_page('%') as page)
         = array[current_setting('tacha_test.user_d')::uuid],
    '% se busca como texto: solo D lo tiene en el nombre';
  assert (select array_agg(page.user_id) from public.get_household_members_page('_') as page)
         = array[current_setting('tacha_test.user_c')::uuid],
    '_ se busca como texto: solo C lo tiene en el nombre';
  assert (select count(*) from public.get_household_members_page('zzz') as page) = 0,
    'sin resultados, ninguna fila';
  assert not exists (select 1 from public.get_household_members_page('a') as page
                     where page.user_id = current_setting('tacha_test.user_e')::uuid),
    'E (sin nombre) no coincide con una búsqueda';
  assert (select count(*) from public.get_household_members_page('   ') as page) = 5,
    'una búsqueda en blanco no filtra';
  assert (select count(*) from public.get_household_members_page('fer') as page) = 0,
    'no encuentra a alguien de otra familia';
end $$;

-- ----------------------------------------------------------------------------
-- 6. Límites: página fuera de 1 a 50, desplazamiento negativo o nulo y
--    búsqueda de más de 60 caracteres (contando los espacios de los extremos)
--    se rechazan con 22023. 60 caracteres sí.
-- ----------------------------------------------------------------------------

do $$
begin
  begin
    perform public.get_household_members_page(null, 0, 0);
    assert false, 'se aceptó una página de 0';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.get_household_members_page(null, 51, 0);
    assert false, 'se aceptó una página de 51';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.get_household_members_page(null, null, 0);
    assert false, 'se aceptó un tamaño de página nulo';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.get_household_members_page(null, 20, -1);
    assert false, 'se aceptó un desplazamiento negativo';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.get_household_members_page(null, 20, null);
    assert false, 'se aceptó un desplazamiento nulo';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.get_household_members_page(repeat('a', 61));
    assert false, 'se aceptó una búsqueda de 61 caracteres';
  exception
    when invalid_parameter_value then null;
  end;

  -- Recortada sería "a" (1 carácter): el largo se mide antes de recortar.
  begin
    perform public.get_household_members_page(repeat(' ', 60) || 'a');
    assert false, 'se aceptó una búsqueda de 61 caracteres con espacios';
  exception
    when invalid_parameter_value then null;
  end;

  assert (select count(*) from public.get_household_members_page(repeat('a', 60)) as page) = 0,
    'una búsqueda de 60 caracteres se acepta';
  assert (select count(*) from public.get_household_members_page(null, 50, 0) as page) = 5,
    'una página de 50 se acepta';
end $$;

-- ----------------------------------------------------------------------------
-- 7. A (admin) ve lo mismo, con su propia fila marcada.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a')::text, 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert (select count(*) from public.get_household_members_page() as page) = 5, 'A ve a los 5 de su familia';
  assert (select array_agg(page.user_id) from public.get_household_members_page() as page
          where page.is_current_user) = array[current_setting('tacha_test.user_a')::uuid],
    'solo la fila de A es is_current_user';
end $$;

-- ----------------------------------------------------------------------------
-- 8. F (otra familia) solo ve a su familia (F y H), y busca \ como texto;
--    G (sin familia) no ve a nadie.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_f'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert (select array_agg(page.user_id order by page.position)
          from public.get_household_members_page() with ordinality as page(user_id, display_name, role, is_current_user, position))
         = array[current_setting('tacha_test.user_f')::uuid, current_setting('tacha_test.user_h')::uuid],
    'F solo ve a su familia (F y H), sin nadie de la familia 1';
  assert (select page.display_name from public.get_household_members_page() as page
          where page.user_id = current_setting('tacha_test.user_h')::uuid) = 'Hugo\Paz',
    'el nombre de H tiene una sola barra invertida';
  -- Sin escapar la barra, el patrón sería %\% (un % literal) y no encontraría a H.
  assert (select array_agg(page.user_id) from public.get_household_members_page('\') as page)
         = array[current_setting('tacha_test.user_h')::uuid],
    '\ se busca como texto: solo H lo tiene en el nombre';
end $$;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_g'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert (select count(*) from public.get_household_members_page() as page) = 0,
    'G (sin familia) no ve a nadie, sin error';
end $$;

-- ----------------------------------------------------------------------------
-- 9. El cliente sigue sin poder leer las filas de otros miembros directo de
--    la tabla: la función es la única puerta.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert (select count(*) from public.household_members) = 1,
    'B solo ve su propia fila en household_members';
end $$;

reset role;

select set_config('tacha_test.done', 'ok', true);

rollback;
