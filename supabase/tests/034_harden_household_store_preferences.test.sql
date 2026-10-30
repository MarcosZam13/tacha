-- ============================================================================
-- Prueba de la migración 034 (SCRUM-127): household_store_preferences solo
-- para miembros del household.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 034. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios, households ni preferencias en la base
-- compartida. Si una regla no se cumple, un `assert` corta con su mensaje; si
-- termina sin error, pasó. Contra la base sin 034 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- Datos:
--   household 1: A (admin), B (miembro).
--   household 2: C (admin).
--   D: usuario registrado sin household.
--
-- Casos:
--   1. Permisos de tabla: anon solo SELECT; authenticated sin TRUNCATE.
--   2. FK: un household_id inexistente se rechaza (23503).
--   3. Miembros: A guarda (upsert) y B, de la misma familia, lee y cambia.
--   4. No miembros: C y D no leen las filas del household 1, no las cambian
--      ni las borran, y no pueden insertar en un household ajeno (42501).
--   5. anon: no lee filas, no escribe, no hace TRUNCATE; list_catalog_by_category
--      con household_id sigue respondiendo (no da "permission denied").
--      Se usa esa y no search_catalog porque search_catalog con household_id
--      tiene un bug previo, ajeno a 034: "column reference household_id is
--      ambiguous" (42702), el mismo que 030 arregló en list_catalog_by_category.
--   6. Borrar el household borra sus preferencias (on delete cascade).
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
  user_c uuid := gen_random_uuid();
  user_d uuid := gen_random_uuid();
  household_1 uuid := gen_random_uuid();
  household_2 uuid := gen_random_uuid();
  store_1 uuid := (select s.id from public.stores s order by s.slug limit 1);
  store_2 uuid := (select s.id from public.stores s order by s.slug offset 1 limit 1);
begin
  if store_2 is null then
    raise exception 'Hacen falta al menos dos tiendas en public.stores para esta prueba';
  end if;

  insert into auth.users (id, aud, role, email)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha'),
    (user_c, 'authenticated', 'authenticated', user_c || '@prueba.tacha'),
    (user_d, 'authenticated', 'authenticated', user_d || '@prueba.tacha');

  insert into public.households (id, name)
  values
    (household_1, 'Familia 1 SCRUM-127'),
    (household_2, 'Familia 2 SCRUM-127');

  insert into public.household_members (user_id, household_id, role)
  values
    (user_a, household_1, 'admin'),
    (user_b, household_1, 'member'),
    (user_c, household_2, 'admin');

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_b', user_b::text, true);
  perform set_config('tacha_test.user_c', user_c::text, true);
  perform set_config('tacha_test.user_d', user_d::text, true);
  perform set_config('tacha_test.household_1', household_1::text, true);
  perform set_config('tacha_test.household_2', household_2::text, true);
  perform set_config('tacha_test.store_1', store_1::text, true);
  perform set_config('tacha_test.store_2', store_2::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos de tabla.
-- ----------------------------------------------------------------------------

do $$
begin
  assert has_table_privilege('anon', 'public.household_store_preferences', 'select'),
    'anon tiene que conservar SELECT (search_catalog es security invoker)';
  assert not has_table_privilege('anon', 'public.household_store_preferences', 'insert'),
    'anon no puede tener INSERT';
  assert not has_table_privilege('anon', 'public.household_store_preferences', 'update'),
    'anon no puede tener UPDATE';
  assert not has_table_privilege('anon', 'public.household_store_preferences', 'delete'),
    'anon no puede tener DELETE';
  assert not has_table_privilege('anon', 'public.household_store_preferences', 'truncate'),
    'anon no puede tener TRUNCATE';
  assert not has_table_privilege('authenticated', 'public.household_store_preferences', 'truncate'),
    'authenticated no puede tener TRUNCATE (RLS no lo controla)';
  assert not exists (
    select 1 from pg_policy
    where polrelid = 'public.household_store_preferences'::regclass
      and polname = 'temp read household_store_preferences'
  ), 'la lectura pública temporal tiene que haberse borrado';
end $$;

-- ----------------------------------------------------------------------------
-- 2. FK: household inexistente (rol dueño, sin RLS de por medio).
-- ----------------------------------------------------------------------------

do $$
begin
  begin
    insert into public.household_store_preferences (household_id, store_id, visible)
    values (gen_random_uuid(), current_setting('tacha_test.store_1')::uuid, false);
    assert false, 'se guardó una preferencia de un household que no existe';
  exception
    when foreign_key_violation then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 3. Miembros del household 1.
-- ----------------------------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

-- Upsert, como lo hace el cliente (insert ... on conflict do update).
insert into public.household_store_preferences (household_id, store_id, visible)
values (current_setting('tacha_test.household_1')::uuid, current_setting('tacha_test.store_1')::uuid, false)
on conflict (household_id, store_id) do update set visible = excluded.visible;

insert into public.household_store_preferences (household_id, store_id, visible)
values (current_setting('tacha_test.household_1')::uuid, current_setting('tacha_test.store_1')::uuid, true)
on conflict (household_id, store_id) do update set visible = excluded.visible;

do $$
begin
  assert (
    select visible from public.household_store_preferences
    where household_id = current_setting('tacha_test.household_1')::uuid
      and store_id = current_setting('tacha_test.store_1')::uuid
  ) = true, 'A: el segundo upsert tenía que actualizar la fila a visible = true';
end $$;

-- A no puede escribir en el household 2.
do $$
begin
  begin
    insert into public.household_store_preferences (household_id, store_id, visible)
    values (current_setting('tacha_test.household_2')::uuid, current_setting('tacha_test.store_1')::uuid, false);
    assert false, 'A guardó una preferencia en un household ajeno';
  exception
    when insufficient_privilege then null;
  end;
end $$;

-- B, de la misma familia, lee y cambia lo que guardó A.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  changed_rows int;
begin
  assert (
    select count(*) from public.household_store_preferences
    where household_id = current_setting('tacha_test.household_1')::uuid
  ) = 1, 'B tiene que leer la preferencia de su household';

  update public.household_store_preferences set visible = false
  where household_id = current_setting('tacha_test.household_1')::uuid;
  get diagnostics changed_rows = row_count;
  assert changed_rows = 1, 'B tiene que poder cambiar la preferencia de su household';
end $$;

-- B no puede mover la fila a otro household (with check).
do $$
begin
  begin
    update public.household_store_preferences
    set household_id = current_setting('tacha_test.household_2')::uuid
    where household_id = current_setting('tacha_test.household_1')::uuid;
    assert false, 'B movió una preferencia a un household ajeno';
  exception
    when insufficient_privilege then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 4. No miembros: C (otra familia) y D (sin familia).
-- ----------------------------------------------------------------------------

do $$
declare
  outsider text;
  changed_rows int;
begin
  foreach outsider in array array[current_setting('tacha_test.user_c'), current_setting('tacha_test.user_d')]
  loop
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', outsider, 'role', 'authenticated')::text,
      true
    );

    assert (
      select count(*) from public.household_store_preferences
      where household_id = current_setting('tacha_test.household_1')::uuid
    ) = 0, 'un no miembro leyó las preferencias del household 1';

    update public.household_store_preferences set visible = true
    where household_id = current_setting('tacha_test.household_1')::uuid;
    get diagnostics changed_rows = row_count;
    assert changed_rows = 0, 'un no miembro cambió las preferencias del household 1';

    delete from public.household_store_preferences
    where household_id = current_setting('tacha_test.household_1')::uuid;
    get diagnostics changed_rows = row_count;
    assert changed_rows = 0, 'un no miembro borró las preferencias del household 1';

    begin
      insert into public.household_store_preferences (household_id, store_id, visible)
      values (current_setting('tacha_test.household_1')::uuid, current_setting('tacha_test.store_2')::uuid, false);
      assert false, 'un no miembro guardó una preferencia en el household 1';
    exception
      when insufficient_privilege then null;
    end;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 5. anon (visitante sin sesión).
-- ----------------------------------------------------------------------------

reset role;
set local role anon;
select set_config('request.jwt.claims', '{}', true);

do $$
begin
  assert (select count(*) from public.household_store_preferences) = 0,
    'anon leyó preferencias';

  begin
    insert into public.household_store_preferences (household_id, store_id, visible)
    values (current_setting('tacha_test.household_1')::uuid, current_setting('tacha_test.store_2')::uuid, false);
    assert false, 'anon guardó una preferencia';
  exception
    when insufficient_privilege then null;
  end;

  begin
    truncate public.household_store_preferences;
    assert false, 'anon hizo TRUNCATE';
  exception
    when insufficient_privilege then null;
  end;

  -- El catálogo con household_id sigue respondiendo para un visitante (la
  -- función es security invoker y hace left join a la tabla).
  perform * from public.list_catalog_by_category(null, current_setting('tacha_test.household_1')::uuid);
end $$;

-- ----------------------------------------------------------------------------
-- 6. Borrar el household borra sus preferencias (rol dueño).
-- ----------------------------------------------------------------------------

reset role;

do $$
begin
  delete from public.households where id = current_setting('tacha_test.household_1')::uuid;
  assert not exists (
    select 1 from public.household_store_preferences
    where household_id = current_setting('tacha_test.household_1')::uuid
  ), 'las preferencias del household borrado tenían que irse con él';
end $$;

select set_config('tacha_test.done', 'ok', true);

rollback;
