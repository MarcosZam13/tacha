-- ============================================================================
-- Prueba de la migración 054 (SCRUM-109): tablas de grupos de productos.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 054. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios, familias ni grupos en la base
-- compartida. Si una regla no se cumple, un `assert` corta con su mensaje; si
-- termina sin error, pasó (se ve la fila del último `select set_config(...)`).
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- Datos (los crea el dueño de las tablas, sin pasar por la RLS: todavía no
-- hay forma de crear grupos desde la app):
--   familia 1: A (admin) y B (member).
--   C: usuario sin familia.
--   Grupos: "A personal" (A, sin familia), "A compartido" (A, familia 1),
--           "B personal" (B, sin familia), "C personal" (C, sin familia).
--   Cada grupo tiene 2 items con dos presentaciones reales del catálogo.
--
-- Qué comprueba (features/product-groups/specs/SPEC.md §13, SCRUM-109):
--   1. RLS activada, una política de lectura por tabla y permisos: el
--      cliente solo lee (ni anon ni public tienen nada);
--   2. sin sesión no se ve ningún grupo;
--   3. el dueño ve sus personales y los compartidos de su familia (caso 2);
--   4. otro miembro ve el compartido pero no el personal ajeno (casos 3 y 4);
--   5. alguien de afuera solo ve lo suyo;
--   6. los items se ven solo con su grupo;
--   7. nadie del cliente inserta, actualiza ni borra;
--   8. checks de la tabla (nombre, cantidad, posición, presentación repetida);
--   9. quien sale de la familia deja de ver los grupos compartidos;
--  10. borrar un grupo borra sus items; borrar la familia deja sus grupos
--      como personales de su dueño (on delete set null).
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
  family_1 uuid;
  variant_1 uuid;
  variant_2 uuid;
  group_a_personal uuid;
  group_a_shared uuid;
  group_b_personal uuid;
  group_c_personal uuid;
begin
  insert into auth.users (id, aud, role, email)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha'),
    (user_c, 'authenticated', 'authenticated', user_c || '@prueba.tacha');

  insert into public.households (name) values ('Familia prueba 054') returning id into family_1;
  insert into public.household_members (user_id, household_id, role)
  values (user_a, family_1, 'admin'), (user_b, family_1, 'member');

  -- Dos presentaciones del catálogo global: las que existan, da igual cuáles.
  select v.id into variant_1
  from public.product_catalog_variants v
  join public.product_catalog pc on pc.id = v.product_catalog_id
  where pc.owner_id is null and pc.household_id is null
  order by v.id
  limit 1;

  select v.id into variant_2
  from public.product_catalog_variants v
  join public.product_catalog pc on pc.id = v.product_catalog_id
  where pc.owner_id is null and pc.household_id is null and v.id <> variant_1
  order by v.id
  limit 1;

  assert variant_1 is not null and variant_2 is not null, 'hacen falta dos presentaciones del catálogo global';

  insert into public.product_groups (owner_id, household_id, name)
  values (user_a, null, 'A personal') returning id into group_a_personal;
  insert into public.product_groups (owner_id, household_id, name)
  values (user_a, family_1, 'A compartido') returning id into group_a_shared;
  insert into public.product_groups (owner_id, household_id, name)
  values (user_b, null, 'B personal') returning id into group_b_personal;
  insert into public.product_groups (owner_id, household_id, name)
  values (user_c, null, 'C personal') returning id into group_c_personal;

  insert into public.product_group_items (group_id, product_catalog_variant_id, quantity, position)
  select g.id, v.variant_id, v.quantity, v.position
  from unnest(array[group_a_personal, group_a_shared, group_b_personal, group_c_personal]) as g(id)
  cross join (values (variant_1, 1, 0), (variant_2, 3, 1)) as v(variant_id, quantity, position);

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_b', user_b::text, true);
  perform set_config('tacha_test.user_c', user_c::text, true);
  perform set_config('tacha_test.family_1', family_1::text, true);
  perform set_config('tacha_test.variant_1', variant_1::text, true);
  perform set_config('tacha_test.group_a_personal', group_a_personal::text, true);
  perform set_config('tacha_test.group_a_shared', group_a_shared::text, true);
  perform set_config('tacha_test.group_b_personal', group_b_personal::text, true);
  perform set_config('tacha_test.group_c_personal', group_c_personal::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. RLS, políticas y permisos (rol dueño).
-- ----------------------------------------------------------------------------

do $$
declare
  table_name text;
begin
  foreach table_name in array array['product_groups', 'product_group_items'] loop
    assert (select c.relrowsecurity from pg_class c where c.oid = ('public.' || table_name)::regclass),
      table_name || ' tiene que tener RLS activada';

    assert (select count(*) from pg_policies p
            where p.schemaname = 'public' and p.tablename = table_name) = 1,
      table_name || ' tiene que tener exactamente una política';
    assert exists (
      select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = table_name
        and p.cmd = 'SELECT' and p.roles = '{authenticated}' and p.permissive = 'PERMISSIVE'
    ), table_name || ': la única política es de lectura, permisiva y para authenticated';

    assert not has_table_privilege('anon', 'public.' || table_name, 'select'), 'anon no lee ' || table_name;
    assert not has_table_privilege('anon', 'public.' || table_name, 'insert'), 'anon no inserta en ' || table_name;
    assert not exists (
      select 1 from pg_class c, aclexplode(c.relacl) a
      where c.oid = ('public.' || table_name)::regclass and a.grantee = 0
    ), 'public no tiene permisos sobre ' || table_name;

    assert has_table_privilege('authenticated', 'public.' || table_name, 'select'), 'authenticated lee ' || table_name;
    assert not has_table_privilege('authenticated', 'public.' || table_name, 'insert'),
      'authenticated no inserta en ' || table_name;
    assert not has_table_privilege('authenticated', 'public.' || table_name, 'update'),
      'authenticated no actualiza ' || table_name;
    assert not has_table_privilege('authenticated', 'public.' || table_name, 'delete'),
      'authenticated no borra ' || table_name;
    assert not has_table_privilege('authenticated', 'public.' || table_name, 'truncate'),
      'authenticated no vacía ' || table_name;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 2. Sin sesión: no se ve nada.
-- ----------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{}', true);

do $$
begin
  assert (select count(*) from public.product_groups) = 0, 'sin sesión no se ve ningún grupo';
  assert (select count(*) from public.product_group_items) = 0, 'sin sesión no se ve ningún item';
end $$;

-- ----------------------------------------------------------------------------
-- 3. A (dueño, con familia): sus dos grupos, el personal y el compartido.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert (select count(*) from public.product_groups) = 2, 'A ve exactamente 2 grupos';
  assert exists (select 1 from public.product_groups g
                 where g.id = current_setting('tacha_test.group_a_personal')::uuid),
    'A ve su grupo personal';
  assert exists (select 1 from public.product_groups g
                 where g.id = current_setting('tacha_test.group_a_shared')::uuid),
    'A ve su grupo compartido';
  assert not exists (select 1 from public.product_groups g
                     where g.id = current_setting('tacha_test.group_b_personal')::uuid),
    'A no ve el grupo personal de B, aunque sean de la misma familia';

  -- 6. Items: solo los de sus 2 grupos (2 cada uno).
  assert (select count(*) from public.product_group_items) = 4, 'A ve solo los items de sus 2 grupos';
end $$;

-- ----------------------------------------------------------------------------
-- 4. B (otro miembro): el compartido de A y su personal; nunca el personal de A.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert (select count(*) from public.product_groups) = 2, 'B ve exactamente 2 grupos';
  assert exists (select 1 from public.product_groups g
                 where g.id = current_setting('tacha_test.group_a_shared')::uuid),
    'B ve el grupo que A compartió con la familia';
  assert not exists (select 1 from public.product_groups g
                     where g.id = current_setting('tacha_test.group_a_personal')::uuid),
    'B no ve el grupo personal de A';
  assert not exists (select 1 from public.product_group_items i
                     where i.group_id = current_setting('tacha_test.group_a_personal')::uuid),
    'B no ve los items del grupo personal de A';
end $$;

-- ----------------------------------------------------------------------------
-- 5. C (sin familia): solo su grupo.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_c'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert (select count(*) from public.product_groups) = 1, 'C ve exactamente 1 grupo';
  assert exists (select 1 from public.product_groups g
                 where g.id = current_setting('tacha_test.group_c_personal')::uuid),
    'C ve su grupo personal';
  assert (select count(*) from public.product_group_items) = 2, 'C ve solo los items de su grupo';
end $$;

-- ----------------------------------------------------------------------------
-- 7. Nadie del cliente escribe (como A, sobre lo suyo): 42501 por permisos.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  begin
    insert into public.product_groups (owner_id, name)
    values (current_setting('tacha_test.user_a')::uuid, 'Directo');
    assert false, 'A pudo insertar un grupo directo en la tabla';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.product_groups set name = 'Cambiado'
    where id = current_setting('tacha_test.group_a_personal')::uuid;
    assert false, 'A pudo actualizar su grupo directo en la tabla';
  exception
    when insufficient_privilege then null;
  end;

  begin
    delete from public.product_groups where id = current_setting('tacha_test.group_a_personal')::uuid;
    assert false, 'A pudo borrar su grupo directo en la tabla';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.product_group_items (group_id, product_catalog_variant_id, quantity, position)
    values (current_setting('tacha_test.group_a_personal')::uuid, current_setting('tacha_test.variant_1')::uuid, 1, 9);
    assert false, 'A pudo insertar un item directo en la tabla';
  exception
    when insufficient_privilege then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 8. Checks de la tabla (rol dueño).
-- ----------------------------------------------------------------------------

reset role;

do $$
declare
  owner uuid := current_setting('tacha_test.user_c')::uuid;
  existing_group uuid := current_setting('tacha_test.group_c_personal')::uuid;
  invalid_name text;
begin
  foreach invalid_name in array array['', ' Mercado', 'Mercado ', repeat('x', 61)] loop
    begin
      insert into public.product_groups (owner_id, name) values (owner, invalid_name);
      assert false, 'se aceptó el nombre inválido "' || invalid_name || '"';
    exception
      when check_violation then null;
    end;
  end loop;

  insert into public.product_groups (owner_id, name) values (owner, repeat('x', 60));

  begin
    update public.product_group_items set quantity = 0 where group_id = existing_group;
    assert false, 'se aceptó una cantidad 0';
  exception
    when check_violation then null;
  end;

  begin
    update public.product_group_items set quantity = 100 where group_id = existing_group;
    assert false, 'se aceptó una cantidad 100';
  exception
    when check_violation then null;
  end;

  begin
    update public.product_group_items set position = -1 where group_id = existing_group;
    assert false, 'se aceptó una posición negativa';
  exception
    when check_violation then null;
  end;

  begin
    insert into public.product_group_items (group_id, product_catalog_variant_id, quantity, position)
    values (existing_group, current_setting('tacha_test.variant_1')::uuid, 2, 5);
    assert false, 'se aceptó la misma presentación dos veces en un grupo';
  exception
    when unique_violation then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 9. A sale de la familia: deja de ver el grupo que compartió.
-- ----------------------------------------------------------------------------

delete from public.household_members m where m.user_id = current_setting('tacha_test.user_a')::uuid;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert (select count(*) from public.product_groups) = 1, 'fuera de la familia, A solo ve su grupo personal';
  assert not exists (select 1 from public.product_groups g
                     where g.id = current_setting('tacha_test.group_a_shared')::uuid),
    'fuera de la familia, A ya no ve el grupo que compartió';
end $$;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert exists (select 1 from public.product_groups g
                 where g.id = current_setting('tacha_test.group_a_shared')::uuid),
    'el grupo compartido se queda con la familia: B lo sigue viendo';
end $$;

-- ----------------------------------------------------------------------------
-- 10. Cascadas (rol dueño).
-- ----------------------------------------------------------------------------

reset role;

do $$
begin
  delete from public.product_groups g where g.id = current_setting('tacha_test.group_c_personal')::uuid;
  assert not exists (select 1 from public.product_group_items i
                     where i.group_id = current_setting('tacha_test.group_c_personal')::uuid),
    'borrar un grupo borra sus items';

  delete from public.households h where h.id = current_setting('tacha_test.family_1')::uuid;
  assert exists (
    select 1 from public.product_groups g
    where g.id = current_setting('tacha_test.group_a_shared')::uuid
      and g.household_id is null
      and g.owner_id = current_setting('tacha_test.user_a')::uuid
  ), 'borrar la familia deja el grupo compartido como personal de su dueño';
  assert (select count(*) from public.product_group_items i
          where i.group_id = current_setting('tacha_test.group_a_shared')::uuid) = 2,
    'el grupo que vuelve a ser personal conserva sus items';
end $$;

select set_config('tacha_test.done', 'ok', true);

rollback;
