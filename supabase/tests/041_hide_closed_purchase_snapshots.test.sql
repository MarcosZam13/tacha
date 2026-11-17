-- ============================================================================
-- Prueba de la migración 041 (SCRUM-115, BUG-1 de la PR #82): las fotos de
-- filas de una compra cerrada no llegan a la pantalla.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 041. Todo pasa dentro de una transacción que termina en
-- rollback. Si una regla no se cumple, un `assert` corta con su mensaje; si
-- termina sin error, pasó. Contra la base sin 041 falla en el paso 2.
--
-- Ejecutarlo completo, nunca por partes.
--
-- Datos: A sin familia, con su lista general personal y un producto de prueba
-- con dos presentaciones (1000 ml y 250 ml).
--   item_open: 1000 ml tachada en una compra ABIERTA, con foto.
--   item_closed: 1000 ml tachada en una compra que después se CIERRA, con foto.
--   item_free: 250 ml tachada sin compra, con foto.
-- Las tres son filas tachadas: el índice de una pendiente por variante (035)
-- no aplica.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño).
-- ----------------------------------------------------------------------------

do $$
declare
  user_a uuid := gen_random_uuid();
  list_a uuid := gen_random_uuid();
  product_p uuid := gen_random_uuid();
  variant_liter uuid := gen_random_uuid();
  variant_small uuid := gen_random_uuid();
  item_open uuid := gen_random_uuid();
  item_closed uuid := gen_random_uuid();
  item_free uuid := gen_random_uuid();
  open_session uuid := gen_random_uuid();
  closed_session uuid := gen_random_uuid();
  store_id uuid := (select s.id from public.stores s order by s.slug limit 1);
begin
  if store_id is null then
    raise exception 'No hay tiendas en public.stores: aplicar schema.sql antes de esta prueba';
  end if;

  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha', '{"name": "Ana"}');

  insert into public.lists (id, owner_id, household_id, type)
  values (list_a, user_a, null, 'general');

  -- Producto propio de la prueba (se va con el rollback).
  insert into public.product_catalog (id, name, source)
  values (product_p, 'P115b leche ' || product_p, 'manual');
  insert into public.product_catalog_variants (id, product_catalog_id, name, base_unit, base_quantity)
  values
    (variant_liter, product_p, 'P115b leche 1000 ml', 'ml', 1000),
    (variant_small, product_p, 'P115b leche 250 ml', 'ml', 250);

  -- El trigger de 016/018 exige que la compra sea de quien llama.
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_a, 'role', 'authenticated')::text,
    true
  );

  insert into public.purchase_sessions (id, owner_id, store_id)
  values (open_session, user_a, store_id), (closed_session, user_a, store_id);

  insert into public.list_items (
    id, list_id, product_catalog_variant_id, quantity_requested, checked_at, purchase_session_id, quantity_bought
  )
  values
    (item_open, list_a, variant_liter, 1, now(), open_session, 1),
    (item_closed, list_a, variant_liter, 1, now(), closed_session, 1),
    (item_free, list_a, variant_small, 1, now(), null, null);

  update public.purchase_sessions set closed_at = now(), total_amount = 0 where id = closed_session;

  insert into public.list_item_shortfall_snapshots (list_item_id, previous_variant_id, previous_quantity_requested)
  values (item_open, variant_small, 2), (item_closed, variant_small, 2), (item_free, variant_liter, 2);

  perform set_config('request.jwt.claims', '{}', true);

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.item_open', item_open::text, true);
  perform set_config('tacha_test.item_closed', item_closed::text, true);
  perform set_config('tacha_test.item_free', item_free::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos: siguen como en la 037.
-- ----------------------------------------------------------------------------

do $$
begin
  assert not has_function_privilege('anon', 'public.get_general_list_shortfall_snapshots(timestamptz)', 'execute'),
    'anon no ejecuta get_general_list_shortfall_snapshots';
  assert has_function_privilege('authenticated', 'public.get_general_list_shortfall_snapshots(timestamptz)', 'execute'),
    'authenticated ejecuta get_general_list_shortfall_snapshots';
end $$;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

-- ----------------------------------------------------------------------------
-- 2. La foto de la fila de la compra cerrada no llega a la pantalla; las de
--    la compra abierta y la de la fila sin compra, sí.
-- ----------------------------------------------------------------------------

do $$
declare
  snapshot_item_ids uuid[];
begin
  select array_agg(s.list_item_id order by s.list_item_id)
  into snapshot_item_ids
  from public.get_general_list_shortfall_snapshots(date_trunc('day', now())) s;

  assert not (current_setting('tacha_test.item_closed')::uuid = any(snapshot_item_ids)),
    'la foto de una fila de una compra cerrada no llega a la pantalla';
  assert current_setting('tacha_test.item_open')::uuid = any(snapshot_item_ids),
    'la foto de una fila de una compra abierta sí llega';
  assert current_setting('tacha_test.item_free')::uuid = any(snapshot_item_ids),
    'la foto de una fila sin compra sí llega';
end $$;

-- ----------------------------------------------------------------------------
-- 3. Destachar la fila de la compra cerrada (como hace la pantalla sin
--    diálogo): queda pendiente con su presentación y cantidad de ahora.
-- ----------------------------------------------------------------------------

do $$
declare
  changed public.list_items;
begin
  changed := public.set_list_item_checked(current_setting('tacha_test.item_closed')::uuid, false);

  assert changed.checked_at is null, 'la fila queda pendiente';
  assert changed.quantity_requested = 1, 'no vuelve a la cantidad de la foto';
end $$;

rollback;
