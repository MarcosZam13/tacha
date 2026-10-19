-- ============================================================================
-- Prueba de la migración 026 (SCRUM-61): eliminar a un familiar del household.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 026. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios, households, listas ni compras en la base
-- compartida. Si una regla no se cumple, un `assert` corta con su mensaje; si
-- termina sin error, pasó. Contra la base sin 026 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- El editor muestra el resultado de la última sentencia que devuelve filas: al
-- terminar bien se ve la fila del último `select set_config(...)`. Un error
-- sale en rojo.
--
-- Datos:
--   household 1: A (admin), B (miembro), C (miembro). Tiene enlace y una lista
--                general de la familia con un producto que agregó B. B además
--                tiene una lista personal, una receta, un plan y una compra.
--   household 2: D (admin), E (miembro).
--   F: usuario registrado sin household.
--
-- La concurrencia real (dos sesiones a la vez) no se puede reproducir en una
-- sola transacción: esta prueba comprueba los estados finales. El diseño de
-- bloqueos está en features/household/specs/plan.md (SCRUM-61, "Concurrencia").
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
  family_list uuid := gen_random_uuid();
  recipe_b uuid := gen_random_uuid();
  store_id uuid := (select s.id from public.stores s order by s.slug limit 1);
  variant_id uuid := (select v.id from public.product_catalog_variants v order by v.id limit 1);
begin
  if store_id is null then
    raise exception 'No hay tiendas en public.stores: aplicar schema.sql antes de esta prueba';
  end if;
  if variant_id is null then
    raise exception 'Hace falta al menos una variante en product_catalog_variants para esta prueba';
  end if;

  insert into auth.users (id, aud, role, email)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha'),
    (user_c, 'authenticated', 'authenticated', user_c || '@prueba.tacha'),
    (user_d, 'authenticated', 'authenticated', user_d || '@prueba.tacha'),
    (user_e, 'authenticated', 'authenticated', user_e || '@prueba.tacha'),
    (user_f, 'authenticated', 'authenticated', user_f || '@prueba.tacha');

  insert into public.households (id, name)
  values
    (household_1, 'Familia 1 SCRUM-61'),
    (household_2, 'Familia 2 SCRUM-61');

  insert into public.household_members (user_id, household_id, role)
  values
    (user_a, household_1, 'admin'),
    (user_b, household_1, 'member'),
    (user_c, household_1, 'member'),
    (user_d, household_2, 'admin'),
    (user_e, household_2, 'member');

  insert into public.household_invite_links (household_id, token, expires_at)
  values (household_1, gen_random_uuid(), now() + interval '7 days');

  -- Lista general de la familia, con un producto que agregó B (024).
  insert into public.lists (id, owner_id, household_id, type)
  values (family_list, user_a, household_1, 'general');
  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested)
  values (family_list, variant_id, 2);

  -- Datos personales de B: no tienen que cambiar cuando lo eliminan.
  insert into public.lists (owner_id, household_id, type) values (user_b, null, 'general');
  insert into public.recipes (id, owner_id, household_id, name, base_servings)
  values (recipe_b, user_b, null, 'Receta B SCRUM-61', 4);
  insert into public.meal_plans (owner_id, household_id, date, meal_type, recipe_id)
  values (user_b, null, date '2026-10-20', 'lunch', recipe_b);
  insert into public.purchase_sessions (owner_id, household_id, store_id)
  values (user_b, null, store_id);

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_b', user_b::text, true);
  perform set_config('tacha_test.user_c', user_c::text, true);
  perform set_config('tacha_test.user_d', user_d::text, true);
  perform set_config('tacha_test.user_e', user_e::text, true);
  perform set_config('tacha_test.user_f', user_f::text, true);
  perform set_config('tacha_test.household_1', household_1::text, true);
  perform set_config('tacha_test.household_2', household_2::text, true);
  perform set_config('tacha_test.family_list', family_list::text, true);
  perform set_config(
    'tacha_test.invite_before',
    (select invite.token::text || '|' || invite.expires_at::text
     from public.household_invite_links invite where invite.household_id = household_1),
    true
  );
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos (rol dueño): la función existe con execute solo para
--    authenticated, es security definer, y household_members sigue sin
--    delete ni update para el cliente.
-- ----------------------------------------------------------------------------

do $$
begin
  assert not has_function_privilege('anon', 'public.remove_household_member(uuid)', 'execute'),
    'anon no ejecuta remove_household_member';
  assert has_function_privilege('authenticated', 'public.remove_household_member(uuid)', 'execute'),
    'authenticated ejecuta remove_household_member';
  assert not exists (
    select 1 from pg_proc p, aclexplode(p.proacl) a
    where p.oid = 'public.remove_household_member(uuid)'::regprocedure
      and a.grantee = 0 and a.privilege_type = 'EXECUTE'
  ), 'public no ejecuta remove_household_member';
  assert (select p.prosecdef from pg_proc p
          where p.oid = 'public.remove_household_member(uuid)'::regprocedure),
    'remove_household_member es security definer (household_members no tiene delete para el cliente)';
  -- Una función security definer sin search_path fijo podría usar tablas o
  -- funciones de otro esquema con el mismo nombre.
  assert exists (
    select 1 from pg_proc p, unnest(p.proconfig) setting
    where p.oid = 'public.remove_household_member(uuid)'::regprocedure
      and setting like 'search_path=%'
      and replace(replace(setting, 'search_path=', ''), '"', '') = ''
  ), 'remove_household_member tiene search_path vacío';
  assert not has_table_privilege('authenticated', 'public.household_members', 'delete'),
    'authenticated sigue sin delete sobre household_members';
  assert not has_table_privilege('authenticated', 'public.household_members', 'update'),
    'authenticated sigue sin update sobre household_members';
end $$;

-- ----------------------------------------------------------------------------
-- 2. Sin sesión, sesión anónima y rol anon: se rechaza (42501).
-- ----------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{}', true);

do $$
begin
  begin
    perform public.remove_household_member(current_setting('tacha_test.user_b')::uuid);
    assert false, 'sin sesión se pudo eliminar a un integrante';
  exception
    -- 42501, y por la falta de cuenta: así la prueba falla si se quita la
    -- validación de sesión.
    when insufficient_privilege then
      assert sqlerrm like 'Se requiere una cuenta registrada%', 'sin sesión: el 42501 tiene que ser por falta de cuenta';
  end;
end $$;

-- Una sesión anónima de Supabase es un usuario authenticated con is_anonymous,
-- acá con el id del admin A.
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
    perform public.remove_household_member(current_setting('tacha_test.user_b')::uuid);
    assert false, 'una sesión anónima pudo eliminar a un integrante';
  exception
    when insufficient_privilege then
      assert sqlerrm like 'Se requiere una cuenta registrada%', 'sesión anónima: el 42501 tiene que ser por anónima';
  end;
end $$;

reset role;
set local role anon;

do $$
begin
  begin
    perform public.remove_household_member(current_setting('tacha_test.user_b')::uuid);
    assert false, 'el rol anon pudo ejecutar remove_household_member';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

do $$
begin
  assert (select count(*) from public.household_members m
          where m.household_id = current_setting('tacha_test.household_1')::uuid) = 3,
    'ni sin sesión ni con una sesión anónima se eliminó a nadie';
end $$;

-- ----------------------------------------------------------------------------
-- 3. Casos sin cambios: integrante nulo (22023), un miembro que no es admin,
--    alguien sin familia, eliminarse a sí mismo y personas fuera de la familia.
-- ----------------------------------------------------------------------------

set local role authenticated;

-- B es miembro, no admin.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated', 'is_anonymous', false)::text,
  true
);

do $$
begin
  assert public.remove_household_member(current_setting('tacha_test.user_c')::uuid) = 'not_admin',
    'un miembro que no es admin recibe not_admin';
  assert public.remove_household_member(current_setting('tacha_test.user_a')::uuid) = 'not_admin',
    'un miembro no puede eliminar al admin';
  -- El chequeo de admin va antes que el de "a sí mismo".
  assert public.remove_household_member(current_setting('tacha_test.user_b')::uuid) = 'not_admin',
    'un miembro que se pasa su propio id recibe not_admin';
end $$;

-- F no tiene familia.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_f'), 'role', 'authenticated', 'is_anonymous', false)::text,
  true
);

do $$
begin
  assert public.remove_household_member(current_setting('tacha_test.user_b')::uuid) = 'not_admin',
    'alguien sin familia recibe not_admin';
end $$;

-- A es el admin de la familia 1.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated', 'is_anonymous', false)::text,
  true
);

do $$
begin
  begin
    perform public.remove_household_member(null);
    assert false, 'se aceptó un integrante nulo';
  exception
    when invalid_parameter_value then null;
  end;

  assert public.remove_household_member(current_setting('tacha_test.user_a')::uuid) = 'cannot_remove_self',
    'el admin no puede eliminarse a sí mismo';

  -- Misma respuesta para otra familia, sin familia e inexistente.
  assert public.remove_household_member(current_setting('tacha_test.user_e')::uuid) = 'member_not_found',
    'el admin no puede eliminar a alguien de otra familia';
  assert public.remove_household_member(current_setting('tacha_test.user_f')::uuid) = 'member_not_found',
    'el admin no puede eliminar a alguien sin familia';
  assert public.remove_household_member(gen_random_uuid()) = 'member_not_found',
    'un user_id inexistente da member_not_found';
end $$;

reset role;

do $$
begin
  assert (select count(*) from public.household_members m
          where m.household_id = current_setting('tacha_test.household_1')::uuid) = 3,
    'la familia 1 sigue con sus tres integrantes';
  assert (select count(*) from public.household_members m
          where m.household_id = current_setting('tacha_test.household_2')::uuid) = 2,
    'la familia 2 sigue con sus dos integrantes';
end $$;

-- ----------------------------------------------------------------------------
-- 4. Antes de eliminarlo, B ve su familia y la lista de la familia.
-- ----------------------------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated', 'is_anonymous', false)::text,
  true
);

do $$
begin
  assert (select count(*) from public.households h
          where h.id = current_setting('tacha_test.household_1')::uuid) = 1,
    'antes: B ve su familia';
  assert (select count(*) from public.lists l
          where l.id = current_setting('tacha_test.family_list')::uuid) = 1,
    'antes: B ve la lista de la familia';
end $$;

-- ----------------------------------------------------------------------------
-- 5. El admin A elimina a B (CA-03).
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated', 'is_anonymous', false)::text,
  true
);

do $$
begin
  assert public.remove_household_member(current_setting('tacha_test.user_b')::uuid) = 'removed',
    'el admin elimina a un miembro de su familia';

  -- Una segunda llamada (doble clic, otra pestaña) no cambia nada.
  assert public.remove_household_member(current_setting('tacha_test.user_b')::uuid) = 'member_not_found',
    'eliminar dos veces a la misma persona da member_not_found';

  -- Un delete directo sigue rechazado: la función es la única puerta.
  begin
    delete from public.household_members m where m.user_id = current_setting('tacha_test.user_c')::uuid;
    assert false, 'el admin pudo borrar una membresía sin la función';
  exception
    when insufficient_privilege then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 6. B pierde el acceso en ese momento; C no.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated', 'is_anonymous', false)::text,
  true
);

do $$
begin
  assert (select count(*) from public.households h
          where h.id = current_setting('tacha_test.household_1')::uuid) = 0,
    'después: B ya no ve la familia';
  assert (select count(*) from public.lists l
          where l.id = current_setting('tacha_test.family_list')::uuid) = 0,
    'después: B ya no ve la lista de la familia';
  assert (select count(*) from public.list_items i
          where i.list_id = current_setting('tacha_test.family_list')::uuid) = 0,
    'después: B ya no ve los productos de la lista de la familia';
end $$;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_c'), 'role', 'authenticated', 'is_anonymous', false)::text,
  true
);

do $$
begin
  assert (select count(*) from public.lists l
          where l.id = current_setting('tacha_test.family_list')::uuid) = 1,
    'C sigue viendo la lista de la familia';
  assert (select count(*) from public.list_items i
          where i.list_id = current_setting('tacha_test.family_list')::uuid) = 1,
    'lo que agregó B sigue en la lista de la familia';
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 7. Estado final (rol dueño): solo se borró la fila de B; sus datos
--    personales siguen; la familia sigue con un único admin; el enlace no cambió.
-- ----------------------------------------------------------------------------

do $$
declare
  user_b uuid := current_setting('tacha_test.user_b')::uuid;
  household_1 uuid := current_setting('tacha_test.household_1')::uuid;
begin
  assert not exists (select 1 from public.household_members m where m.user_id = user_b),
    'la fila de B se borró';
  assert (select count(*) from public.household_members m where m.household_id = household_1) = 2,
    'en la familia 1 quedan A y C';
  assert (select count(*) from public.household_members m
          where m.household_id = household_1 and m.role = 'admin') = 1,
    'la familia 1 sigue con un único admin';
  assert exists (select 1 from public.households h where h.id = household_1),
    'la familia 1 sigue existiendo';

  assert (select invite.token::text || '|' || invite.expires_at::text
          from public.household_invite_links invite where invite.household_id = household_1)
         = current_setting('tacha_test.invite_before'),
    'el enlace de invitación no cambió (D1)';

  assert (select count(*) from public.lists l where l.owner_id = user_b and l.household_id is null) = 1,
    'B conserva su lista personal';
  assert (select count(*) from public.recipes r where r.owner_id = user_b) = 1,
    'B conserva su receta';
  assert (select count(*) from public.meal_plans p where p.owner_id = user_b) = 1,
    'B conserva su plan';
  assert (select count(*) from public.purchase_sessions s where s.owner_id = user_b) = 1,
    'B conserva su compra';

  assert (select count(*) from public.household_members m
          where m.household_id = current_setting('tacha_test.household_2')::uuid) = 2,
    'la familia 2 no cambió';
end $$;

-- ----------------------------------------------------------------------------
-- 8. Nunca se elimina a un admin. Por diseño hay uno solo por familia, pero la
--    base no lo impide: se simula un segundo admin (C) y A no puede quitarlo.
-- ----------------------------------------------------------------------------

update public.household_members m set role = 'admin'
where m.user_id = current_setting('tacha_test.user_c')::uuid;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated', 'is_anonymous', false)::text,
  true
);

do $$
begin
  assert public.remove_household_member(current_setting('tacha_test.user_c')::uuid) = 'member_not_found',
    'un admin no puede eliminar a otro admin';
end $$;

reset role;

do $$
begin
  assert exists (select 1 from public.household_members m
                 where m.user_id = current_setting('tacha_test.user_c')::uuid and m.role = 'admin'),
    'el otro admin sigue en la familia';
end $$;

select set_config('tacha_test.done', 'ok', true);

rollback;
