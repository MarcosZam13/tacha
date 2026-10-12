-- ============================================================================
-- Prueba de la migración 023 (SCRUM-58): salir del household.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 023. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios, households, listas ni sesiones en la
-- base compartida. Si una regla no se cumple, un `assert` corta con su
-- mensaje; si termina sin error, pasó. Contra la base sin 023 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- El editor muestra el resultado de la última sentencia que devuelve filas, no
-- de la última sentencia: al terminar bien se ve la fila del último
-- `select set_config(...)`, no "No rows returned". Un error sale en rojo.
--
-- Datos:
--   household 1: A (admin, "Ana"), B (miembro, "  Beto  "), C (miembro, nombre
--                en blanco). Tiene link. B tiene una lista, una receta y un plan.
--   household 2: D (admin, sin nombre en los metadatos).
--   household 3: E (admin y único miembro, "Eva"). Tiene link y una compra, y
--                E tiene una lista, una receta y un plan con ese household_id.
--   F: usuario registrado sin household.
--
-- La concurrencia real (dos sesiones a la vez) no se puede reproducir en una
-- sola transacción: esta prueba comprueba los estados finales (un solo admin
-- por household, nada a medias). El diseño de bloqueos está en
-- features/household/specs/plan.md, "Concurrencia".
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
  user_e uuid := gen_random_uuid();
  user_f uuid := gen_random_uuid();
  household_1 uuid := gen_random_uuid();
  household_2 uuid := gen_random_uuid();
  household_3 uuid := gen_random_uuid();
  recipe_b uuid := gen_random_uuid();
  recipe_e uuid := gen_random_uuid();
  store_id uuid := (select s.id from public.stores s order by s.slug limit 1);
begin
  -- Mismo origen de tienda que 016 y 018: las tres las crea schema.sql.
  if store_id is null then
    raise exception 'No hay tiendas en public.stores: aplicar schema.sql antes de esta prueba';
  end if;

  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha', '{"name": "Ana"}'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha', '{"name": "  Beto  "}'),
    (user_c, 'authenticated', 'authenticated', user_c || '@prueba.tacha', '{"name": "   "}'),
    (user_d, 'authenticated', 'authenticated', user_d || '@prueba.tacha', null),
    (user_e, 'authenticated', 'authenticated', user_e || '@prueba.tacha', '{"name": "Eva"}'),
    (user_f, 'authenticated', 'authenticated', user_f || '@prueba.tacha', '{"name": "Fer"}');

  insert into public.households (id, name)
  values
    (household_1, 'Familia 1 SCRUM-58'),
    (household_2, 'Familia 2 SCRUM-58'),
    (household_3, 'Familia 3 SCRUM-58');

  -- created_at distintos para comprobar el orden de get_household_members.
  insert into public.household_members (user_id, household_id, role, created_at)
  values
    (user_a, household_1, 'admin', now() - interval '3 minutes'),
    (user_b, household_1, 'member', now() - interval '2 minutes'),
    (user_c, household_1, 'member', now() - interval '1 minute'),
    (user_d, household_2, 'admin', now()),
    (user_e, household_3, 'admin', now());

  insert into public.household_invite_links (household_id, token, expires_at)
  values
    (household_1, gen_random_uuid(), now() + interval '7 days'),
    (household_3, gen_random_uuid(), now() + interval '7 days');

  -- Datos personales de B: no tienen que cambiar cuando B sale.
  insert into public.lists (owner_id, household_id, type) values (user_b, null, 'general');
  insert into public.recipes (id, owner_id, household_id, name, base_servings)
  values (recipe_b, user_b, null, 'Receta B SCRUM-58', 4);
  insert into public.meal_plans (owner_id, household_id, date, meal_type, recipe_id)
  values (user_b, null, date '2026-10-20', 'lunch', recipe_b);

  -- Datos de E apuntando al household 3. lists, recipes y meal_plans no tienen
  -- FK a households: borrar el household no puede ni debe tocarlos.
  insert into public.lists (owner_id, household_id, type) values (user_e, household_3, 'general');
  insert into public.recipes (id, owner_id, household_id, name, base_servings)
  values (recipe_e, user_e, household_3, 'Receta E SCRUM-58', 2);
  insert into public.meal_plans (owner_id, household_id, date, meal_type, recipe_id)
  values (user_e, household_3, date '2026-10-21', 'dinner', recipe_e);

  -- Una compra del household 3: al eliminarlo queda personal (on delete set null).
  insert into public.purchase_sessions (owner_id, household_id, store_id)
  values (user_e, household_3, store_id);

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_b', user_b::text, true);
  perform set_config('tacha_test.user_c', user_c::text, true);
  perform set_config('tacha_test.user_d', user_d::text, true);
  perform set_config('tacha_test.user_e', user_e::text, true);
  perform set_config('tacha_test.user_f', user_f::text, true);
  perform set_config('tacha_test.household_1', household_1::text, true);
  perform set_config('tacha_test.household_2', household_2::text, true);
  perform set_config('tacha_test.household_3', household_3::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Sin sesión, sesión anónima y rol anon: las dos funciones rechazan (42501).
-- ----------------------------------------------------------------------------

set local role authenticated;

select set_config('request.jwt.claims', '{}', true);

do $$
begin
  begin
    perform public.get_household_members();
    assert false, 'sin sesión se pudieron ver los miembros';
  exception
    -- 42501, y por la falta de cuenta (no por "solo el admin"): así la prueba
    -- falla si se quita la validación de sesión.
    when insufficient_privilege then
      assert sqlerrm like 'Se requiere una cuenta registrada%', 'sin sesión: el 42501 tiene que ser por falta de cuenta';
  end;

  begin
    perform public.leave_household();
    assert false, 'sin sesión se pudo salir';
  exception
    when insufficient_privilege then
      assert sqlerrm like 'Se requiere una cuenta registrada%', 'sin sesión: el 42501 tiene que ser por falta de cuenta';
  end;
end $$;

-- Una sesión anónima de Supabase es un usuario authenticated con is_anonymous.
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('tacha_test.user_a'), 'role', 'authenticated', 'is_anonymous', true
  )::text,
  true
);

do $$
begin
  begin
    perform public.get_household_members();
    assert false, 'una sesión anónima pudo ver los miembros';
  exception
    when insufficient_privilege then
      assert sqlerrm like 'Se requiere una cuenta registrada%', 'sesión anónima: el 42501 tiene que ser por anónima';
  end;

  begin
    perform public.leave_household();
    assert false, 'una sesión anónima pudo salir';
  exception
    when insufficient_privilege then
      assert sqlerrm like 'Se requiere una cuenta registrada%', 'sesión anónima: el 42501 tiene que ser por anónima';
  end;
end $$;

-- Permisos de ejecución (rol dueño): anon no puede ejecutarlas y authenticated sí.
reset role;

do $$
begin
  assert not has_function_privilege('anon', 'public.get_household_members()', 'execute'),
    'anon no tiene execute sobre get_household_members';
  assert not has_function_privilege('anon', 'public.leave_household(uuid)', 'execute'),
    'anon no tiene execute sobre leave_household';
  assert has_function_privilege('authenticated', 'public.get_household_members()', 'execute'),
    'authenticated tiene execute sobre get_household_members';
  assert has_function_privilege('authenticated', 'public.leave_household(uuid)', 'execute'),
    'authenticated tiene execute sobre leave_household';
end $$;

-- Como anon, con los claims de un usuario registrado: si anon tuviera execute,
-- la función no rechazaría por anónimo, así que el único 42501 posible es el
-- de falta de permiso.
set local role anon;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'anon')::text,
  true
);

do $$
begin
  begin
    perform public.get_household_members();
    assert false, 'anon tiene permiso de ejecución sobre get_household_members';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.leave_household();
    assert false, 'anon tiene permiso de ejecución sobre leave_household';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 2. Un miembro (B) no puede ver la lista de miembros: es solo para el admin.
-- ----------------------------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  perform public.get_household_members();
  assert false, 'un miembro que no es admin pudo ver los miembros';
exception
  when insufficient_privilege then null;
end $$;

-- ----------------------------------------------------------------------------
-- 3. El admin (A) ve solo su household, en orden, con nombres limpios y sin
--    correos.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  member_ids uuid[];
begin
  -- with ordinality conserva el orden en que la función devuelve las filas.
  select array_agg(gm.user_id order by gm.position) into member_ids
  from public.get_household_members() with ordinality
    as gm(user_id, display_name, role, is_current_user, position);

  assert member_ids = array[
    current_setting('tacha_test.user_a')::uuid,
    current_setting('tacha_test.user_b')::uuid,
    current_setting('tacha_test.user_c')::uuid
  ], 'solo los tres miembros del household 1, ordenados por created_at';

  assert (select gm.display_name from public.get_household_members() gm
          where gm.user_id = current_setting('tacha_test.user_a')::uuid) = 'Ana',
    'el nombre sale de los metadatos';
  assert (select gm.display_name from public.get_household_members() gm
          where gm.user_id = current_setting('tacha_test.user_b')::uuid) = 'Beto',
    'el nombre se devuelve sin espacios en los bordes';
  assert (select gm.display_name from public.get_household_members() gm
          where gm.user_id = current_setting('tacha_test.user_c')::uuid) is null,
    'un nombre en blanco se devuelve como null ("Miembro sin nombre")';

  assert (select count(*) from public.get_household_members() gm where gm.is_current_user) = 1,
    'solo una fila es la de quien llama';
  assert (select gm.is_current_user from public.get_household_members() gm
          where gm.user_id = current_setting('tacha_test.user_a')::uuid),
    'la fila de quien llama está marcada';
  assert (select gm.role from public.get_household_members() gm
          where gm.user_id = current_setting('tacha_test.user_a')::uuid) = 'admin',
    'devuelve el rol de cada miembro';
end $$;

-- Un admin sin nombre en los metadatos (D, raw_user_meta_data null) también
-- recibe null, y solo ve su propio household.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_d'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert (select count(*) from public.get_household_members()) = 1, 'D solo se ve a sí mismo';
  assert (select gm.display_name from public.get_household_members() gm) is null,
    'sin metadatos el nombre es null ("Miembro sin nombre")';
end $$;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

-- La forma del resultado no tiene correo: solo estas cuatro columnas.
do $$
begin
  assert pg_get_function_result('public.get_household_members()'::regprocedure)
    = 'TABLE(user_id uuid, display_name text, role text, is_current_user boolean)',
    'get_household_members devuelve solo user_id, display_name, role e is_current_user';
end $$;

-- ----------------------------------------------------------------------------
-- 4 y 5. El admin (A) con otros miembros: sin elegir, o con un elegido que no
--        vale, no cambia nada.
-- ----------------------------------------------------------------------------

do $$
begin
  assert public.leave_household() = 'transfer_required',
    'el admin con otros miembros tiene que elegir';

  assert public.leave_household(current_setting('tacha_test.user_a')::uuid) = 'invalid_new_admin',
    'no puede pasarse el rol a sí mismo';
  assert public.leave_household(current_setting('tacha_test.user_d')::uuid) = 'invalid_new_admin',
    'no puede pasarle el rol a alguien de otro household';
  assert public.leave_household(gen_random_uuid()) = 'invalid_new_admin',
    'no puede pasarle el rol a un usuario que no existe';
end $$;

reset role;

do $$
begin
  assert (select count(*) from public.household_members m
          where m.household_id = current_setting('tacha_test.household_1')::uuid) = 3,
    'después de los intentos fallidos el household 1 sigue con sus tres miembros';
  assert (select m.role from public.household_members m
          where m.user_id = current_setting('tacha_test.user_a')::uuid) = 'admin',
    'A sigue siendo el admin';
  assert (select m.role from public.household_members m
          where m.user_id = current_setting('tacha_test.user_d')::uuid) = 'admin'
     and (select m.household_id from public.household_members m
          where m.user_id = current_setting('tacha_test.user_d')::uuid)
         = current_setting('tacha_test.household_2')::uuid,
    'D sigue como admin de su household';
end $$;

-- ----------------------------------------------------------------------------
-- 6. Un miembro (B) sale. Manda un new_admin_user_id, que se ignora. Sus
--    datos personales no cambian.
-- ----------------------------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert public.leave_household(current_setting('tacha_test.user_c')::uuid) = 'left',
    'un miembro sale (y new_admin_user_id se ignora)';
  assert public.leave_household() = 'not_member',
    'una segunda llamada responde not_member';
end $$;

reset role;

do $$
begin
  assert not exists (select 1 from public.household_members m
                     where m.user_id = current_setting('tacha_test.user_b')::uuid),
    'la membresía de B ya no existe';
  assert (select m.role from public.household_members m
          where m.user_id = current_setting('tacha_test.user_c')::uuid) = 'member',
    'el new_admin_user_id que mandó un miembro no le dio el rol a nadie';

  assert (select count(*) from public.lists l
          where l.owner_id = current_setting('tacha_test.user_b')::uuid
            and l.type = 'general' and l.household_id is null) = 1,
    'B conserva su lista general, personal';
  assert (select count(*) from public.recipes r
          where r.owner_id = current_setting('tacha_test.user_b')::uuid
            and r.household_id is null) = 1,
    'B conserva su receta';
  assert (select count(*) from public.meal_plans p
          where p.owner_id = current_setting('tacha_test.user_b')::uuid
            and p.household_id is null) = 1,
    'B conserva su plan';
end $$;

-- ----------------------------------------------------------------------------
-- 7. El admin (A) le pasa el rol a C y sale, en la misma operación.
-- ----------------------------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert public.leave_household(current_setting('tacha_test.user_c')::uuid) = 'left',
    'el admin le pasa el rol a un miembro válido y sale';
  assert public.leave_household(current_setting('tacha_test.user_c')::uuid) = 'not_member',
    'una segunda llamada del admin anterior responde not_member';
end $$;

reset role;

do $$
begin
  assert not exists (select 1 from public.household_members m
                     where m.user_id = current_setting('tacha_test.user_a')::uuid),
    'el admin anterior ya no tiene membresía';
  assert (select m.role from public.household_members m
          where m.user_id = current_setting('tacha_test.user_c')::uuid) = 'admin',
    'C quedó como admin';
  assert (select count(*) from public.household_members m
          where m.household_id = current_setting('tacha_test.household_1')::uuid
            and m.role = 'admin') = 1,
    'el household 1 tiene exactamente un admin';
  assert exists (select 1 from public.households h
                 where h.id = current_setting('tacha_test.household_1')::uuid),
    'el household 1 sigue existiendo';
  assert exists (select 1 from public.household_invite_links i
                 where i.household_id = current_setting('tacha_test.household_1')::uuid),
    'el link del household 1 sigue existiendo';
end $$;

-- ----------------------------------------------------------------------------
-- 8. El admin único (E) sale: el household se elimina. Manda un
--    new_admin_user_id, que se ignora.
-- ----------------------------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  -- Manda a D (admin de otro household): se ignora y D no cambia.
  assert public.leave_household(current_setting('tacha_test.user_d')::uuid) = 'household_deleted',
    'el admin único elimina el household al salir (new_admin_user_id se ignora)';
  assert public.leave_household() = 'not_member',
    'una segunda llamada responde not_member';
end $$;

reset role;

do $$
begin
  assert not exists (select 1 from public.households h
                     where h.id = current_setting('tacha_test.household_3')::uuid),
    'el household 3 ya no existe';
  assert not exists (select 1 from public.household_members m
                     where m.household_id = current_setting('tacha_test.household_3')::uuid),
    'no quedan membresías del household 3';
  assert not exists (select 1 from public.household_invite_links i
                     where i.household_id = current_setting('tacha_test.household_3')::uuid),
    'el link del household 3 se eliminó con él';
  assert (select count(*) from public.purchase_sessions s
          where s.owner_id = current_setting('tacha_test.user_e')::uuid
            and s.household_id is null) = 1,
    'la compra del household 3 sigue existiendo, ahora personal';
  assert (select m.role from public.household_members m
          where m.user_id = current_setting('tacha_test.user_d')::uuid) = 'admin'
     and (select m.household_id from public.household_members m
          where m.user_id = current_setting('tacha_test.user_d')::uuid)
         = current_setting('tacha_test.household_2')::uuid,
    'el new_admin_user_id que mandó el admin único no movió a D';

  assert (select count(*) from public.lists l
          where l.owner_id = current_setting('tacha_test.user_e')::uuid
            and l.household_id = current_setting('tacha_test.household_3')::uuid) = 1,
    'borrar el household no toca la lista de E';
  assert (select count(*) from public.recipes r
          where r.owner_id = current_setting('tacha_test.user_e')::uuid
            and r.household_id = current_setting('tacha_test.household_3')::uuid) = 1,
    'borrar el household no toca la receta de E';
  assert (select count(*) from public.meal_plans p
          where p.owner_id = current_setting('tacha_test.user_e')::uuid
            and p.household_id = current_setting('tacha_test.household_3')::uuid) = 1,
    'borrar el household no toca el plan de E';
end $$;

-- ----------------------------------------------------------------------------
-- 9. Un usuario registrado que nunca tuvo household (F): not_member.
-- 10. El cliente sigue sin poder modificar ni borrar membresías directamente.
-- ----------------------------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_f'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert public.leave_household() = 'not_member', 'sin household responde not_member';
end $$;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_c')::text, 'role', 'authenticated')::text,
  true
);

do $$
begin
  begin
    update public.household_members set role = 'member'
    where user_id = current_setting('tacha_test.user_c')::uuid;
    assert false, 'el cliente pudo cambiar un rol directamente';
  exception
    when insufficient_privilege then null; -- 42501: sin permiso de update
  end;

  begin
    delete from public.household_members
    where user_id = current_setting('tacha_test.user_c')::uuid;
    assert false, 'el cliente pudo borrar una membresía directamente';
  exception
    when insufficient_privilege then null; -- 42501: sin permiso de delete
  end;
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 11. Estado final: cada household que queda tiene exactamente un admin.
-- ----------------------------------------------------------------------------

do $$
begin
  assert not exists (
    select 1
    from public.households h
    where h.id in (
      current_setting('tacha_test.household_1')::uuid,
      current_setting('tacha_test.household_2')::uuid
    )
      and (select count(*) from public.household_members m
           where m.household_id = h.id and m.role = 'admin') <> 1
  ), 'los households 1 y 2 tienen exactamente un admin cada uno';

  assert (select count(*) from public.household_members m
          where m.household_id = current_setting('tacha_test.household_1')::uuid) = 1,
    'en el household 1 queda solo C';
end $$;

select set_config('tacha_test.done', 'ok', true);

rollback;
