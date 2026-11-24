-- ============================================================================
-- Prueba de la migración 047 (SCRUM-108): el "encargado" por lista.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 047. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios, familias, listas ni ajustes en la base
-- compartida. Si una regla no se cumple, un `assert` corta con su mensaje; si
-- termina sin error, pasó. Contra la base sin 047 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- Solo cuenta filas de sus propios usuarios y listas: en la base compartida
-- puede haber datos reales.
--
-- Qué comprueba (features/list-settings/specs/SPEC.md §13):
--   1. permisos de las tablas, de las RPC y de las funciones internas; RLS;
--   2. sin sesión: 42501, sin cambios;
--   3. el ajuste: apagado por defecto, encender, apagar, una sola fila y por lista;
--   4. aislamiento: quien no ve la lista no la configura, ni ve sus candidatos
--      ni asigna; un integrante sí (D2);
--   5. candidatos: la familia (también para un integrante que no es admin), la
--      dueña sola en una lista personal, y nunca el correo;
--   6. asignar: a un integrante, quitar, a alguien sin acceso (22023), producto
--      ajeno, producto tachado, y que solo cambia assigned_to;
--   7. apagar el ajuste no borra a los encargados (CA-03);
--   8. el cliente no escribe list_settings ni assigned_to directo;
--   9. el respaldo de la base: SQL manual con un encargado sin acceso falla;
--  10. salir de la familia: deja de ser candidato y el dato no se reescribe (regla 8);
--  11. borrar la cuenta del encargado deja assigned_to en null;
--  12. borrar la lista borra su ajuste.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Ayudas. Los ids viajan entre pasos en variables de la transacción
-- (set_config(..., true)), como en las pruebas de 040 y 024.
-- ----------------------------------------------------------------------------

-- Cambia de usuario: se llama con el rol dueño, antes de `set local role`.
create function pg_temp.as_user(user_key text)
returns void
language sql
as $$
  select set_config(
    'request.jwt.claims',
    json_build_object('sub', current_setting('tacha_test.' || user_key), 'role', 'authenticated')::text,
    true
  );
$$;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño).
--    A: admin de la familia, "Ana". B: integrante, sin nombre. C: sin familia,
--    con su lista personal, "Caro". D: sin familia y sin listas, "Dani".
--    Listas: la general de la familia, una sublista de la familia y la general
--    personal de C.
-- ----------------------------------------------------------------------------
do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  user_c uuid := gen_random_uuid();
  user_d uuid := gen_random_uuid();
  household_1 uuid := gen_random_uuid();
  family_list uuid := gen_random_uuid();
  family_date_list uuid := gen_random_uuid();
  personal_list uuid := gen_random_uuid();
  item_family uuid := gen_random_uuid();
  item_family_checked uuid := gen_random_uuid();
  item_personal uuid := gen_random_uuid();
  variant_ids uuid[];
begin
  select array_agg(v.id order by v.id) into variant_ids
  from (select v.id from public.product_catalog_variants v order by v.id limit 3) v;

  if coalesce(array_length(variant_ids, 1), 0) < 3 then
    raise exception 'Hacen falta al menos 3 variantes en product_catalog_variants para esta prueba';
  end if;

  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha', '{"name": "Ana"}'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha', '{}'),
    (user_c, 'authenticated', 'authenticated', user_c || '@prueba.tacha', '{"name": "Caro"}'),
    (user_d, 'authenticated', 'authenticated', user_d || '@prueba.tacha', '{"name": "Dani"}');

  insert into public.households (id, name) values (household_1, 'Familia SCRUM-108');

  insert into public.household_members (user_id, household_id, role)
  values (user_a, household_1, 'admin'), (user_b, household_1, 'member');

  insert into public.lists (id, owner_id, household_id, type)
  values (family_list, user_a, household_1, 'general'), (personal_list, user_c, null, 'general');

  insert into public.lists (id, owner_id, household_id, type, name, event_date)
  values (family_date_list, user_a, household_1, 'date', 'Cumple SCRUM-108', date '2099-12-20');

  insert into public.list_items (id, list_id, product_catalog_variant_id, quantity_requested)
  values (item_family, family_list, variant_ids[1], 2), (item_personal, personal_list, variant_ids[1], 1);

  insert into public.list_items (id, list_id, product_catalog_variant_id, quantity_requested, checked_at)
  values (item_family_checked, family_list, variant_ids[2], 1, now());

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_b', user_b::text, true);
  perform set_config('tacha_test.user_c', user_c::text, true);
  perform set_config('tacha_test.user_d', user_d::text, true);
  perform set_config('tacha_test.family_list', family_list::text, true);
  perform set_config('tacha_test.family_date_list', family_date_list::text, true);
  perform set_config('tacha_test.personal_list', personal_list::text, true);
  perform set_config('tacha_test.item_family', item_family::text, true);
  perform set_config('tacha_test.item_family_checked', item_family_checked::text, true);
  perform set_config('tacha_test.item_personal', item_personal::text, true);
  perform set_config('tacha_test.variant_3', variant_ids[3]::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos, RLS y funciones internas (rol dueño: solo lee el catálogo).
-- ----------------------------------------------------------------------------
do $$
declare
  rpc text;
  internal_function text;
  table_privilege text;
begin
  assert to_regclass('public.list_settings') is not null, '047 no está aplicada: falta list_settings';
  assert (select c.relrowsecurity from pg_class c where c.oid = 'public.list_settings'::regclass),
    'list_settings tiene que tener RLS activada';

  assert not has_table_privilege('anon', 'public.list_settings', 'select'), 'anon no lee list_settings';
  assert has_table_privilege('authenticated', 'public.list_settings', 'select'), 'authenticated lee list_settings';

  foreach table_privilege in array array['insert', 'update', 'delete'] loop
    assert not has_table_privilege('authenticated', 'public.list_settings', table_privilege),
      format('authenticated no puede %s en list_settings', table_privilege);
    assert not has_table_privilege('anon', 'public.list_settings', table_privilege),
      format('anon no puede %s en list_settings', table_privilege);
  end loop;

  assert not has_column_privilege('authenticated', 'public.list_items', 'assigned_to', 'update'),
    'el cliente no puede actualizar assigned_to';

  foreach rpc in array array[
    'public.set_list_assignee_enabled(uuid, boolean)',
    'public.get_list_assignee_candidates(uuid)',
    'public.set_list_item_assignee(uuid, uuid)'
  ] loop
    assert not has_function_privilege('anon', rpc, 'execute'), format('anon no ejecuta %s', rpc);
    assert has_function_privilege('authenticated', rpc, 'execute'), format('authenticated ejecuta %s', rpc);
  end loop;

  foreach internal_function in array array[
    'public.list_grants_access(uuid, uuid)',
    'public.check_list_item_assignee()'
  ] loop
    assert not has_function_privilege('anon', internal_function, 'execute'),
      format('anon no ejecuta %s', internal_function);
    assert not has_function_privilege('authenticated', internal_function, 'execute'),
      format('authenticated no ejecuta %s', internal_function);
  end loop;

  -- El correo nunca sale: la función devuelve solo estas tres columnas.
  assert pg_get_function_result('public.get_list_assignee_candidates(uuid)'::regprocedure)
    = 'TABLE(user_id uuid, display_name text, is_current_user boolean)',
    'get_list_assignee_candidates devuelve columnas de más (¿el correo?)';
end $$;

-- ----------------------------------------------------------------------------
-- 2. Sin sesión: 42501 y nada cambia. La sesión va antes que los parámetros,
--    para no revelar qué es válido.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{}', true);
set local role authenticated;

do $$
begin
  begin
    perform * from public.set_list_assignee_enabled(current_setting('tacha_test.family_list')::uuid, true);
    assert false, 'sin sesión se pudo cambiar el ajuste';
  exception when insufficient_privilege then null;
  end;

  begin
    perform * from public.get_list_assignee_candidates(current_setting('tacha_test.family_list')::uuid);
    assert false, 'sin sesión se pudieron ver los candidatos';
  exception when insufficient_privilege then null;
  end;

  begin
    perform * from public.set_list_item_assignee(current_setting('tacha_test.item_family')::uuid, current_setting('tacha_test.user_a')::uuid);
    assert false, 'sin sesión se pudo elegir un encargado';
  exception when insufficient_privilege then null;
  end;

  begin
    perform * from public.set_list_assignee_enabled(null, null);
    assert false, 'sin sesión se validaron los parámetros primero';
  exception when insufficient_privilege then null;
  end;

  assert (select count(*) from public.list_settings) = 0, 'sin sesión no se ve ningún ajuste';
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 3. El ajuste (A, admin de la familia): apagado por defecto, encender, apagar,
--    una sola fila, y por lista.
-- ----------------------------------------------------------------------------
select pg_temp.as_user('user_a');
set local role authenticated;

do $$
declare
  saved public.list_settings;
begin
  assert not exists (select 1 from public.list_settings where list_id = current_setting('tacha_test.family_list')::uuid),
    'una lista nueva no tiene fila: cuenta como apagada';

  select * into saved from public.set_list_assignee_enabled(current_setting('tacha_test.family_list')::uuid, true);
  assert saved.list_id = current_setting('tacha_test.family_list')::uuid and saved.assignee_enabled, 'encender devuelve el ajuste encendido';
  assert (select assignee_enabled from public.list_settings where list_id = current_setting('tacha_test.family_list')::uuid),
    'el ajuste quedó guardado encendido';

  select * into saved from public.set_list_assignee_enabled(current_setting('tacha_test.family_list')::uuid, false);
  assert not saved.assignee_enabled, 'apagar devuelve el ajuste apagado';
  assert (select count(*) from public.list_settings where list_id = current_setting('tacha_test.family_list')::uuid) = 1,
    'encender y apagar usa una sola fila';

  perform * from public.set_list_assignee_enabled(current_setting('tacha_test.family_list')::uuid, true);
  assert (select count(*) from public.list_settings where list_id = current_setting('tacha_test.family_list')::uuid) = 1,
    'volver a encender sigue siendo una sola fila';

  assert not exists (select 1 from public.list_settings where list_id = current_setting('tacha_test.family_date_list')::uuid),
    'el ajuste de una lista no toca el de otra';

  perform * from public.set_list_assignee_enabled(current_setting('tacha_test.family_date_list')::uuid, true);
  assert (select count(*) from public.list_settings
    where list_id in (current_setting('tacha_test.family_list')::uuid, current_setting('tacha_test.family_date_list')::uuid)) = 2,
    'cada lista tiene su propia fila';
  perform * from public.set_list_assignee_enabled(current_setting('tacha_test.family_date_list')::uuid, false);
  assert (select assignee_enabled from public.list_settings where list_id = current_setting('tacha_test.family_list')::uuid),
    'apagar la sublista no apaga la lista general';

  begin
    perform * from public.set_list_assignee_enabled(null, true);
    assert false, 'se aceptó una lista nula';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform * from public.set_list_assignee_enabled(current_setting('tacha_test.family_list')::uuid, null);
    assert false, 'se aceptó un valor nulo';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform * from public.set_list_assignee_enabled(gen_random_uuid(), true);
    assert false, 'se aceptó una lista que no existe';
  exception when no_data_found then null;
  end;
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 4. Aislamiento. B (integrante) puede ver y cambiar el ajuste (D2). C y D, que
--    no son de la familia, no ven la lista: no la configuran, ni ven sus
--    candidatos, ni asignan, ni leen su ajuste.
-- ----------------------------------------------------------------------------
select pg_temp.as_user('user_b');
set local role authenticated;

do $$
declare
  saved public.list_settings;
begin
  assert (select assignee_enabled from public.list_settings where list_id = current_setting('tacha_test.family_list')::uuid),
    'un integrante ve el ajuste que dejó otro';

  select * into saved from public.set_list_assignee_enabled(current_setting('tacha_test.family_list')::uuid, false);
  assert not saved.assignee_enabled, 'un integrante puede apagar el ajuste de la lista compartida';
  perform * from public.set_list_assignee_enabled(current_setting('tacha_test.family_list')::uuid, true);
end $$;

reset role;
select pg_temp.as_user('user_c');
set local role authenticated;

do $$
begin
  begin
    perform * from public.set_list_assignee_enabled(current_setting('tacha_test.family_list')::uuid, false);
    assert false, 'C configuró la lista de otra familia';
  exception when no_data_found then null;
  end;

  begin
    perform * from public.get_list_assignee_candidates(current_setting('tacha_test.family_list')::uuid);
    assert false, 'C vio los candidatos de otra familia';
  exception when no_data_found then null;
  end;

  begin
    perform * from public.set_list_item_assignee(current_setting('tacha_test.item_family')::uuid, current_setting('tacha_test.user_c')::uuid);
    assert false, 'C asignó un producto de otra familia';
  exception when no_data_found then null;
  end;

  assert (select count(*) from public.list_settings) = 0, 'C no ve ajustes de listas ajenas';

  -- Su lista personal sí.
  assert (select assignee_enabled from public.set_list_assignee_enabled(current_setting('tacha_test.personal_list')::uuid, true)),
    'C puede configurar su lista personal';
end $$;

reset role;
select pg_temp.as_user('user_d');
set local role authenticated;

do $$
begin
  begin
    perform * from public.set_list_assignee_enabled(current_setting('tacha_test.personal_list')::uuid, true);
    assert false, 'D configuró la lista personal de C';
  exception when no_data_found then null;
  end;

  assert (select count(*) from public.list_settings) = 0, 'D no ve ajustes de listas ajenas';
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 5. Candidatos: la familia, también para un integrante que no es admin; solo
--    la dueña en una lista personal; el nombre sale del registro.
-- ----------------------------------------------------------------------------
select pg_temp.as_user('user_b');
set local role authenticated;

do $$
begin
  assert (select count(*) from public.get_list_assignee_candidates(current_setting('tacha_test.family_list')::uuid) c) = 2
    and (select count(*) from public.get_list_assignee_candidates(current_setting('tacha_test.family_list')::uuid) c
      where c.user_id in (current_setting('tacha_test.user_a')::uuid, current_setting('tacha_test.user_b')::uuid)) = 2,
    'los candidatos de la lista de la familia son sus dos integrantes, también para quien no es admin';
  assert (select count(*) from public.get_list_assignee_candidates(current_setting('tacha_test.family_date_list')::uuid) c) = 2
    and (select count(*) from public.get_list_assignee_candidates(current_setting('tacha_test.family_date_list')::uuid) c
      where c.user_id in (current_setting('tacha_test.user_a')::uuid, current_setting('tacha_test.user_b')::uuid)) = 2,
    'los candidatos de una sublista de la familia son sus integrantes';

  assert (select c.display_name from public.get_list_assignee_candidates(current_setting('tacha_test.family_list')::uuid) c
    where c.user_id = current_setting('tacha_test.user_a')::uuid) = 'Ana', 'el nombre sale de los metadatos del registro';
  assert (select c.display_name from public.get_list_assignee_candidates(current_setting('tacha_test.family_list')::uuid) c
    where c.user_id = current_setting('tacha_test.user_b')::uuid) is null, 'sin nombre en el registro, display_name es nulo';

  assert (select c.is_current_user from public.get_list_assignee_candidates(current_setting('tacha_test.family_list')::uuid) c
    where c.user_id = current_setting('tacha_test.user_b')::uuid), 'quien llama se marca como is_current_user';
  assert not (select c.is_current_user from public.get_list_assignee_candidates(current_setting('tacha_test.family_list')::uuid) c
    where c.user_id = current_setting('tacha_test.user_a')::uuid), 'los demás no se marcan';
end $$;

reset role;
select pg_temp.as_user('user_c');
set local role authenticated;

do $$
begin
  assert (select count(*) from public.get_list_assignee_candidates(current_setting('tacha_test.personal_list')::uuid)) = 1,
    'en una lista personal el único candidato es la dueña';
  assert (select c.user_id = current_setting('tacha_test.user_c')::uuid and c.is_current_user and c.display_name = 'Caro'
    from public.get_list_assignee_candidates(current_setting('tacha_test.personal_list')::uuid) c),
    'el candidato de la lista personal es C, con su nombre';
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 6. Asignar. A elige a B; B elige a A y quita; nadie elige a alguien sin
--    acceso; el producto ajeno y la lista personal respetan su dueña; un
--    producto tachado se puede asignar y sigue tachado.
-- ----------------------------------------------------------------------------
select pg_temp.as_user('user_a');
set local role authenticated;

do $$
declare
  changed public.list_items;
begin
  select * into changed from public.set_list_item_assignee(current_setting('tacha_test.item_family')::uuid, current_setting('tacha_test.user_b')::uuid);
  assert changed.id = current_setting('tacha_test.item_family')::uuid and changed.assigned_to = current_setting('tacha_test.user_b')::uuid,
    'A eligió a B como encargado';
  assert changed.quantity_requested = 2 and changed.checked_at is null and changed.list_id = current_setting('tacha_test.family_list')::uuid,
    'elegir al encargado no cambia cantidad, estado ni lista';

  -- Sin acceso: otra persona de otra familia, y un id que no existe.
  begin
    perform * from public.set_list_item_assignee(current_setting('tacha_test.item_family')::uuid, current_setting('tacha_test.user_c')::uuid);
    assert false, 'se eligió a alguien sin acceso a la lista';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform * from public.set_list_item_assignee(current_setting('tacha_test.item_family')::uuid, gen_random_uuid());
    assert false, 'se eligió a una cuenta que no existe';
  exception when invalid_parameter_value then null;
  end;

  assert (select assigned_to from public.list_items where id = current_setting('tacha_test.item_family')::uuid) = current_setting('tacha_test.user_b')::uuid,
    'un rechazo no cambia al encargado anterior';

  begin
    perform * from public.set_list_item_assignee(null, current_setting('tacha_test.user_a')::uuid);
    assert false, 'se aceptó un producto nulo';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform * from public.set_list_item_assignee(current_setting('tacha_test.item_personal')::uuid, current_setting('tacha_test.user_a')::uuid);
    assert false, 'A asignó un producto de la lista personal de C';
  exception when no_data_found then null;
  end;

  -- Un producto tachado se puede asignar y sigue tachado.
  select * into changed from public.set_list_item_assignee(current_setting('tacha_test.item_family_checked')::uuid, current_setting('tacha_test.user_a')::uuid);
  assert changed.assigned_to = current_setting('tacha_test.user_a')::uuid and changed.checked_at is not null,
    'asignar un producto tachado lo deja tachado';
end $$;

reset role;
select pg_temp.as_user('user_b');
set local role authenticated;

do $$
declare
  changed public.list_items;
begin
  select * into changed from public.set_list_item_assignee(current_setting('tacha_test.item_family')::uuid, current_setting('tacha_test.user_a')::uuid);
  assert changed.assigned_to = current_setting('tacha_test.user_a')::uuid, 'B (integrante) también puede elegir encargado';

  select * into changed from public.set_list_item_assignee(current_setting('tacha_test.item_family')::uuid, null);
  assert changed.assigned_to is null, 'con null se quita al encargado';

  perform * from public.set_list_item_assignee(current_setting('tacha_test.item_family')::uuid, current_setting('tacha_test.user_b')::uuid);
end $$;

reset role;
select pg_temp.as_user('user_c');
set local role authenticated;

do $$
declare
  changed public.list_items;
begin
  select * into changed from public.set_list_item_assignee(current_setting('tacha_test.item_personal')::uuid, current_setting('tacha_test.user_c')::uuid);
  assert changed.assigned_to = current_setting('tacha_test.user_c')::uuid, 'C puede ser encargada de su lista personal';

  begin
    perform * from public.set_list_item_assignee(current_setting('tacha_test.item_personal')::uuid, current_setting('tacha_test.user_a')::uuid);
    assert false, 'se eligió a alguien de otra familia en una lista personal';
  exception when invalid_parameter_value then null;
  end;
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 7. Apagar el ajuste no borra a los encargados (CA-03).
-- ----------------------------------------------------------------------------
select pg_temp.as_user('user_a');
set local role authenticated;

do $$
begin
  perform * from public.set_list_assignee_enabled(current_setting('tacha_test.family_list')::uuid, false);
  assert (select assigned_to from public.list_items where id = current_setting('tacha_test.item_family')::uuid) = current_setting('tacha_test.user_b')::uuid,
    'apagar el ajuste no borra al encargado';
  assert (select assigned_to from public.list_items where id = current_setting('tacha_test.item_family_checked')::uuid) = current_setting('tacha_test.user_a')::uuid,
    'apagar el ajuste no borra al encargado de un producto tachado';

  perform * from public.set_list_assignee_enabled(current_setting('tacha_test.family_list')::uuid, true);
  assert (select assigned_to from public.list_items where id = current_setting('tacha_test.item_family')::uuid) = current_setting('tacha_test.user_b')::uuid,
    'al volver a encenderlo, el encargado sigue';
end $$;

-- ----------------------------------------------------------------------------
-- 8. El cliente no escribe directo (mismo usuario, A). list_settings no tiene
--    permisos de escritura y assigned_to no tiene permiso de update. Un insert
--    directo con un encargado sin acceso tampoco pasa: lo rechaza el permiso o
--    el respaldo de la base, según los permisos de la tabla.
-- ----------------------------------------------------------------------------
do $$
begin
  begin
    update public.list_items set assigned_to = current_setting('tacha_test.user_a')::uuid where id = current_setting('tacha_test.item_family')::uuid;
    assert false, 'el cliente actualizó assigned_to directo';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.list_settings (list_id, assignee_enabled) values (current_setting('tacha_test.family_date_list')::uuid, true);
    assert false, 'el cliente insertó en list_settings';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.list_settings set assignee_enabled = false where list_id = current_setting('tacha_test.family_list')::uuid;
    assert false, 'el cliente actualizó list_settings';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.list_settings where list_id = current_setting('tacha_test.family_list')::uuid;
    assert false, 'el cliente borró de list_settings';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.list_items (list_id, product_catalog_variant_id, assigned_to)
    values (current_setting('tacha_test.family_list')::uuid, current_setting('tacha_test.variant_3')::uuid, current_setting('tacha_test.user_c')::uuid);
    assert false, 'el cliente insertó un producto con un encargado sin acceso';
  exception when insufficient_privilege or invalid_parameter_value then null;
  end;
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 9. El respaldo de la base (rol dueño: SQL manual o service_role): un
--    encargado sin acceso a la lista no se guarda, ni al insertar ni al
--    actualizar. Poner null sí.
-- ----------------------------------------------------------------------------
do $$
begin
  begin
    update public.list_items set assigned_to = current_setting('tacha_test.user_c')::uuid where id = current_setting('tacha_test.item_family')::uuid;
    assert false, 'el rol dueño guardó un encargado sin acceso';
  exception when invalid_parameter_value then null;
  end;

  begin
    insert into public.list_items (list_id, product_catalog_variant_id, assigned_to)
    values (current_setting('tacha_test.family_list')::uuid, current_setting('tacha_test.variant_3')::uuid, current_setting('tacha_test.user_d')::uuid);
    assert false, 'el rol dueño insertó un producto con un encargado sin acceso';
  exception when invalid_parameter_value then null;
  end;

  assert (select assigned_to from public.list_items where id = current_setting('tacha_test.item_family')::uuid) = current_setting('tacha_test.user_b')::uuid,
    'un rechazo del respaldo no cambia el dato';

  update public.list_items set assigned_to = null where id = current_setting('tacha_test.item_family_checked')::uuid;
  assert (select assigned_to from public.list_items where id = current_setting('tacha_test.item_family_checked')::uuid) is null,
    'poner null no pasa por el respaldo';
end $$;

-- ----------------------------------------------------------------------------
-- 10. Salir de la familia (regla 8): B ya no es candidato ni ve la lista, y el
--     dato de assigned_to no se reescribe.
-- ----------------------------------------------------------------------------
delete from public.household_members where user_id = current_setting('tacha_test.user_b')::uuid;

select pg_temp.as_user('user_a');
set local role authenticated;

do $$
begin
  assert (select array_agg(c.user_id) from public.get_list_assignee_candidates(current_setting('tacha_test.family_list')::uuid) c)
    = array[current_setting('tacha_test.user_a')::uuid], 'quien salió de la familia deja de ser candidato';
  assert (select assigned_to from public.list_items where id = current_setting('tacha_test.item_family')::uuid) = current_setting('tacha_test.user_b')::uuid,
    'salir de la familia no reescribe assigned_to';

  begin
    perform * from public.set_list_item_assignee(current_setting('tacha_test.item_family')::uuid, current_setting('tacha_test.user_b')::uuid);
    assert false, 'se eligió a alguien que ya salió de la familia';
  exception when invalid_parameter_value then null;
  end;

  -- Quitar al encargado que salió sí se puede.
  assert (select assigned_to from public.set_list_item_assignee(current_setting('tacha_test.item_family')::uuid, null)) is null,
    'se puede quitar al encargado que salió';
end $$;

reset role;
select pg_temp.as_user('user_b');
set local role authenticated;

do $$
begin
  begin
    perform * from public.set_list_item_assignee(current_setting('tacha_test.item_family')::uuid, null);
    assert false, 'quien salió de la familia siguió asignando';
  exception when no_data_found then null;
  end;
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 11. Borrar la cuenta del encargado deja assigned_to en null; el producto sigue.
--     B vuelve a la familia, se le asigna un producto y se borra su cuenta.
-- ----------------------------------------------------------------------------
insert into public.household_members (user_id, household_id, role)
select current_setting('tacha_test.user_b')::uuid, l.household_id, 'member'
from public.lists l
where l.id = current_setting('tacha_test.family_list')::uuid;

update public.list_items set assigned_to = current_setting('tacha_test.user_b')::uuid where id = current_setting('tacha_test.item_family')::uuid;

delete from auth.users where id = current_setting('tacha_test.user_b')::uuid;

do $$
begin
  assert exists (select 1 from public.list_items where id = current_setting('tacha_test.item_family')::uuid),
    'borrar la cuenta del encargado no borra el producto';
  assert (select assigned_to from public.list_items where id = current_setting('tacha_test.item_family')::uuid) is null,
    'borrar la cuenta del encargado deja assigned_to en null';
end $$;

-- ----------------------------------------------------------------------------
-- 12. Borrar la lista borra su ajuste.
-- ----------------------------------------------------------------------------
do $$
begin
  assert exists (select 1 from public.list_settings where list_id = current_setting('tacha_test.family_date_list')::uuid),
    'la sublista tiene su fila de ajuste';

  delete from public.lists where id = current_setting('tacha_test.family_date_list')::uuid;

  assert not exists (select 1 from public.list_settings where list_id = current_setting('tacha_test.family_date_list')::uuid),
    'borrar la lista borra su ajuste';
end $$;

-- Si llegó hasta acá, todo pasó (el resultado que se ve es `set_config = ok`).
select set_config('tacha_test.resultado', 'ok', true);

rollback;
