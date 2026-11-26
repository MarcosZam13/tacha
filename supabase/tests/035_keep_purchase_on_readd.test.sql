-- ============================================================================
-- Prueba de la migración 035 (SCRUM-156): volver a añadir un producto tachado
-- ya no borra su compra.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 035. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios, familias, listas ni compras en la base
-- compartida. Si una regla no se cumple, un `assert` corta con su mensaje; si
-- termina sin error, pasó. Contra la base sin 035 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- Datos:
--   familia 1: A (admin) y B (miembro). A tiene una receta.
--   C: usuario registrado sin familia (ajeno).
--   D: usuario registrado con una lista personal, entra a la familia en el paso 7.
--   v1, v2: dos presentaciones del catálogo.
--
-- Casos:
--   1. El unique de 004 ya no está; está el índice parcial de pendientes.
--   2. A compra v1 en una compra que cierra. Volver a añadir v1 desde el
--      buscador crea una pendiente nueva; la tachada conserva compra, quién y
--      lo comprado.
--   3. Añadir v1 otra vez (buscador y receta) suma a esa pendiente: nunca dos
--      pendientes de la misma presentación.
--   4. B destacha la fila de la compra de A (con un pedido de la receta de A)
--      mientras hay una pendiente de v1: se juntan en la pendiente (cantidad y
--      pedido de receta) y la destachada desaparece.
--   5. Destachar sin pendiente igual: la misma fila vuelve a pendientes.
--   6. C no puede tachar ni destachar filas de la familia; anon no puede
--      ejecutar la función.
--   7. D entra a la familia y comparte: su v1 se suma a la pendiente y su v2
--      entra como pendiente nueva aunque la familia tenga v2 tachada en una
--      compra, que queda intacta. Devuelve 'shared'.
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
  household_1 uuid := gen_random_uuid();
  recipe_a uuid := gen_random_uuid();
  list_d uuid := gen_random_uuid();
  store_id uuid := (select s.id from public.stores s order by s.slug limit 1);
  variant_1 uuid := (select v.id from public.product_catalog_variants v order by v.id limit 1);
  variant_2 uuid := (select v.id from public.product_catalog_variants v order by v.id offset 1 limit 1);
begin
  if variant_2 is null or store_id is null then
    raise exception 'Hacen falta una tienda y dos variantes en el catálogo para esta prueba';
  end if;

  insert into auth.users (id, aud, role, email)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha'),
    (user_c, 'authenticated', 'authenticated', user_c || '@prueba.tacha'),
    (user_d, 'authenticated', 'authenticated', user_d || '@prueba.tacha');

  insert into public.households (id, name) values (household_1, 'Familia SCRUM-156');
  insert into public.household_members (user_id, household_id, role)
  values (user_a, household_1, 'admin'), (user_b, household_1, 'member');

  insert into public.recipes (id, owner_id, household_id, name, base_servings)
  values (recipe_a, user_a, null, 'Receta A SCRUM-156', 4);

  -- Lista personal de D, con v1 x2 y v2 x3 pendientes.
  insert into public.lists (id, owner_id, household_id, type) values (list_d, user_d, null, 'general');
  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested)
  values (list_d, variant_1, 2), (list_d, variant_2, 3);

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_b', user_b::text, true);
  perform set_config('tacha_test.user_c', user_c::text, true);
  perform set_config('tacha_test.user_d', user_d::text, true);
  perform set_config('tacha_test.household_1', household_1::text, true);
  perform set_config('tacha_test.recipe_a', recipe_a::text, true);
  perform set_config('tacha_test.store_id', store_id::text, true);
  perform set_config('tacha_test.v1', variant_1::text, true);
  perform set_config('tacha_test.v2', variant_2::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Índices.
-- ----------------------------------------------------------------------------

do $$
begin
  assert not exists (
    select 1 from pg_constraint
    where conrelid = 'public.list_items'::regclass
      and conname = 'list_items_list_id_product_catalog_variant_id_key'
  ), 'el unique de 004 tenía que borrarse';
  assert exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'list_items_one_pending_per_variant'
      and indexdef ilike '%where (checked_at is null)%'
  ), 'falta el índice único parcial de pendientes';
end $$;

-- ----------------------------------------------------------------------------
-- 2. A compra v1 y la vuelve a añadir.
-- ----------------------------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  bought_item public.list_items;
  readded_item public.list_items;
  session public.purchase_sessions;
begin
  bought_item := public.add_item_to_general_list(current_setting('tacha_test.v1')::uuid);
  perform set_config('tacha_test.family_list', bought_item.list_id::text, true);

  session := public.start_purchase_session(current_setting('tacha_test.store_id')::uuid, now() - interval '1 hour');
  bought_item := public.check_list_item_in_session(bought_item.id, session.id);
  perform public.change_bought_quantity(bought_item.id, 1);
  perform public.close_purchase_session(session.id, 1500);

  readded_item := public.add_item_to_general_list(current_setting('tacha_test.v1')::uuid);

  assert readded_item.id <> bought_item.id, 'volver a añadir tenía que crear otra fila';
  assert readded_item.checked_at is null and readded_item.quantity_requested = 1,
    'la fila nueva es pendiente con 1';

  select * into bought_item from public.list_items where id = bought_item.id;
  assert bought_item.checked_at is not null
    and bought_item.checked_by = auth.uid()
    and bought_item.purchase_session_id = session.id
    and bought_item.quantity_bought = 2,
    'la fila comprada conserva su compra, quién y lo comprado (2)';

  perform set_config('tacha_test.bought_item', bought_item.id::text, true);
  perform set_config('tacha_test.pending_item', readded_item.id::text, true);
  perform set_config('tacha_test.session_a', session.id::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 3. Añadir otra vez suma a la pendiente (buscador y receta).
-- ----------------------------------------------------------------------------

do $$
declare
  item public.list_items;
  units_item_id uuid;
begin
  item := public.add_item_to_general_list(current_setting('tacha_test.v1')::uuid);
  assert item.id = current_setting('tacha_test.pending_item')::uuid and item.quantity_requested = 2,
    'el buscador suma a la pendiente';

  units_item_id := public.add_units_to_list_item(
    current_setting('tacha_test.family_list')::uuid, current_setting('tacha_test.v1')::uuid, 3
  );
  assert units_item_id = current_setting('tacha_test.pending_item')::uuid, 'la receta suma a la misma pendiente';

  assert (select count(*) from public.list_items li
          where li.list_id = current_setting('tacha_test.family_list')::uuid
            and li.product_catalog_variant_id = current_setting('tacha_test.v1')::uuid
            and li.checked_at is null) = 1,
    'nunca dos pendientes de la misma presentación';
  assert (select li.quantity_requested from public.list_items li
          where li.id = current_setting('tacha_test.pending_item')::uuid) = 5,
    'pendiente: 1 + 1 + 3';

  -- Un pedido de la receta de A sobre la fila comprada, para el paso 4.
  insert into public.list_item_recipe_requirements (
    list_item_id, recipe_id, quantity_needed, quantity_missing, quantity_unit
  ) values (
    current_setting('tacha_test.bought_item')::uuid, current_setting('tacha_test.recipe_a')::uuid, 500, 200, 'ml'
  );
end $$;

-- ----------------------------------------------------------------------------
-- 4. B destacha la fila comprada: se junta con la pendiente.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  result_item public.list_items;
begin
  result_item := public.set_list_item_checked(current_setting('tacha_test.bought_item')::uuid, false);

  assert result_item.id = current_setting('tacha_test.pending_item')::uuid,
    'devuelve la pendiente (otro id): el cliente sabe que se juntaron';
  assert result_item.checked_at is null and result_item.quantity_requested = 6,
    'la pendiente suma lo pedido de la destachada: 5 + 1';
  assert not exists (
    select 1 from public.list_items where id = current_setting('tacha_test.bought_item')::uuid
  ), 'la fila destachada desaparece';
  assert (select count(*) from public.list_item_recipe_requirements r
          where r.list_item_id = current_setting('tacha_test.pending_item')::uuid
            and r.recipe_id = current_setting('tacha_test.recipe_a')::uuid
            and r.quantity_needed = 500 and r.quantity_missing = 200) = 1,
    'el pedido de la receta de A pasa a la pendiente aunque destache B';
end $$;

-- ----------------------------------------------------------------------------
-- 5. Destachar sin pendiente igual: la misma fila vuelve.
-- ----------------------------------------------------------------------------

do $$
declare
  item public.list_items;
begin
  item := public.set_list_item_checked(current_setting('tacha_test.pending_item')::uuid, true);
  assert item.checked_at is not null, 'B tacha la pendiente';

  item := public.set_list_item_checked(current_setting('tacha_test.pending_item')::uuid, false);
  assert item.id = current_setting('tacha_test.pending_item')::uuid and item.checked_at is null
    and item.quantity_requested = 6,
    'sin otra pendiente, destachar devuelve la misma fila';
end $$;

-- ----------------------------------------------------------------------------
-- 6. Ajenos.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_c'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  begin
    perform public.set_list_item_checked(current_setting('tacha_test.pending_item')::uuid, true);
    assert false, 'C tachó una fila de otra familia';
  exception
    when no_data_found then null;
  end;
end $$;

reset role;
set local role anon;

do $$
begin
  begin
    perform public.set_list_item_checked(current_setting('tacha_test.pending_item')::uuid, true);
    assert false, 'anon ejecutó set_list_item_checked';
  exception
    when insufficient_privilege then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 7. D entra a la familia y comparte su lista.
-- ----------------------------------------------------------------------------

reset role;

-- A tacha v2 en una compra abierta (rol A).
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  item public.list_items;
  session public.purchase_sessions;
begin
  item := public.add_item_to_general_list(current_setting('tacha_test.v2')::uuid);
  session := public.start_purchase_session(current_setting('tacha_test.store_id')::uuid, now() - interval '1 hour');
  item := public.check_list_item_in_session(item.id, session.id);
  perform set_config('tacha_test.checked_v2', item.id::text, true);
  perform set_config('tacha_test.session_v2', session.id::text, true);
end $$;

reset role;
insert into public.household_members (user_id, household_id, role)
values (current_setting('tacha_test.user_d')::uuid, current_setting('tacha_test.household_1')::uuid, 'member');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_d'), 'role', 'authenticated', 'is_anonymous', false)::text,
  true
);

do $$
begin
  assert public.decide_personal_lists('share') = 'shared', 'D comparte todo';

  assert (select li.quantity_requested from public.list_items li
          where li.list_id = current_setting('tacha_test.family_list')::uuid
            and li.product_catalog_variant_id = current_setting('tacha_test.v1')::uuid
            and li.checked_at is null) = 8,
    'v1: la pendiente de la familia (6) + 2 de D';

  assert (select count(*) from public.list_items li
          where li.list_id = current_setting('tacha_test.family_list')::uuid
            and li.product_catalog_variant_id = current_setting('tacha_test.v2')::uuid
            and li.checked_at is null
            and li.quantity_requested = 3) = 1,
    'v2 de D entra como pendiente nueva';

  assert (select count(*) from public.list_items li
          where li.id = current_setting('tacha_test.checked_v2')::uuid
            and li.checked_at is not null
            and li.purchase_session_id = current_setting('tacha_test.session_v2')::uuid) = 1,
    'la v2 que A tachó en su compra sigue intacta';
end $$;

reset role;
select set_config('tacha_test.done', 'ok', true);

rollback;
