-- ============================================================================
-- Prueba de la migración 038 (SCRUM-77): sublistas por fecha.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño), después de aplicar 038.
-- Transacción con rollback: no deja nada en la base compartida.
--
-- Datos: A y B en una familia, C sin familia.
--
-- Casos:
--   1. A crea: la sublista queda en su familia, activa, con el nombre recortado.
--   2. B (misma familia) la ve y le agrega; C no la ve ni le puede agregar.
--   3. C crea: la sublista es personal y A no la ve.
--   4. Agregar la misma variante suma 1, no crea otra fila.
--   5. Nombre vacío, nombre de 61 caracteres y fecha nula: 22023.
--   6. No se puede agregar a la lista general por esta RPC, ni a una cancelada.
--   7. El check rechaza una sublista sin fecha y una general con nombre.
--   8. La inserción directa de una sublista sigue cerrada (42501).
--   9. anon no puede ejecutar las funciones.
-- ============================================================================

begin;

do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  user_c uuid := gen_random_uuid();
  household_1 uuid := gen_random_uuid();
  variant_1 uuid := (select v.id from public.product_catalog_variants v order by v.id limit 1);
  family_list public.lists;
  personal_list public.lists;
  general_list_id uuid;
  first_item public.list_items;
  second_item public.list_items;
  visible_count integer;
  failed_with text;
begin
  if variant_1 is null then
    raise exception 'Hace falta una variante en el catálogo para esta prueba';
  end if;

  insert into auth.users (id, aud, role, email)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha'),
    (user_c, 'authenticated', 'authenticated', user_c || '@prueba.tacha');

  insert into public.households (id, name) values (household_1, 'Familia SCRUM-77');
  insert into public.household_members (user_id, household_id, role)
  values (user_a, household_1, 'admin'), (user_b, household_1, 'member');

  -- 1. A crea en su familia.
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  family_list := public.create_date_list('  Paseo a la playa  ', date '2026-12-20');
  assert family_list.household_id = household_1, '1: no quedó en la familia';
  assert family_list.owner_id = user_a, '1: el dueño no es A';
  assert family_list.status = 'active', '1: no quedó activa';
  assert family_list.name = 'Paseo a la playa', '1: no recortó el nombre';
  assert family_list.event_date = date '2026-12-20', '1: fecha distinta';

  -- 4. Agregar dos veces suma.
  first_item := public.add_item_to_date_list(family_list.id, variant_1);
  second_item := public.add_item_to_date_list(family_list.id, variant_1);
  assert first_item.id = second_item.id, '4: creó otra fila';
  assert second_item.quantity_requested = 2, '4: no sumó';

  -- 5. Validaciones.
  begin
    perform public.create_date_list('   ', date '2026-12-20');
    failed_with := 'ok';
  exception when others then failed_with := sqlstate;
  end;
  assert failed_with = '22023', '5: nombre vacío dio ' || failed_with;

  begin
    perform public.create_date_list(repeat('a', 61), date '2026-12-20');
    failed_with := 'ok';
  exception when others then failed_with := sqlstate;
  end;
  assert failed_with = '22023', '5: nombre largo dio ' || failed_with;

  begin
    perform public.create_date_list('Sin fecha', null);
    failed_with := 'ok';
  exception when others then failed_with := sqlstate;
  end;
  assert failed_with = '22023', '5: fecha nula dio ' || failed_with;

  -- 6. No sirve para la lista general.
  general_list_id := public.ensure_general_list_id();
  begin
    perform public.add_item_to_date_list(general_list_id, variant_1);
    failed_with := 'ok';
  exception when others then failed_with := sqlstate;
  end;
  assert failed_with = 'P0002', '6: lista general dio ' || failed_with;

  -- 8. Inserción directa cerrada.
  begin
    insert into public.lists (owner_id, type, name, event_date)
    values (user_a, 'date', 'Directa', date '2026-12-20');
    failed_with := 'ok';
  exception when others then failed_with := sqlstate;
  end;
  assert failed_with = '42501', '8: insert directo dio ' || failed_with;

  -- 2. B (misma familia) la ve y agrega.
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', user_b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into visible_count from public.lists where id = family_list.id;
  assert visible_count = 1, '2: B no ve la sublista';
  second_item := public.add_item_to_date_list(family_list.id, variant_1);
  assert second_item.quantity_requested = 3, '2: B no pudo agregar';

  -- 2 y 3. C no la ve y crea una personal.
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', user_c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into visible_count from public.lists where id = family_list.id;
  assert visible_count = 0, '2: C ve la sublista de la familia';
  begin
    perform public.add_item_to_date_list(family_list.id, variant_1);
    failed_with := 'ok';
  exception when others then failed_with := sqlstate;
  end;
  assert failed_with = 'P0002', '2: C agregando dio ' || failed_with;

  personal_list := public.create_date_list('Cumple', date '2026-12-24');
  assert personal_list.household_id is null, '3: no quedó personal';

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into visible_count from public.lists where id = personal_list.id;
  assert visible_count = 0, '3: A ve la sublista personal de C';

  -- 6. Cancelada.
  execute 'reset role';
  update public.lists set status = 'cancelled' where id = personal_list.id;
  perform set_config('request.jwt.claims', json_build_object('sub', user_c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.add_item_to_date_list(personal_list.id, variant_1);
    failed_with := 'ok';
  exception when others then failed_with := sqlstate;
  end;
  assert failed_with = 'P0002', '6: cancelada dio ' || failed_with;
  execute 'reset role';

  -- 7. El check.
  begin
    insert into public.lists (owner_id, type, name) values (user_c, 'date', 'Sin fecha');
    failed_with := 'ok';
  exception when others then failed_with := sqlstate;
  end;
  assert failed_with = '23514', '7: sublista sin fecha dio ' || failed_with;

  begin
    insert into public.lists (owner_id, type, name) values (user_c, 'private', 'Con nombre');
    failed_with := 'ok';
  exception when others then failed_with := sqlstate;
  end;
  assert failed_with = '23514', '7: privada con nombre dio ' || failed_with;

  -- 9. anon.
  assert not has_function_privilege('anon', 'public.create_date_list(text, date)', 'execute'),
    '9: anon puede crear';
  assert not has_function_privilege('anon', 'public.add_item_to_date_list(uuid, uuid)', 'execute'),
    '9: anon puede agregar';
end;
$$;

rollback;
