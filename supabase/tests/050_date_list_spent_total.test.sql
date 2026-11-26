-- ============================================================================
-- Prueba de la migración 050 (SCRUM-79): total de gasto de una sublista.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño), después de aplicar 050.
-- Transacción con rollback: no deja nada en la base compartida.
--
-- Datos: A y B en una familia, C sin familia.
--
-- Casos:
--   1. Una sublista nueva empieza sin total.
--   2. A guarda un total, y B (la familia) lo cambia.
--   3. ₡0 es un total válido.
--   4. Montos inválidos: nulo, negativo, con decimales, NaN y mayor al máximo.
--   5. C no puede cambiar el total de una sublista ajena (P0002).
--   6. Una sublista que no existe da el mismo error (P0002).
--   7. Una cancelada conserva su total y no lo cambia (55000); reactivada, sí.
--   8. Una completada sí lo cambia.
--   9. La lista general no acepta total, ni por la RPC ni por el check.
--  10. Sin sesión se rechaza (42501); anon no puede ejecutar la RPC.
-- ============================================================================

begin;

do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  user_c uuid := gen_random_uuid();
  household_1 uuid := gen_random_uuid();
  variant_1 uuid;
  family_list public.lists;
  saved_list public.lists;
  item_1 public.list_items;
  general_list_id uuid;
  invalid_total numeric;
  was_rejected boolean;
  error_code text;
begin
  select v.id into variant_1 from public.product_catalog_variants v order by v.id limit 1;
  if variant_1 is null then
    raise exception 'Hace falta una variante en el catálogo para esta prueba';
  end if;

  insert into auth.users (id, aud, role, email)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha'),
    (user_c, 'authenticated', 'authenticated', user_c || '@prueba.tacha');
  insert into public.households (id, name) values (household_1, 'Familia de prueba');
  insert into public.household_members (household_id, user_id, role)
  values (household_1, user_a, 'admin'), (household_1, user_b, 'member');

  perform set_config('request.jwt.claim.sub', user_a::text, true);
  family_list := public.create_date_list('Paseo', date '2030-01-15');

  -- 1
  assert family_list.spent_total is null, 'caso 1: una sublista nueva debe empezar sin total';

  -- 2
  saved_list := public.set_date_list_total(family_list.id, 12500);
  assert saved_list.spent_total = 12500, 'caso 2: A debe poder guardar el total';
  perform set_config('request.jwt.claim.sub', user_b::text, true);
  saved_list := public.set_date_list_total(family_list.id, 13000);
  assert saved_list.spent_total = 13000, 'caso 2: B, de la familia, debe poder cambiarlo';

  -- 3
  saved_list := public.set_date_list_total(family_list.id, 0);
  assert saved_list.spent_total = 0, 'caso 3: ₡0 debe ser válido';

  -- 4
  foreach invalid_total in array array[null, -1, 10.5, 'NaN'::numeric, 10000000000]::numeric[] loop
    begin
      perform public.set_date_list_total(family_list.id, invalid_total);
      was_rejected := false;
    exception when sqlstate '22023' then
      was_rejected := true;
    end;
    assert was_rejected, 'caso 4: el monto ' || coalesce(invalid_total::text, 'nulo') || ' debe rechazarse';
  end loop;
  assert (select spent_total from public.lists where id = family_list.id) = 0,
    'caso 4: un monto inválido no debe cambiar el total guardado';

  -- 5
  perform set_config('request.jwt.claim.sub', user_c::text, true);
  begin
    perform public.set_date_list_total(family_list.id, 500);
    error_code := null;
  exception when others then
    error_code := sqlstate;
  end;
  assert error_code = 'P0002', 'caso 5: C no debe cambiar una sublista ajena, dio ' || coalesce(error_code, 'sin error');

  -- 6
  begin
    perform public.set_date_list_total(gen_random_uuid(), 500);
    error_code := null;
  exception when others then
    error_code := sqlstate;
  end;
  assert error_code = 'P0002', 'caso 6: una sublista inexistente debe dar P0002, dio ' || coalesce(error_code, 'sin error');

  -- 7
  perform set_config('request.jwt.claim.sub', user_a::text, true);
  perform public.set_date_list_total(family_list.id, 8000);
  perform public.set_date_list_cancelled(family_list.id, true);
  begin
    perform public.set_date_list_total(family_list.id, 9000);
    error_code := null;
  exception when others then
    error_code := sqlstate;
  end;
  assert error_code = '55000', 'caso 7: una cancelada no debe cambiar su total, dio ' || coalesce(error_code, 'sin error');
  assert (select spent_total from public.lists where id = family_list.id) = 8000,
    'caso 7: una cancelada debe conservar su total';
  perform public.set_date_list_cancelled(family_list.id, false);
  saved_list := public.set_date_list_total(family_list.id, 9000);
  assert saved_list.spent_total = 9000, 'caso 7: reactivada debe poder cambiarlo';

  -- 8
  item_1 := public.add_item_to_date_list(family_list.id, variant_1);
  perform public.set_list_item_checked(item_1.id, true);
  assert (select status from public.lists where id = family_list.id) = 'completed',
    'caso 8: con todo tachado debe estar completada';
  saved_list := public.set_date_list_total(family_list.id, 9500);
  assert saved_list.spent_total = 9500, 'caso 8: una completada debe poder cambiar su total';

  -- 9
  general_list_id := public.ensure_general_list_id();
  begin
    perform public.set_date_list_total(general_list_id, 500);
    error_code := null;
  exception when others then
    error_code := sqlstate;
  end;
  assert error_code = 'P0002', 'caso 9: la lista general no debe aceptar total por la RPC, dio ' || coalesce(error_code, 'sin error');
  begin
    update public.lists set spent_total = 500 where id = general_list_id;
    error_code := null;
  exception when others then
    error_code := sqlstate;
  end;
  assert error_code = '23514', 'caso 9: el check debe impedir un total en la lista general, dio ' || coalesce(error_code, 'sin error');

  -- 10
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform public.set_date_list_total(family_list.id, 500);
    error_code := null;
  exception when others then
    error_code := sqlstate;
  end;
  assert error_code = '42501', 'caso 10: sin sesión debe dar 42501, dio ' || coalesce(error_code, 'sin error');
  assert not has_function_privilege('anon', 'public.set_date_list_total(uuid, numeric)', 'execute'),
    'caso 10: anon no debe poder ejecutar la RPC';
  assert has_function_privilege('authenticated', 'public.set_date_list_total(uuid, numeric)', 'execute'),
    'caso 10: authenticated debe poder ejecutar la RPC';

  raise notice '050: 10 casos OK';
end;
$$;

rollback;
