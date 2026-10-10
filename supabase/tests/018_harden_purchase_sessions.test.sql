-- ============================================================================
-- Prueba de la migración 018 (SCRUM-67): compras endurecidas.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 018. Todo pasa dentro de una transacción que termina en
-- rollback: no deja datos. Si una regla no se cumple, un `assert` corta con
-- su mensaje; si termina sin error, pasó. Ejecutarlo completo, nunca por partes.
-- ============================================================================

begin;

do $$
declare
  test_user uuid := gen_random_uuid();
begin
  insert into auth.users (id, aud, role, email)
  values (test_user, 'authenticated', 'authenticated', test_user || '@prueba.tacha');
  perform set_config('tacha_test.store_id', (select id::text from public.stores order by slug limit 1), true);
  perform set_config('tacha_test.variant_id', (select id::text from public.product_catalog_variants order by id limit 1), true);
  perform set_config('request.jwt.claims', json_build_object('sub', test_user, 'role', 'authenticated')::text, true);
end $$;

set local role authenticated;

do $$
declare
  store_id uuid := current_setting('tacha_test.store_id')::uuid;
  open_session public.purchase_sessions;
  closed_session public.purchase_sessions;
  other_session public.purchase_sessions;
  item public.list_items;
begin
  -- 2. closed_at lo pone la base aunque un PATCH mande otra fecha.
  open_session := public.start_purchase_session(store_id, now() - interval '1 hour');
  update public.purchase_sessions set closed_at = '1990-01-01' where id = open_session.id
  returning * into closed_session;
  assert closed_session.closed_at = now(), 'el cierre lleva la hora de la base, no la del cliente';

  -- 4. Sin NaN.
  other_session := public.start_purchase_session(store_id, now() - interval '1 hour');
  begin
    perform public.close_purchase_session(other_session.id, 'NaN'::numeric);
    assert false, 'NaN no es un total';
  exception when check_violation then null;
  end;

  -- 3. Una fila de una compra cerrada no cambia lo comprado ni pasa a otra compra.
  item := public.add_item_to_general_list(current_setting('tacha_test.variant_id')::uuid);
  item := public.check_list_item_in_session(item.id, other_session.id);
  perform public.close_purchase_session(other_session.id, 5000);

  begin
    update public.list_items set quantity_bought = 99 where id = item.id;
    assert false, 'lo comprado de una compra cerrada no cambia por PATCH';
  exception when insufficient_privilege then null;
  end;

  open_session := public.start_purchase_session(store_id, now() - interval '1 hour');
  begin
    update public.list_items set purchase_session_id = open_session.id where id = item.id;
    assert false, 'una fila de una compra cerrada no se pasa a otra compra';
  exception when insufficient_privilege then null;
  end;

  -- ...pero volver a añadirla la reabre (regla 8 de SCRUM-66) y la saca de la compra.
  item := public.add_item_to_general_list(current_setting('tacha_test.variant_id')::uuid);
  assert item.checked_at is null and item.purchase_session_id is null and item.quantity_bought is null,
    'volver a añadir lo comprado en una compra cerrada sigue funcionando';

  -- Queda tachada en la compra abierta para el paso 1.
  item := public.check_list_item_in_session(item.id, open_session.id);
  perform set_config('tacha_test.session_id', open_session.id::text, true);
  perform set_config('tacha_test.item_id', item.id::text, true);
end $$;

reset role;

-- 1. Borrar una compra con filas compradas ya no falla: lo comprado se va con ella.
delete from public.purchase_sessions where id = current_setting('tacha_test.session_id')::uuid;

do $$
declare
  item public.list_items;
begin
  select * into item from public.list_items where id = current_setting('tacha_test.item_id')::uuid;
  assert item.purchase_session_id is null and item.quantity_bought is null,
    'al borrar la compra, la fila queda sin compra y sin lo comprado';
  assert item.checked_at is not null, 'la fila sigue tachada';
end $$;

rollback;
