-- ============================================================================
-- Prueba de la migración 037 (SCRUM-115): faltante en vivo, "¿Qué hiciste?" y
-- deshacer al destachar.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 037. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios, familias, listas ni compras en la base
-- compartida. Si una regla no se cumple, un `assert` corta con su mensaje; si
-- termina sin error, pasó. Contra la base sin 037 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes.
--
-- Datos:
--   familia 1: A (admin) y B (miembro), con la lista general de la familia.
--   E: usuario sin familia (no ve nada de la familia 1).
--   P: un producto con al menos dos presentaciones en ml: chica (s ml) y
--   grande (b ml). Q: una variante de otro producto.
--   item1: 3 × chica de P, tachada hoy, sin compra.
--     Receta A pide 2s ml (primero), Receta B pide 2s ml (después),
--     Receta A pide 100 g (P no se vende en g) y Receta B pide 2 unidad.
--     En vivo: hay 3s ml → A cubierta, B falta s ml; A falta 100 g; la de
--     unidad nunca es aviso.
--   item5: Q tachada en una compra de A ya cerrada.
--   item6: Q tachada en una compra de A abierta (para "Agregué otra igual" en
--   modo compra). item5 e item6 son de la misma variante, pero las dos están
--   tachadas: el índice de una pendiente por variante (035) no aplica.
-- "Tachado ayer" se simula con una medianoche 5 minutos en el futuro (dentro
-- del margen que acepta assert_local_day_start): lo tachado ahora queda antes.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño).
-- ----------------------------------------------------------------------------

do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  user_e uuid := gen_random_uuid();
  household_1 uuid := gen_random_uuid();
  recipe_a uuid := gen_random_uuid();
  recipe_b uuid := gen_random_uuid();
  list_family uuid := gen_random_uuid();
  item_1 uuid := gen_random_uuid();
  item_5 uuid := gen_random_uuid();
  item_6 uuid := gen_random_uuid();
  closed_session uuid := gen_random_uuid();
  open_session uuid := gen_random_uuid();
  product_p uuid;
  variant_small uuid;
  variant_big uuid;
  small_quantity numeric;
  big_quantity numeric;
  variant_q uuid;
  store_id uuid := (select s.id from public.stores s order by s.slug limit 1);
begin
  select v.product_catalog_id into product_p
  from public.product_catalog_variants v
  group by v.product_catalog_id
  having count(*) >= 2
    and bool_and(v.base_unit = 'ml')
    and max(v.base_quantity) > min(v.base_quantity)
    and max(v.base_quantity) <= 50000
  order by v.product_catalog_id
  limit 1;

  if product_p is null then
    raise exception 'Hace falta un producto con al menos dos presentaciones en ml para esta prueba';
  end if;

  select v.id, v.base_quantity into variant_small, small_quantity
  from public.product_catalog_variants v
  where v.product_catalog_id = product_p
  order by v.base_quantity, v.id
  limit 1;

  select v.id, v.base_quantity into variant_big, big_quantity
  from public.product_catalog_variants v
  where v.product_catalog_id = product_p
  order by v.base_quantity desc, v.id
  limit 1;

  select v.id into variant_q
  from public.product_catalog_variants v
  where v.product_catalog_id <> product_p
  order by v.id
  limit 1;

  if store_id is null then
    raise exception 'No hay tiendas en public.stores: aplicar schema.sql antes de esta prueba';
  end if;

  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha', '{"name": "Ana"}'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha', '{"name": "Beto"}'),
    (user_e, 'authenticated', 'authenticated', user_e || '@prueba.tacha', '{"name": "Eva"}');

  insert into public.households (id, name) values (household_1, 'Familia 1 SCRUM-115');
  insert into public.household_members (user_id, household_id, role)
  values (user_a, household_1, 'admin'), (user_b, household_1, 'member');

  insert into public.lists (id, owner_id, household_id, type)
  values (list_family, user_a, household_1, 'general');

  insert into public.recipes (id, owner_id, household_id, name, base_servings)
  values
    (recipe_a, user_a, null, 'Receta A SCRUM-115', 2),
    (recipe_b, user_b, null, 'Receta B SCRUM-115', 2);

  insert into public.recipe_ingredients (recipe_id, product_catalog_id, quantity_value, quantity_unit, position)
  values (recipe_b, product_p, 2 * small_quantity, 'ml', 0);

  insert into public.list_items (id, list_id, product_catalog_variant_id, quantity_requested, checked_at)
  values (item_1, list_family, variant_small, 3, now());

  insert into public.list_item_recipe_requirements (
    list_item_id, recipe_id, quantity_needed, quantity_missing, quantity_unit, created_at
  )
  values
    (item_1, recipe_a, 2 * small_quantity, 0, 'ml', now() - interval '4 minutes'),
    (item_1, recipe_b, 2 * small_quantity, 0, 'ml', now() - interval '3 minutes'),
    (item_1, recipe_a, 100, 100, 'g', now() - interval '2 minutes'),
    (item_1, recipe_b, 2, 2, 'unidad', now() - interval '1 minute');

  -- Compras de A: el trigger de 016/018 exige que la compra sea de quien
  -- llama, así que estas filas se insertan con los claims de A.
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_a, 'role', 'authenticated')::text,
    true
  );

  insert into public.purchase_sessions (id, owner_id, store_id)
  values (closed_session, user_a, store_id), (open_session, user_a, store_id);

  insert into public.list_items (
    id, list_id, product_catalog_variant_id, quantity_requested, checked_at, purchase_session_id, quantity_bought
  )
  values
    (item_5, list_family, variant_q, 1, now(), closed_session, 1),
    (item_6, list_family, variant_q, 1, now(), open_session, 1);

  update public.purchase_sessions set closed_at = now(), total_amount = 0 where id = closed_session;

  perform set_config('request.jwt.claims', '{}', true);

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_b', user_b::text, true);
  perform set_config('tacha_test.user_e', user_e::text, true);
  perform set_config('tacha_test.recipe_a', recipe_a::text, true);
  perform set_config('tacha_test.recipe_b', recipe_b::text, true);
  perform set_config('tacha_test.item_1', item_1::text, true);
  perform set_config('tacha_test.item_5', item_5::text, true);
  perform set_config('tacha_test.item_6', item_6::text, true);
  perform set_config('tacha_test.variant_small', variant_small::text, true);
  perform set_config('tacha_test.variant_big', variant_big::text, true);
  perform set_config('tacha_test.variant_q', variant_q::text, true);
  perform set_config('tacha_test.small', small_quantity::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos: anon no ejecuta nada nuevo; nadie llama a mano a las internas;
--    la tabla de fotos no se lee desde el cliente.
-- ----------------------------------------------------------------------------

do $$
begin
  assert not has_function_privilege('anon', 'public.get_general_list_recipe_shortfalls(timestamptz)', 'execute'),
    'anon no ejecuta get_general_list_recipe_shortfalls';
  assert not has_function_privilege('anon', 'public.get_general_list_shortfall_snapshots(timestamptz)', 'execute'),
    'anon no ejecuta get_general_list_shortfall_snapshots';
  assert not has_function_privilege('anon', 'public.resolve_list_item_shortfall(uuid, text, uuid)', 'execute'),
    'anon no ejecuta resolve_list_item_shortfall';
  assert not has_function_privilege('anon', 'public.undo_shortfall_resolution_and_uncheck(uuid)', 'execute'),
    'anon no ejecuta undo_shortfall_resolution_and_uncheck';
  assert not has_function_privilege('anon', 'public.get_recipe_coverage_today(uuid, timestamptz)', 'execute'),
    'anon no ejecuta get_recipe_coverage_today';
  assert not has_function_privilege('authenticated', 'public.lock_visible_list_item(uuid)', 'execute'),
    'nadie llama a mano a lock_visible_list_item';
  assert not has_function_privilege('authenticated', 'public.clear_shortfall_resolution_on_uncheck()', 'execute'),
    'nadie llama a mano a la función del trigger';
  assert not has_table_privilege('authenticated', 'public.list_item_shortfall_snapshots', 'select'),
    'el cliente no lee las fotos directo';
end $$;

set local role authenticated;

-- ----------------------------------------------------------------------------
-- 2. Sin sesión: 42501.
-- ----------------------------------------------------------------------------

select set_config('request.jwt.claims', '{}', true);

do $$
begin
  begin
    perform * from public.get_general_list_recipe_shortfalls(date_trunc('day', now()));
    assert false, 'sin sesión se leyeron faltantes';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.resolve_list_item_shortfall(current_setting('tacha_test.item_1')::uuid, 'hadEnough');
    assert false, 'sin sesión se resolvió un faltante';
  exception
    when insufficient_privilege then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 3. Cuenta en vivo como A (regla 33).
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  small numeric := current_setting('tacha_test.small')::numeric;
  shortfall_rows jsonb;
begin
  select jsonb_agg(jsonb_build_array(s.recipe_name, s.quantity_missing, s.quantity_unit))
  into shortfall_rows
  from public.get_general_list_recipe_shortfalls(date_trunc('day', now())) s;

  assert shortfall_rows = jsonb_build_array(
    jsonb_build_array('Receta B SCRUM-115', small, 'ml'),
    jsonb_build_array('Receta A SCRUM-115', 100, 'g')
  ), format('A: avisos inesperados %s', shortfall_rows);

  -- Medianoche futura: lo tachado ahora queda "antes de hoy" y ya no cuenta.
  assert (
    select count(*) from public.get_general_list_recipe_shortfalls(now() + interval '5 minutes')
  ) = 0, 'lo tachado otro día no cuenta para el ciclo de hoy';

  begin
    perform * from public.get_general_list_recipe_shortfalls(now() - interval '3 days');
    assert false, 'una medianoche de hace días se aceptó';
  exception
    when invalid_parameter_value then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 4. Cobertura (SCRUM-98) como B: dice el mismo faltante que la lista.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  small numeric := current_setting('tacha_test.small')::numeric;
  coverage jsonb;
begin
  coverage := public.get_recipe_coverage_today(
    current_setting('tacha_test.recipe_b')::uuid,
    date_trunc('day', now())
  );

  assert coverage->0->>'reason' = 'short', format('cobertura: motivo inesperado %s', coverage);
  assert (coverage->0->>'missing_quantity')::numeric = small, format('cobertura: faltante inesperado %s', coverage);
end $$;

-- ----------------------------------------------------------------------------
-- 5. "Agregué otra igual" como B (receta de A en la lista de la familia):
--    3 → 4 chicas, la Receta B queda cubierta; queda solo el de g. Se guarda
--    la foto (3, chica).
-- ----------------------------------------------------------------------------

do $$
declare
  changed public.list_items;
begin
  changed := public.resolve_list_item_shortfall(current_setting('tacha_test.item_1')::uuid, 'sameAgain');
  assert changed.quantity_requested = 4, 'sameAgain sin compra suma a lo pedido';

  assert (
    select count(*) from public.get_general_list_recipe_shortfalls(date_trunc('day', now())) s
    where s.quantity_unit = 'ml'
  ) = 0, 'con 4 chicas la Receta B queda cubierta';

  assert (
    select s.previous_quantity_requested = 3
    from public.get_general_list_shortfall_snapshots(date_trunc('day', now())) s
    where s.list_item_id = current_setting('tacha_test.item_1')::uuid
  ), 'la foto guarda la cantidad de antes del panel';
end $$;

-- ----------------------------------------------------------------------------
-- 6. "Cambié a otra presentación": la grande. La foto no cambia (sigue 3 y la
--    chica). Otra presentación de otro producto o la misma se rechazan.
-- ----------------------------------------------------------------------------

do $$
declare
  changed public.list_items;
begin
  changed := public.resolve_list_item_shortfall(
    current_setting('tacha_test.item_1')::uuid,
    'otherPresentation',
    current_setting('tacha_test.variant_big')::uuid
  );
  assert changed.product_catalog_variant_id = current_setting('tacha_test.variant_big')::uuid,
    'la fila pasa a la presentación elegida';

  assert (
    select s.previous_quantity_requested = 3
    from public.get_general_list_shortfall_snapshots(date_trunc('day', now())) s
    where s.list_item_id = current_setting('tacha_test.item_1')::uuid
  ), 'elegir otra vez no reemplaza la foto';

  begin
    perform public.resolve_list_item_shortfall(
      current_setting('tacha_test.item_1')::uuid,
      'otherPresentation',
      current_setting('tacha_test.variant_q')::uuid
    );
    assert false, 'se aceptó una presentación de otro producto';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.resolve_list_item_shortfall(current_setting('tacha_test.item_1')::uuid, 'inventada');
    assert false, 'se aceptó una resolución desconocida';
  exception
    when invalid_parameter_value then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 7. Modo compra: "Agregué otra igual" suma a lo comprado en una compra
--    abierta; sobre una compra cerrada se rechaza.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  changed public.list_items;
begin
  changed := public.resolve_list_item_shortfall(current_setting('tacha_test.item_6')::uuid, 'sameAgain');
  assert changed.quantity_bought = 2 and changed.quantity_requested = 1,
    'en una compra abierta suma a lo comprado y no a lo pedido';

  begin
    perform public.resolve_list_item_shortfall(current_setting('tacha_test.item_5')::uuid, 'sameAgain');
    assert false, 'se resolvió sobre una compra cerrada';
  exception
    when insufficient_privilege then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 8. Deshacer y destachar como A: item1 vuelve a 3 × chica, pendiente, sin
--    foto; el aviso de la Receta B vuelve.
-- ----------------------------------------------------------------------------

do $$
declare
  small numeric := current_setting('tacha_test.small')::numeric;
  returned public.list_items;
begin
  returned := public.undo_shortfall_resolution_and_uncheck(current_setting('tacha_test.item_1')::uuid);

  assert returned.id = current_setting('tacha_test.item_1')::uuid, 'sin pendiente igual, vuelve la misma fila';
  assert returned.checked_at is null, 'la fila queda pendiente';
  assert returned.quantity_requested = 3, 'vuelve a la cantidad de antes del panel';
  assert returned.product_catalog_variant_id = current_setting('tacha_test.variant_small')::uuid,
    'vuelve a la presentación de antes del panel';

  assert not exists (
    select 1 from public.get_general_list_shortfall_snapshots(date_trunc('day', now()))
  ), 'deshacer borra la foto';

  assert (
    select s.quantity_missing = small
    from public.get_general_list_recipe_shortfalls(date_trunc('day', now())) s
    where s.quantity_unit = 'ml'
  ), 'el aviso de la Receta B vuelve con lo que falta';

  begin
    perform public.resolve_list_item_shortfall(current_setting('tacha_test.item_1')::uuid, 'hadEnough');
    assert false, 'se resolvió una fila pendiente';
  exception
    when invalid_parameter_value then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 9. "Ya tenía suficiente": tachar, descartar (0 avisos), destachar por la RPC
--    de la 035 (el trigger quita el descarte: los avisos vuelven).
-- ----------------------------------------------------------------------------

do $$
begin
  perform public.set_list_item_checked(current_setting('tacha_test.item_1')::uuid, true);
  perform public.resolve_list_item_shortfall(current_setting('tacha_test.item_1')::uuid, 'hadEnough');

  assert (
    select count(*) from public.get_general_list_recipe_shortfalls(date_trunc('day', now()))
  ) = 0, 'descartar quita los avisos de la fila';

  assert not exists (
    select 1 from public.get_general_list_shortfall_snapshots(date_trunc('day', now()))
  ), 'descartar no guarda foto (no cambia la fila)';

  perform public.set_list_item_checked(current_setting('tacha_test.item_1')::uuid, false);

  assert (
    select count(*) from public.get_general_list_recipe_shortfalls(date_trunc('day', now()))
  ) = 2, 'destachar quita el descarte y los avisos vuelven';
end $$;

-- ----------------------------------------------------------------------------
-- 10. E (fuera de la familia): no ve faltantes ni fotos de la familia, y no
--     puede resolver sus filas (P0002).
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert (
    select count(*) from public.get_general_list_recipe_shortfalls(date_trunc('day', now()))
  ) = 0, 'E no ve faltantes de la familia';

  begin
    perform public.resolve_list_item_shortfall(current_setting('tacha_test.item_6')::uuid, 'hadEnough');
    assert false, 'E resolvió una fila de la familia';
  exception
    when no_data_found then null;
  end;

  begin
    perform public.undo_shortfall_resolution_and_uncheck(current_setting('tacha_test.item_6')::uuid);
    assert false, 'E destachó una fila de la familia';
  exception
    when no_data_found then null;
  end;
end $$;

rollback;
