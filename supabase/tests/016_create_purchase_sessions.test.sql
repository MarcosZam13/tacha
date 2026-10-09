-- ============================================================================
-- Prueba de la migración 016 (SCRUM-67): sesiones de compra.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 016. Todo pasa dentro de una transacción que termina en
-- rollback: no deja usuarios, listas ni compras en la base compartida. Si una
-- regla no se cumple, un `assert` corta con su mensaje; si termina sin error,
-- pasó. Ejecutarlo completo, nunca por partes.
--
-- Dos usuarios: Ana compra; Beto intenta usar la compra de Ana.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño): dos usuarios, dos súper y una variante cualquiera.
-- ----------------------------------------------------------------------------

do $$
declare
  ana_id uuid := gen_random_uuid();
  beto_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, aud, role, email) values
    (ana_id, 'authenticated', 'authenticated', ana_id || '@prueba.tacha'),
    (beto_id, 'authenticated', 'authenticated', beto_id || '@prueba.tacha');

  perform set_config('tacha_test.ana_id', ana_id::text, true);
  perform set_config('tacha_test.beto_id', beto_id::text, true);
  perform set_config('tacha_test.store_a', (select id::text from public.stores order by slug limit 1), true);
  perform set_config('tacha_test.store_b', (select id::text from public.stores order by slug offset 1 limit 1), true);
  perform set_config('tacha_test.variant_id', (select id::text from public.product_catalog_variants order by id limit 1), true);
  perform set_config('request.jwt.claims', json_build_object('sub', ana_id, 'role', 'authenticated')::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Ana: iniciar, retomar, otro súper, día inválido.
-- ----------------------------------------------------------------------------

set local role authenticated;

do $$
declare
  store_a uuid := current_setting('tacha_test.store_a')::uuid;
  store_b uuid := current_setting('tacha_test.store_b')::uuid;
  day_start timestamptz := now() - interval '1 hour';
  first_session public.purchase_sessions;
  same_session public.purchase_sessions;
  other_session public.purchase_sessions;
begin
  first_session := public.start_purchase_session(store_a, day_start);
  assert first_session.owner_id = auth.uid() and first_session.closed_at is null, 'la compra nace abierta y es de quien la inicia';

  same_session := public.start_purchase_session(store_a, day_start);
  assert same_session.id = first_session.id, 'mismo súper el mismo día: se retoma (CA-05)';

  other_session := public.start_purchase_session(store_b, day_start);
  assert other_session.id <> first_session.id, 'otro súper: otra compra';

  begin
    perform public.start_purchase_session(store_a, now() - interval '3 days');
    assert false, 'un inicio de día de hace 3 días no es "hoy"';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    insert into public.purchase_sessions (store_id, household_id) values (store_a, gen_random_uuid());
    assert false, 'no se puede elegir household_id';
  exception
    when insufficient_privilege then null;
  end;

  perform set_config('tacha_test.session_id', first_session.id::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 2. Ana: tachar en la compra, ajustar lo comprado, destachar.
-- ----------------------------------------------------------------------------

do $$
declare
  session_id uuid := current_setting('tacha_test.session_id')::uuid;
  item public.list_items;
begin
  item := public.add_item_to_general_list(current_setting('tacha_test.variant_id')::uuid);
  perform public.change_item_quantity(item.id, 1);

  item := public.check_list_item_in_session(item.id, session_id);
  assert item.checked_at is not null and item.checked_by = auth.uid(), 'tachar en compra tacha (quién y cuándo, 015)';
  assert item.purchase_session_id = session_id, 'la fila queda en la compra';
  assert item.quantity_bought = 2, 'lo comprado arranca igual a lo pedido';

  item := public.change_bought_quantity(item.id, 1);
  assert item.quantity_bought = 3 and item.quantity_requested = 2, 'el +1 cambia lo comprado, no lo pedido';

  perform public.change_bought_quantity(item.id, -1);
  item := public.change_bought_quantity(item.id, -1);
  assert item.quantity_bought = 1, 'lo comprado baja hasta 1';

  begin
    perform public.change_bought_quantity(item.id, -1);
    assert false, 'lo comprado no baja de 1';
  exception
    when check_violation then null;
  end;

  item := public.set_list_item_checked(item.id, false);
  assert item.purchase_session_id is null and item.quantity_bought is null, 'destachar borra la compra y lo comprado';

  item := public.check_list_item_in_session(item.id, session_id);
  perform set_config('tacha_test.item_id', item.id::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 3. Beto: no ve la compra de Ana ni puede colgar una fila suya de ella.
-- ----------------------------------------------------------------------------

reset role;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.beto_id'), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

do $$
declare
  ana_session uuid := current_setting('tacha_test.session_id')::uuid;
  beto_item public.list_items;
begin
  assert not exists (select 1 from public.purchase_sessions where id = ana_session), 'Beto no ve la compra de Ana';

  beto_item := public.add_item_to_general_list(current_setting('tacha_test.variant_id')::uuid);

  begin
    perform public.check_list_item_in_session(beto_item.id, ana_session);
    assert false, 'Beto no puede tachar dentro de la compra de Ana';
  exception
    when insufficient_privilege then null;
  end;

  -- El mismo intento por PATCH directo (grant de columna): lo frena el trigger.
  begin
    update public.list_items
    set checked_at = now(), purchase_session_id = ana_session, quantity_bought = 1
    where id = beto_item.id;
    assert false, 'tampoco por un update directo';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.close_purchase_session(ana_session, 1000);
    assert false, 'Beto no puede cerrar la compra de Ana';
  exception
    when no_data_found then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 4. Ana: cerrar con el total; una compra cerrada no acepta más.
-- ----------------------------------------------------------------------------

reset role;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.ana_id'), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

do $$
declare
  session_id uuid := current_setting('tacha_test.session_id')::uuid;
  item_id uuid := current_setting('tacha_test.item_id')::uuid;
  closed_session public.purchase_sessions;
  reopened public.purchase_sessions;
begin
  begin
    perform public.close_purchase_session(session_id, -5);
    assert false, 'un total negativo no se acepta';
  exception
    when check_violation then null;
  end;

  closed_session := public.close_purchase_session(session_id, 12500);
  assert closed_session.closed_at is not null and closed_session.total_amount = 12500, 'cerrar guarda la hora y el total';

  begin
    perform public.close_purchase_session(session_id, null);
    assert false, 'una compra cerrada no se cierra otra vez';
  exception
    when no_data_found then null;
  end;

  begin
    perform public.change_bought_quantity(item_id, 1);
    assert false, 'lo comprado no cambia en una compra cerrada';
  exception
    when no_data_found then null;
  end;

  reopened := public.start_purchase_session(closed_session.store_id, now() - interval '1 hour');
  assert reopened.id <> session_id, 'con la compra cerrada, iniciar otra vez crea una nueva';
end $$;

reset role;

rollback;
