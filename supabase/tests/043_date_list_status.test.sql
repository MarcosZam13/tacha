-- ============================================================================
-- Prueba de la migración 043 (SCRUM-78): estado de una sublista.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño), después de aplicar 043.
-- Transacción con rollback: no deja nada en la base compartida.
--
-- Datos: A y B en una familia, C sin familia.
--
-- Casos:
--   1. Sin productos sigue activa.
--   2. Con un producto pendiente sigue activa.
--   3. Al tachar el último pasa a completada, y B (la familia) también la completa.
--   4. Destachar la devuelve a activa.
--   5. Agregar a una completada se puede y la reabre.
--   6. Eliminar el último pendiente, si los demás están tachados, la completa.
--   7. Eliminar todos los productos la deja activa.
--   8. Cambiar la cantidad no toca el estado.
--   9. Cancelar: no borra los productos, y tachar no le cambia el estado.
--  10. No se puede agregar a una cancelada.
--  11. Reactivar recalcula: con todo tachado vuelve completada.
--  12. C no puede cancelar una sublista ajena, y anon no puede ejecutar la RPC.
--  13. La lista general no cambia de estado.
-- ============================================================================

begin;

do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  user_c uuid := gen_random_uuid();
  household_1 uuid := gen_random_uuid();
  variant_1 uuid;
  variant_2 uuid;
  family_list public.lists;
  general_list_id uuid;
  item_1 public.list_items;
  item_2 public.list_items;
  current_status text;
  item_count integer;
  was_rejected boolean;

begin
  select v.id into variant_1 from public.product_catalog_variants v order by v.id limit 1;
  select v.id into variant_2 from public.product_catalog_variants v order by v.id offset 1 limit 1;
  if variant_2 is null then
    raise exception 'Hacen falta 2 variantes en el catálogo para esta prueba';
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
  select status into current_status from public.lists where id = family_list.id;
  assert current_status = 'active', 'caso 1: sin productos debe seguir activa';

  -- 2
  item_1 := public.add_item_to_date_list(family_list.id, variant_1);
  item_2 := public.add_item_to_date_list(family_list.id, variant_2);
  select status into current_status from public.lists where id = family_list.id;
  assert current_status = 'active', 'caso 2: con pendientes debe seguir activa';

  -- 3: A tacha uno, B tacha el último
  perform public.set_list_item_checked(item_1.id, true);
  select status into current_status from public.lists where id = family_list.id;
  assert current_status = 'active', 'caso 3: falta uno, debe seguir activa';

  perform set_config('request.jwt.claim.sub', user_b::text, true);
  perform public.set_list_item_checked(item_2.id, true);
  select status into current_status from public.lists where id = family_list.id;
  assert current_status = 'completed', 'caso 3: con todo tachado debe quedar completada';

  -- 4
  perform public.set_list_item_checked(item_2.id, false);
  select status into current_status from public.lists where id = family_list.id;
  assert current_status = 'active', 'caso 4: destachar debe devolverla a activa';

  perform public.set_list_item_checked(item_2.id, true);

  -- 5: la misma variante, ya tachada, crea una fila pendiente nueva
  item_2 := public.add_item_to_date_list(family_list.id, variant_2);
  select status into current_status from public.lists where id = family_list.id;
  assert current_status = 'active', 'caso 5: agregar a una completada debe reabrirla';

  -- 6
  delete from public.list_items where id = item_2.id;
  select status into current_status from public.lists where id = family_list.id;
  assert current_status = 'completed', 'caso 6: sin pendientes debe quedar completada';

  -- 7
  delete from public.list_items where list_id = family_list.id;
  select status into current_status from public.lists where id = family_list.id;
  assert current_status = 'active', 'caso 7: sin productos debe volver a activa';

  -- 8
  item_1 := public.add_item_to_date_list(family_list.id, variant_1);
  perform public.set_list_item_checked(item_1.id, true);
  update public.list_items set quantity_requested = 5 where id = item_1.id;
  select status into current_status from public.lists where id = family_list.id;
  assert current_status = 'completed', 'caso 8: la cantidad no debe tocar el estado';

  -- 9
  item_2 := public.add_item_to_date_list(family_list.id, variant_2);
  perform public.set_date_list_cancelled(family_list.id, true);
  select count(*) into item_count from public.list_items where list_id = family_list.id;
  assert item_count = 2, 'caso 9: cancelar no debe borrar los productos';
  perform public.set_list_item_checked(item_2.id, true);
  select status into current_status from public.lists where id = family_list.id;
  assert current_status = 'cancelled', 'caso 9: tachar no debe cambiar una cancelada';

  -- 10
  was_rejected := false;
  begin
    perform public.add_item_to_date_list(family_list.id, variant_2);
  exception when sqlstate 'P0002' then
    was_rejected := true;
  end;
  assert was_rejected, 'caso 10: no se debe poder agregar a una cancelada';

  -- 11: todo quedó tachado mientras estaba cancelada
  perform public.set_date_list_cancelled(family_list.id, false);
  select status into current_status from public.lists where id = family_list.id;
  assert current_status = 'completed', 'caso 11: reactivar debe recalcular el estado';

  -- 12
  perform set_config('request.jwt.claim.sub', user_c::text, true);
  was_rejected := false;
  begin
    perform public.set_date_list_cancelled(family_list.id, true);
  exception when sqlstate 'P0002' then
    was_rejected := true;
  end;
  assert was_rejected, 'caso 12: C no debe poder cancelar una sublista ajena';
  assert not has_function_privilege('anon', 'public.set_date_list_cancelled(uuid, boolean)', 'execute'),
    'caso 12: anon no debe poder ejecutar la RPC';
  assert not has_function_privilege('authenticated', 'public.date_list_status_from_items(uuid)', 'execute'),
    'caso 12: la función interna no debe estar expuesta';

  -- 13
  general_list_id := public.ensure_general_list_id();
  item_1 := public.add_item_to_general_list(variant_1);
  perform public.set_list_item_checked(item_1.id, true);
  select status into current_status from public.lists where id = item_1.list_id;
  assert current_status = 'active', 'caso 13: la general no debe completarse';

  raise notice 'OK: los 13 casos pasaron';
end;
$$;

rollback;
