-- ============================================================================
-- Prueba de la migración 040 (SCRUM-91): editar totales, ajustes y zona guardada.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 040. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios, compras ni ajustes en la base compartida.
-- Si una regla no se cumple, un `assert` corta con su mensaje; si termina sin
-- error, pasó. Contra la base sin 040 falla en el paso 0.
--
-- El barrido de todos los cambios de horario está aparte, en
-- 040_time_zone_sweep.test.sql, porque tarda unos 2 minutos en local.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- Solo cuenta filas de sus propios usuarios: en la base compartida puede haber
-- datos reales.
--
-- Cada caso indica cómo se llega a su estado:
--   [RPC]         los ajustes y las ediciones los hacen las RPC, con la hora actual. Las
--                 compras las crea el dueño de la tabla, con el mismo resultado que cerrarlas.
--   [filas fijas] las filas las crea el dueño de la tabla, porque el caso necesita
--                 fechas fijas. Si el estado no se alcanza por las RPC, lo dice.
--
-- Qué comprueba (features/finance/specs/SPEC.md §13, "Base"):
--   1. permisos de las tablas, de las RPC y de las funciones internas; RLS;
--   2. sin sesión y sesión anónima: 42501, sin cambios;
--   3. trigger: conserva closed_at y cerrar sigue poniendo now();
--   4. nada se escribe directo: compras cerradas, ajustes ni zona;
--   5. editar compras: fecha intacta, sin total, ₡0, decimales e históricas;
--   6. aislamiento entre dueños;
--   7. validación de montos, niveles y zonas (22023);
--   8. límites de cada periodo, los mismos de getPeriodBounds, y medianoche repetida;
--   9. ajustes: crear, reemplazar, quitar, sin compras, ₡0 y sin total;
--  10. dónde cuenta cada ajuste (regla 52);
--  11. D18 al editar compras y ajustes, y atomicidad;
--  12. bloqueo por usuario de las RPC;
--  13. lectura por dueño y cascada al borrar la cuenta;
--  14. usuarios sin zona: nunca se asigna sola; confirmar; lectura de límites;
--  15. el entorno no cambia los periodos;
--  16. cambiar de zona: D18 en todos los periodos con ajustes, rechazo atómico;
--  17. zona que PostgreSQL deja de reconocer (TZ002);
--  18. reemplazar conserva la fecha y une ajustes del mismo periodo;
--  19. rango de los ajustes;
--  20. get_period_finance: una sola lectura coherente, sin zona y con zona;
--  21. un periodo que ya era negativo no se oculta ni se agrava.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño). Los ids viajan entre pasos en variables de la
--    transacción (set_config(..., true)).
-- ----------------------------------------------------------------------------

-- Cambia de usuario: se llama con el rol dueño, antes de `set local role`.
create function pg_temp.as_user(user_key text, is_anonymous boolean default false)
returns void
language sql
as $$
  select set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', current_setting('tacha_test.' || user_key), 'role', 'authenticated', 'is_anonymous', is_anonymous
    )::text,
    true
  );
$$;

create function pg_temp.new_user(user_key text, time_zone_name text default null)
returns uuid
language plpgsql
as $$
declare
  new_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, aud, role, email)
  values (new_id, 'authenticated', 'authenticated', new_id || '@prueba.tacha');
  if time_zone_name is not null then
    insert into public.spending_time_zones (owner_id, time_zone) values (new_id, time_zone_name);
  end if;
  perform set_config('tacha_test.' || user_key, new_id::text, true);
  return new_id;
end;
$$;

create function pg_temp.new_purchase(purchase_key text, user_key text, closed timestamptz, spent numeric)
returns uuid
language plpgsql
as $$
declare
  new_id uuid;
begin
  insert into public.purchase_sessions (owner_id, store_id, started_at, closed_at, total_amount)
  values (
    current_setting('tacha_test.' || user_key)::uuid,
    (select s.id from public.stores s order by s.slug limit 1),
    closed,
    closed,
    spent
  )
  returning id into new_id;
  perform set_config('tacha_test.' || purchase_key, new_id::text, true);
  return new_id;
end;
$$;

-- Total del periodo que contiene un instante, en una zona.
create function pg_temp.total_at(user_key text, period_scope text, at_instant timestamptz, time_zone_name text)
returns numeric
language sql
as $$
  select public.spending_period_total(
    current_setting('tacha_test.' || user_key)::uuid, period_scope, b.period_start, b.period_end
  )
  from public.spending_period_bounds(period_scope, at_instant, time_zone_name) b;
$$;

create function pg_temp.total_of(purchase_key text)
returns numeric
language sql
as $$
  select s.total_amount from public.purchase_sessions s
  where s.id = current_setting('tacha_test.' || purchase_key)::uuid;
$$;

do $$
declare
  open_session uuid;
begin
  perform pg_temp.new_user('user_a', 'America/Costa_Rica');
  perform pg_temp.new_user('user_b', 'America/Costa_Rica');
  perform pg_temp.new_purchase('historic_session', 'user_a', '2025-01-15 13:00+00', 10000);
  perform pg_temp.new_purchase('without_total_session', 'user_a', '2025-01-16 13:00+00', null);
  perform pg_temp.new_purchase('decimals_session', 'user_a', '2025-01-17 13:00+00', 1234.56);
  perform pg_temp.new_purchase('other_owner_session', 'user_b', '2025-01-15 13:00+00', 7000);

  insert into public.purchase_sessions (owner_id, store_id)
  values (current_setting('tacha_test.user_a')::uuid, (select s.id from public.stores s order by s.slug limit 1))
  returning id into open_session;
  perform set_config('tacha_test.open_session', open_session::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos (rol dueño).
-- ----------------------------------------------------------------------------

do $$
declare
  client_table regclass;
  internal_function regprocedure;
  client_function regprocedure;
begin
  foreach client_table in array array[
    'public.spending_adjustments'::regclass,
    'public.spending_time_zones'::regclass
  ] loop
    assert (select c.relrowsecurity from pg_class c where c.oid = client_table),
      format('%s tiene RLS activada', client_table);
    assert (select count(*) from pg_policies p
            where p.schemaname = 'public' and p.tablename = (select c.relname from pg_class c where c.oid = client_table)) = 1,
      format('%s tiene exactamente una política', client_table);
    assert (select p.cmd from pg_policies p
            where p.schemaname = 'public' and p.tablename = (select c.relname from pg_class c where c.oid = client_table)) = 'SELECT',
      format('la única política de %s es de lectura', client_table);
    assert has_table_privilege('authenticated', client_table, 'select'), format('authenticated lee %s', client_table);
    assert not has_table_privilege('authenticated', client_table, 'delete'), format('authenticated no borra %s', client_table);
    -- Por columna: has_table_privilege no ve un grant de una sola columna.
    assert not has_any_column_privilege('authenticated', client_table, 'insert'),
      format('authenticated no inserta ninguna columna de %s', client_table);
    assert not has_any_column_privilege('authenticated', client_table, 'update'),
      format('authenticated no cambia ninguna columna de %s', client_table);
    assert not has_any_column_privilege('anon', client_table, 'select'), format('anon no lee %s', client_table);
    assert not has_any_column_privilege('anon', client_table, 'insert'), format('anon no inserta en %s', client_table);
    assert not has_any_column_privilege('anon', client_table, 'update'), format('anon no cambia %s', client_table);
    assert not has_table_privilege('anon', client_table, 'delete'), format('anon no borra %s', client_table);
    assert not exists (
      select 1 from pg_class c, aclexplode(c.relacl) a where c.oid = client_table and a.grantee = 0
    ), format('public no tiene permisos sobre %s', client_table);
  end loop;

  -- purchase_sessions: no se ampliaron sus permisos ni su política de update.
  assert (select count(*) from pg_policies p
          where p.schemaname = 'public' and p.tablename = 'purchase_sessions' and p.cmd = 'UPDATE') = 1,
    'purchase_sessions sigue con una sola política de update';
  assert (select p.qual from pg_policies p
          where p.schemaname = 'public' and p.tablename = 'purchase_sessions' and p.cmd = 'UPDATE')
    like '%closed_at IS NULL%',
    'la política de update sigue aceptando solo compras abiertas';
  assert not has_column_privilege('authenticated', 'public.purchase_sessions', 'owner_id', 'update'),
    'authenticated no cambia el dueño de una compra';
  assert not has_column_privilege('authenticated', 'public.purchase_sessions', 'store_id', 'update'),
    'authenticated no cambia el supermercado de una compra';
  assert not has_table_privilege('anon', 'public.purchase_sessions', 'update'), 'anon no actualiza compras';

  -- RPC: security definer, search_path vacío y solo authenticated.
  foreach client_function in array array[
    'public.get_spending_period_bounds(text)'::regprocedure,
    'public.get_period_finance(text)'::regprocedure,
    'public.set_spending_time_zone(text)'::regprocedure,
    'public.set_purchase_session_total(uuid, numeric)'::regprocedure,
    'public.set_period_total(text, numeric)'::regprocedure
  ] loop
    assert (select p.prosecdef from pg_proc p where p.oid = client_function), format('%s es security definer', client_function);
    assert (select p.proconfig from pg_proc p where p.oid = client_function) = array['search_path=""'],
      format('%s fija search_path', client_function);
    assert has_function_privilege('authenticated', client_function, 'execute'), format('authenticated ejecuta %s', client_function);
    assert not has_function_privilege('anon', client_function, 'execute'), format('anon no ejecuta %s', client_function);
    assert not exists (
      select 1 from pg_proc p, aclexplode(p.proacl) a
      where p.oid = client_function and a.grantee = 0 and a.privilege_type = 'EXECUTE'
    ), format('public no ejecuta %s', client_function);
  end loop;

  -- Las RPC de edición no reciben una zona: el cliente no decide los periodos.
  assert to_regprocedure('public.set_purchase_session_total(uuid, numeric, text)') is null,
    'set_purchase_session_total no recibe una zona';
  assert to_regprocedure('public.set_period_total(text, numeric, text)') is null,
    'set_period_total no recibe una zona';

  -- Funciones internas: sin execute para el cliente, con search_path vacío.
  foreach internal_function in array array[
    'public.require_registered_user()'::regprocedure,
    'public.assert_valid_spending_total(numeric)'::regprocedure,
    'public.assert_valid_time_zone(text)'::regprocedure,
    'public.assert_valid_period_scope(text)'::regprocedure,
    'public.start_period_read(text)'::regprocedure,
    'public.find_spending_time_zone(uuid)'::regprocedure,
    'public.require_spending_time_zone(uuid)'::regprocedure,
    'public.spending_local_time_instant(timestamp, text)'::regprocedure,
    'public.spending_period_bounds(text, timestamptz, text)'::regprocedure,
    'public.spending_period_total(uuid, text, timestamptz, timestamptz)'::regprocedure,
    'public.assert_adjusted_periods_not_negative(uuid, timestamptz, text)'::regprocedure
  ] loop
    assert not has_function_privilege('authenticated', internal_function, 'execute'),
      format('authenticated no ejecuta %s', internal_function);
    assert not has_function_privilege('anon', internal_function, 'execute'), format('anon no ejecuta %s', internal_function);
    assert (select p.proconfig from pg_proc p where p.oid = internal_function) = array['search_path=""'],
      format('%s fija search_path', internal_function);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 2. Sin sesión y con sesión anónima (con el id de A): 42501 y nada cambia.
-- ----------------------------------------------------------------------------

select set_config('request.jwt.claims', '{}', true);
set local role authenticated;

do $$
begin
  begin
    perform public.set_purchase_session_total(current_setting('tacha_test.historic_session')::uuid, 1);
    assert false, 'sin sesión se pudo editar una compra';
  exception when insufficient_privilege then
    assert sqlerrm = 'Se requiere una cuenta registrada', 'sin sesión: el 42501 tiene que ser por falta de cuenta';
  end;

  begin
    perform * from public.set_period_total('week', 1);
    assert false, 'sin sesión se pudo editar un periodo';
  exception when insufficient_privilege then
    assert sqlerrm = 'Se requiere una cuenta registrada', 'sin sesión: el 42501 tiene que ser por falta de cuenta';
  end;

  begin
    perform public.set_spending_time_zone('UTC');
    assert false, 'sin sesión se pudo guardar una zona';
  exception when insufficient_privilege then
    assert sqlerrm = 'Se requiere una cuenta registrada', 'sin sesión: el 42501 tiene que ser por falta de cuenta';
  end;

  begin
    perform * from public.get_spending_period_bounds('week');
    assert false, 'sin sesión se pudieron leer límites';
  exception when insufficient_privilege then
    assert sqlerrm = 'Se requiere una cuenta registrada', 'sin sesión: el 42501 tiene que ser por falta de cuenta';
  end;

  -- La sesión va antes que el nivel, también en la lectura: no revela qué es válido.
  begin
    perform public.get_period_finance('year');
    assert false, 'sin sesión se leyó Finanzas';
  exception when insufficient_privilege then
    assert sqlerrm = 'Se requiere una cuenta registrada', 'sin sesión: el 42501 va antes que el nivel inválido';
  end;

  -- La sesión va antes que los demás parámetros: no revela qué es válido.
  begin
    perform public.set_purchase_session_total(null, null);
    assert false, 'sin sesión se validaron los parámetros primero';
  exception when insufficient_privilege then null;
  end;

  assert (select count(*) from public.spending_adjustments) = 0, 'sin sesión no se ve ningún ajuste';
  assert (select count(*) from public.spending_time_zones) = 0, 'sin sesión no se ve ninguna zona';
end $$;

reset role;
select pg_temp.as_user('user_a', true);
set local role authenticated;

do $$
begin
  begin
    perform public.set_purchase_session_total(current_setting('tacha_test.historic_session')::uuid, 1);
    assert false, 'una sesión anónima pudo editar una compra';
  exception when insufficient_privilege then
    assert sqlerrm = 'Se requiere una cuenta registrada', 'sesión anónima: el 42501 tiene que ser por anónima';
  end;

  begin
    perform * from public.set_period_total('week', 1);
    assert false, 'una sesión anónima pudo editar un periodo';
  exception when insufficient_privilege then
    assert sqlerrm = 'Se requiere una cuenta registrada', 'sesión anónima: el 42501 tiene que ser por anónima';
  end;

  begin
    perform public.set_spending_time_zone('UTC');
    assert false, 'una sesión anónima pudo guardar una zona';
  exception when insufficient_privilege then
    assert sqlerrm = 'Se requiere una cuenta registrada', 'sesión anónima: el 42501 tiene que ser por anónima';
  end;

  begin
    perform * from public.get_spending_period_bounds('week');
    assert false, 'una sesión anónima pudo leer límites';
  exception when insufficient_privilege then
    assert sqlerrm = 'Se requiere una cuenta registrada', 'sesión anónima: el 42501 tiene que ser por anónima';
  end;

  assert (select count(*) from public.spending_time_zones) = 0, 'una sesión anónima no ve su zona';
end $$;

-- El rol anon (sin sesión de Supabase) no tiene ni el permiso.
reset role;
set local role anon;

do $$
begin
  begin
    perform public.set_purchase_session_total(gen_random_uuid(), 1);
    assert false, 'el rol anon pudo ejecutar set_purchase_session_total';
  exception when insufficient_privilege then null;
  end;

  begin
    perform * from public.set_period_total('week', 1);
    assert false, 'el rol anon pudo ejecutar set_period_total';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.set_spending_time_zone('UTC');
    assert false, 'el rol anon pudo ejecutar set_spending_time_zone';
  exception when insufficient_privilege then null;
  end;

  begin
    perform * from public.get_spending_period_bounds('week');
    assert false, 'el rol anon pudo ejecutar get_spending_period_bounds';
  exception when insufficient_privilege then null;
  end;

  begin
    perform 1 from public.spending_adjustments;
    assert false, 'el rol anon pudo leer spending_adjustments';
  exception when insufficient_privilege then null;
  end;

  begin
    perform 1 from public.spending_time_zones;
    assert false, 'el rol anon pudo leer spending_time_zones';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

do $$
begin
  assert pg_temp.total_of('historic_session') = 10000, 'la compra de A no cambió sin cuenta registrada';
  assert (select t.time_zone from public.spending_time_zones t
          where t.owner_id = current_setting('tacha_test.user_a')::uuid) = 'America/Costa_Rica',
    'la zona de A no cambió sin cuenta registrada';
end $$;

-- ----------------------------------------------------------------------------
-- 3. Trigger: una compra cerrada conserva closed_at; cerrar sigue poniendo now().
-- ----------------------------------------------------------------------------

do $$
declare
  saved_session public.purchase_sessions;
begin
  update public.purchase_sessions s set closed_at = '1990-01-01'
  where s.id = current_setting('tacha_test.historic_session')::uuid
  returning s.* into saved_session;
  assert saved_session.closed_at = '2025-01-15 13:00+00', 'una compra cerrada conserva closed_at ante otra fecha';

  update public.purchase_sessions s set closed_at = null
  where s.id = current_setting('tacha_test.historic_session')::uuid
  returning s.* into saved_session;
  assert saved_session.closed_at = '2025-01-15 13:00+00', 'una compra cerrada no se reabre con closed_at nulo';

  update public.purchase_sessions s set total_amount = 10000
  where s.id = current_setting('tacha_test.historic_session')::uuid
  returning s.* into saved_session;
  assert saved_session.closed_at = '2025-01-15 13:00+00', 'cambiar el total no mueve la compra a hoy';

  update public.purchase_sessions s set store_id = s.store_id
  where s.id = current_setting('tacha_test.open_session')::uuid
  returning s.* into saved_session;
  assert saved_session.closed_at is null, 'un update que no cierra deja la compra abierta';
end $$;

-- Regresión de 018, por la vía real: la fecha de cierre la pone la base.
select pg_temp.as_user('user_a');
set local role authenticated;

do $$
declare
  saved_session public.purchase_sessions;
begin
  update public.purchase_sessions s set closed_at = '1990-01-01'
  where s.id = current_setting('tacha_test.open_session')::uuid
  returning s.* into saved_session;
  assert saved_session.closed_at = now(), 'cerrar sigue poniendo la hora de la base, no la del cliente';
end $$;

reset role;

-- Queda otra abierta para los pasos siguientes.
do $$
declare
  open_session uuid;
begin
  insert into public.purchase_sessions (owner_id, store_id)
  values (current_setting('tacha_test.user_a')::uuid, (select s.id from public.stores s order by s.slug limit 1))
  returning id into open_session;
  perform set_config('tacha_test.open_session', open_session::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 4. Directo, sin las RPC: una compra cerrada propia no cambia, y ni los ajustes ni
--    la zona se escriben. Sesión de A.
-- ----------------------------------------------------------------------------

set local role authenticated;

do $$
declare
  affected_rows integer;
begin
  update public.purchase_sessions s set total_amount = 1
  where s.id = current_setting('tacha_test.historic_session')::uuid;
  get diagnostics affected_rows = row_count;
  assert affected_rows = 0, 'un PATCH directo cambió el total de una compra cerrada';

  update public.purchase_sessions s set closed_at = null
  where s.id = current_setting('tacha_test.historic_session')::uuid;
  get diagnostics affected_rows = row_count;
  assert affected_rows = 0, 'un PATCH directo reabrió una compra cerrada';

  begin
    insert into public.spending_adjustments (owner_id, scope, effective_at, amount)
    values (current_setting('tacha_test.user_a')::uuid, 'week', now(), 1);
    assert false, 'se pudo insertar un ajuste sin la RPC';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.spending_adjustments a set amount = 1 where true;
    assert false, 'se pudo cambiar un ajuste sin la RPC';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.spending_adjustments a where true;
    assert false, 'se pudo borrar un ajuste sin la RPC';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.spending_time_zones t set time_zone = 'UTC' where true;
    assert false, 'se pudo cambiar la zona sin la RPC';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.spending_time_zones (owner_id, time_zone)
    values (current_setting('tacha_test.user_a')::uuid, 'UTC');
    assert false, 'se pudo guardar una zona sin la RPC';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.spending_time_zones t where true;
    assert false, 'se pudo borrar la zona sin la RPC';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.spending_period_total(current_setting('tacha_test.user_b')::uuid, 'month', now(), now());
    assert false, 'el cliente pudo calcular el total de otro';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 5. Editar compras (regla 48): cerradas y propias, también históricas. [filas fijas]
-- ----------------------------------------------------------------------------

do $$
declare
  before_edit public.purchase_sessions;
  saved_session public.purchase_sessions;
begin
  select s.* into before_edit from public.purchase_sessions s
  where s.id = current_setting('tacha_test.historic_session')::uuid;

  saved_session := public.set_purchase_session_total(before_edit.id, 12000);
  assert saved_session.total_amount = 12000, 'devuelve el total nuevo';
  assert saved_session.closed_at = before_edit.closed_at, 'editar no cambia closed_at';
  assert saved_session.started_at = before_edit.started_at, 'editar no cambia started_at';
  assert saved_session.store_id = before_edit.store_id, 'editar no cambia el supermercado';
  assert saved_session.owner_id = before_edit.owner_id, 'editar no cambia el dueño';

  saved_session := public.set_purchase_session_total(before_edit.id, 0);
  assert saved_session.total_amount = 0, 'una compra puede quedar en ₡0';

  saved_session := public.set_purchase_session_total(before_edit.id, 9999999999);
  assert saved_session.total_amount = 9999999999, 'el tope 9.999.999.999 se acepta';

  saved_session := public.set_purchase_session_total(current_setting('tacha_test.without_total_session')::uuid, 5000);
  assert saved_session.total_amount = 5000, 'una compra sin total se puede completar';

  saved_session := public.set_purchase_session_total(current_setting('tacha_test.decimals_session')::uuid, 1235);
  assert saved_session.total_amount = 1235, 'una compra con decimales pasa al entero confirmado';

  begin
    perform public.set_purchase_session_total(current_setting('tacha_test.open_session')::uuid, 1);
    assert false, 'se pudo editar una compra abierta';
  exception when no_data_found then
    assert sqlerrm = 'Esa compra no está disponible', 'compra abierta: mensaje único';
  end;

  begin
    perform public.set_purchase_session_total(gen_random_uuid(), 1);
    assert false, 'se pudo editar una compra inexistente';
  exception when no_data_found then
    assert sqlerrm = 'Esa compra no está disponible', 'compra inexistente: mensaje único';
  end;

  begin
    perform public.set_purchase_session_total(null, 1);
    assert false, 'se aceptó una compra nula';
  exception when no_data_found then null;
  end;

  assert (select s.total_amount from public.purchase_sessions s
          where s.id = current_setting('tacha_test.open_session')::uuid) is null,
    'la compra abierta sigue sin total';
end $$;

-- ----------------------------------------------------------------------------
-- 6. Aislamiento: A no edita ni ve lo de B.
-- ----------------------------------------------------------------------------

do $$
begin
  begin
    perform public.set_purchase_session_total(current_setting('tacha_test.other_owner_session')::uuid, 1);
    assert false, 'A editó la compra de B';
  exception when no_data_found then
    assert sqlerrm = 'Esa compra no está disponible', 'compra ajena: el mismo mensaje que una inexistente';
  end;

  assert (select count(*) from public.purchase_sessions s
          where s.id = current_setting('tacha_test.other_owner_session')::uuid) = 0,
    'A no ve la compra de B';
  assert (select count(*) from public.spending_time_zones t
          where t.owner_id = current_setting('tacha_test.user_b')::uuid) = 0,
    'A no ve la zona de B';
end $$;

reset role;

do $$
begin
  assert pg_temp.total_of('other_owner_session') = 7000, 'la compra de B sigue en 7000';
end $$;

set local role authenticated;

-- ----------------------------------------------------------------------------
-- 7. Validaciones (22023).
-- ----------------------------------------------------------------------------

do $$
declare
  invalid_amount numeric;
  invalid_scope text;
  invalid_time_zone text;
begin
  foreach invalid_amount in array array[
    -1, 12.5, 0.01, 10000000000, 'NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric
  ] loop
    begin
      perform public.set_purchase_session_total(current_setting('tacha_test.historic_session')::uuid, invalid_amount);
      assert false, format('una compra aceptó %s', invalid_amount);
    exception when invalid_parameter_value then null;
    end;

    begin
      perform * from public.set_period_total('week', invalid_amount);
      assert false, format('un periodo aceptó %s', invalid_amount);
    exception when invalid_parameter_value then null;
    end;
  end loop;

  -- Vacío: no se vuelve a "Sin total" (D13).
  begin
    perform public.set_purchase_session_total(current_setting('tacha_test.historic_session')::uuid, null);
    assert false, 'una compra volvió a sin total';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform * from public.set_period_total('week', null);
    assert false, 'un periodo aceptó un total nulo';
  exception when invalid_parameter_value then null;
  end;

  foreach invalid_scope in array array['year', '', 'WEEK'] loop
    begin
      perform * from public.set_period_total(invalid_scope, 1);
      assert false, format('se aceptó el periodo %L', invalid_scope);
    exception when invalid_parameter_value then null;
    end;

    begin
      perform * from public.get_spending_period_bounds(invalid_scope);
      assert false, format('se leyeron límites de %L', invalid_scope);
    exception when invalid_parameter_value then null;
    end;
  end loop;

  -- 'UTC+5' y 'CST' los entiende `at time zone`, pero no son zonas con nombre. Un
  -- directorio no es una zona. posix/ y right/ se rechazan en cualquier combinación
  -- de mayúsculas, porque PostgreSQL no las distingue.
  foreach invalid_time_zone in array array[
    'Marte/Olympus', 'foo/bar', '', 'UTC+5', 'CST', 'utc', 'America/Argentina',
    'posix/America/Costa_Rica', 'POSIX/America/Costa_Rica', 'right/America/Costa_Rica',
    'Right/America/Costa_Rica', 'UTC''; drop table public.stores; --'
  ] loop
    begin
      perform public.set_spending_time_zone(invalid_time_zone);
      assert false, format('se guardó la zona %L', invalid_time_zone);
    exception when invalid_parameter_value then null;
    end;
  end loop;

  begin
    perform public.set_spending_time_zone(null);
    assert false, 'se guardó una zona nula';
  exception when invalid_parameter_value then null;
  end;

  assert (select t.time_zone from public.spending_time_zones t) = 'America/Costa_Rica',
    'las zonas inválidas no cambiaron la de A';
end $$;

reset role;

-- Zonas reales con cada forma de nombre que puede dar el navegador.
do $$
declare
  valid_time_zone text;
begin
  foreach valid_time_zone in array array[
    'UTC', 'GMT', 'America/Costa_Rica', 'america/costa_rica', 'America/Port-au-Prince',
    'America/Argentina/Buenos_Aires', 'Asia/Calcutta', 'Asia/Kolkata', 'Etc/GMT+5', 'Pacific/Port_Moresby'
  ] loop
    perform public.assert_valid_time_zone(valid_time_zone);
  end loop;

  assert pg_temp.total_of('historic_session') = 9999999999, 'los intentos inválidos no cambiaron la compra';
  assert (select count(*) from public.spending_adjustments a
          where a.owner_id = current_setting('tacha_test.user_a')::uuid) = 0,
    'los intentos inválidos no crearon ajustes';

  -- La tabla también rechaza lo que no debe existir.
  begin
    insert into public.spending_adjustments (owner_id, scope, effective_at, amount)
    values (current_setting('tacha_test.user_a')::uuid, 'year', now(), 1);
    assert false, 'la tabla aceptó un nivel desconocido';
  exception when check_violation then null;
  end;

  begin
    insert into public.spending_adjustments (owner_id, scope, effective_at, amount)
    values (current_setting('tacha_test.user_a')::uuid, 'week', now(), 0);
    assert false, 'la tabla aceptó un ajuste de 0';
  exception when check_violation then null;
  end;

  begin
    insert into public.spending_adjustments (owner_id, scope, effective_at, amount)
    values (current_setting('tacha_test.user_a')::uuid, 'week', now(), 'NaN'::numeric);
    assert false, 'la tabla aceptó NaN';
  exception when check_violation then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 8. Límites: los mismos de getPeriodBounds (regla 8) y de E2E.md. Costa Rica es
--    UTC-6, sin horario de verano.
-- ----------------------------------------------------------------------------

do $$
declare
  case_row record;
  bound_start timestamptz;
  bound_end timestamptz;
begin
  for case_row in
    select * from (values
      -- Domingo 18 de octubre de 2026, 15:00 en Costa Rica (E2E.md).
      ('day', '2026-10-18 21:00+00'::timestamptz, 'America/Costa_Rica', '2026-10-18 06:00+00'::timestamptz, '2026-10-19 06:00+00'::timestamptz),
      ('week', '2026-10-18 21:00+00', 'America/Costa_Rica', '2026-10-12 06:00+00', '2026-10-19 06:00+00'),
      ('month', '2026-10-18 21:00+00', 'America/Costa_Rica', '2026-10-01 06:00+00', '2026-11-01 06:00+00'),
      -- Lunes a las 00:00 exactas: empieza una semana nueva (inicio incluido).
      ('week', '2026-10-19 06:00+00', 'America/Costa_Rica', '2026-10-19 06:00+00', '2026-10-26 06:00+00'),
      -- Domingo 23:59: sigue en la semana que empezó el lunes anterior.
      ('week', '2026-10-19 05:59+00', 'America/Costa_Rica', '2026-10-12 06:00+00', '2026-10-19 06:00+00'),
      -- Semana que cruza de mes y de año.
      ('week', '2025-10-05 18:00+00', 'America/Costa_Rica', '2025-09-29 06:00+00', '2025-10-06 06:00+00'),
      ('week', '2027-01-03 18:00+00', 'America/Costa_Rica', '2026-12-28 06:00+00', '2027-01-04 06:00+00'),
      -- 31 de diciembre y febrero de 28 y de 29 días.
      ('month', '2026-12-31 18:00+00', 'America/Costa_Rica', '2026-12-01 06:00+00', '2027-01-01 06:00+00'),
      ('month', '2027-02-28 18:00+00', 'America/Costa_Rica', '2027-02-01 06:00+00', '2027-03-01 06:00+00'),
      ('month', '2028-02-29 18:00+00', 'America/Costa_Rica', '2028-02-01 06:00+00', '2028-03-01 06:00+00'),
      -- La misma hora es otro día según la zona.
      ('day', '2026-10-18 03:00+00', 'America/Costa_Rica', '2026-10-17 06:00+00', '2026-10-18 06:00+00'),
      ('day', '2026-10-18 03:00+00', 'UTC', '2026-10-18 00:00+00', '2026-10-19 00:00+00'),
      -- Cambio de horario: ese día dura 23 horas.
      ('day', '2026-03-08 12:00+00', 'America/New_York', '2026-03-08 05:00+00', '2026-03-09 04:00+00'),
      -- La Habana, 2 de noviembre de 2025: la 01:00 vuelve a ser 00:00. Las dos 00:30 son
      -- del mismo día, y el día anterior termina donde este empieza.
      ('day', '2025-11-02 03:30+00', 'America/Havana', '2025-11-01 04:00+00', '2025-11-02 04:00+00'),
      ('day', '2025-11-02 04:30+00', 'America/Havana', '2025-11-02 04:00+00', '2025-11-03 05:00+00'),
      ('day', '2025-11-02 05:30+00', 'America/Havana', '2025-11-02 04:00+00', '2025-11-03 05:00+00'),
      -- La Habana, 8 de marzo de 2026: la 00:00 no existe, salta a la 01:00.
      ('day', '2026-03-08 12:00+00', 'America/Havana', '2026-03-08 05:00+00', '2026-03-09 04:00+00'),
      -- Samoa se saltó el 30 de diciembre de 2011: el 29 termina donde empieza el 31, y
      -- la semana de ese salto dura seis días locales.
      ('day', '2011-12-30 09:00+00', 'Pacific/Apia', '2011-12-29 10:00+00', '2011-12-30 10:00+00'),
      ('day', '2011-12-30 11:00+00', 'Pacific/Apia', '2011-12-30 10:00+00', '2011-12-31 10:00+00'),
      ('week', '2011-12-30 11:00+00', 'Pacific/Apia', '2011-12-26 10:00+00', '2012-01-01 10:00+00'),
      ('month', '2011-12-30 11:00+00', 'Pacific/Apia', '2011-12-01 10:00+00', '2011-12-31 10:00+00'),
      -- St. John's retrocedía a las 00:01: la medianoche del 25 de octubre de 1987 ocurrió
      -- dos veces, y entre ellas volvió a ser 24 de octubre. Ese rato cuenta en el 25,
      -- el periodo que lo contiene.
      ('day', '1987-10-25 02:00+00', 'America/St_Johns', '1987-10-24 02:30+00', '1987-10-25 02:30+00'),
      ('day', '1987-10-25 02:35+00', 'America/St_Johns', '1987-10-25 02:30+00', '1987-10-26 03:30+00'),
      ('day', '1987-10-25 03:35+00', 'America/St_Johns', '1987-10-25 02:30+00', '1987-10-26 03:30+00'),
      -- Un retroceso que no es de una hora: Lord Howe cambia 30 minutos, a las 02:00, así
      -- que su medianoche es única; Troll, en la Antártida, cambia dos horas.
      ('day', '2026-04-05 13:00+00', 'Australia/Lord_Howe', '2026-04-04 13:00+00', '2026-04-05 13:30+00'),
      ('day', '2026-10-25 12:00+00', 'Antarctica/Troll', '2026-10-24 22:00+00', '2026-10-26 00:00+00'),
      -- Casey, 4 de marzo de 2010: retrocedió 3 horas cruzando la medianoche. Después de
      -- las 00:00 del 5 volvió a ser el 4 un rato; ese rato cuenta en el día 5.
      ('day', '2010-03-04 12:00+00', 'Antarctica/Casey', '2010-03-03 13:00+00', '2010-03-04 13:00+00'),
      ('day', '2010-03-04 14:00+00', 'Antarctica/Casey', '2010-03-04 13:00+00', '2010-03-05 16:00+00'),
      ('day', '2010-03-04 15:00+00', 'Antarctica/Casey', '2010-03-04 13:00+00', '2010-03-05 16:00+00')
    ) as cases (period_scope, at_instant, time_zone_name, expected_start, expected_end)
  loop
    select b.period_start, b.period_end into bound_start, bound_end
    from public.spending_period_bounds(case_row.period_scope, case_row.at_instant, case_row.time_zone_name) b;

    assert bound_start = case_row.expected_start and bound_end = case_row.expected_end,
      format('límites de %s en %s (%s): %s a %s', case_row.period_scope, case_row.at_instant,
        case_row.time_zone_name, bound_start, bound_end);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 9. Ajustes [RPC]: C confirma su zona y empieza sin compras.
-- ----------------------------------------------------------------------------

do $$
begin
  perform pg_temp.new_user('user_c');
end $$;

select pg_temp.as_user('user_c');
set local role authenticated;

do $$
declare
  saved_adjustment public.spending_adjustments;
  replaced_adjustment public.spending_adjustments;
begin
  perform public.set_spending_time_zone('America/Costa_Rica');

  -- Periodo sin compras (D17): el ajuste es lo que da el total.
  select * into strict saved_adjustment from public.set_period_total('week', 5000);
  assert saved_adjustment.amount = 5000, 'sin compras, el ajuste es el total';
  assert saved_adjustment.scope = 'week', 'el ajuste es del nivel editado';
  assert saved_adjustment.owner_id = current_setting('tacha_test.user_c')::uuid, 'el dueño sale de la sesión';
  -- La hora real de cuando se guardó, no la del inicio de la transacción.
  assert saved_adjustment.effective_at >= now() and saved_adjustment.effective_at <= clock_timestamp(),
    'la fecha la pone la base, con la hora real';

  -- Reemplazar: la misma fila, sin duplicar (regla 50).
  select * into strict replaced_adjustment from public.set_period_total('week', 3000);
  assert replaced_adjustment.id = saved_adjustment.id, 'volver a editar reemplaza la misma fila';
  assert replaced_adjustment.amount = 3000, 'el ajuste nuevo reemplaza al anterior, no se le suma';
  assert (select count(*) from public.spending_adjustments) = 1, 'sigue habiendo un solo ajuste';

  -- Volver al total calculado: se quita y no devuelve filas (regla 50).
  assert (select count(*) from public.set_period_total('week', 0)) = 0, 'si la diferencia es 0, no devuelve ningún ajuste';
  assert (select count(*) from public.spending_adjustments) = 0, 'si la diferencia es 0, el ajuste se quita';

  -- Sin compras y sin ajuste, ₡0 no crea nada.
  assert (select count(*) from public.set_period_total('day', 0)) = 0, '₡0 sin compras no crea un ajuste';
  assert (select count(*) from public.spending_adjustments) = 0, 'sigue sin ajustes';
end $$;

reset role;

-- C cierra hoy tres compras: ₡15 000, ₡0 y una sin total.
do $$
begin
  perform pg_temp.new_purchase('main_session', 'user_c', now(), 15000);
  perform pg_temp.new_purchase('zero_session', 'user_c', now(), 0);
  perform pg_temp.new_purchase('null_session', 'user_c', now(), null);
end $$;

set local role authenticated;

do $$
declare
  saved_adjustment public.spending_adjustments;
begin
  -- La diferencia se calcula en la base (regla 51).
  select * into strict saved_adjustment from public.set_period_total('week', 20000);
  assert saved_adjustment.amount = 5000, 'con ₡15 000 en compras, escribir ₡20 000 da un ajuste de ₡5 000';

  -- Ajuste negativo, con el periodo en ₡0 (regla 47).
  select * into strict saved_adjustment from public.set_period_total('week', 0);
  assert saved_adjustment.amount = -15000, 'un periodo puede quedar en ₡0 con un ajuste negativo';

  assert (select count(*) from public.set_period_total('week', 15000)) = 0, 'volver al total de las compras quita el ajuste';
  assert (select count(*) from public.spending_adjustments) = 0, 'no queda ningún ajuste';
end $$;

reset role;

do $$
begin
  -- Las compras no cambian, tampoco la sin total (D10, regla 49).
  assert pg_temp.total_of('main_session') = 15000, 'el ajuste no cambia el monto de una compra';
  assert pg_temp.total_of('null_session') is null, 'el ajuste no completa la compra sin total';
  assert pg_temp.total_of('zero_session') = 0, 'la compra en ₡0 sigue en ₡0';

  -- Centavos: una compra antigua con decimales y un periodo que da justo lo escrito.
  perform pg_temp.new_purchase('cents_session', 'user_c', now(), 1000.50);
end $$;

set local role authenticated;

do $$
declare
  saved_adjustment public.spending_adjustments;
begin
  select * into strict saved_adjustment from public.set_period_total('week', 20000);
  assert saved_adjustment.amount = 3999.50, 'el ajuste lleva centavos para dar justo lo escrito';
end $$;

reset role;

do $$
begin
  assert pg_temp.total_at('user_c', 'week', now(), 'America/Costa_Rica') = 20000, 'el total da exactamente lo escrito';
  delete from public.spending_adjustments a where a.owner_id = current_setting('tacha_test.user_c')::uuid;
  delete from public.purchase_sessions s where s.id = current_setting('tacha_test.cents_session')::uuid;
end $$;

-- ----------------------------------------------------------------------------
-- 10. Dónde cuenta cada ajuste (regla 52) [RPC], con ₡15 000 en compras de hoy.
-- ----------------------------------------------------------------------------

set local role authenticated;

do $$
begin
  perform * from public.set_period_total('week', 20000);
end $$;

reset role;

do $$
begin
  assert pg_temp.total_at('user_c', 'day', now(), 'America/Costa_Rica') = 15000, 'un ajuste de semana no cambia el día';
  assert pg_temp.total_at('user_c', 'week', now(), 'America/Costa_Rica') = 20000, 'un ajuste de semana cambia la semana';
  assert pg_temp.total_at('user_c', 'month', now(), 'America/Costa_Rica') = 20000, 'un ajuste de semana cambia el mes';
end $$;

set local role authenticated;

do $$
begin
  perform * from public.set_period_total('month', 30000);
end $$;

reset role;

do $$
begin
  assert pg_temp.total_at('user_c', 'day', now(), 'America/Costa_Rica') = 15000, 'un ajuste de mes no cambia el día';
  assert pg_temp.total_at('user_c', 'week', now(), 'America/Costa_Rica') = 20000, 'un ajuste de mes no cambia la semana';
  assert pg_temp.total_at('user_c', 'month', now(), 'America/Costa_Rica') = 30000, 'un ajuste de mes cambia el mes';
end $$;

set local role authenticated;

do $$
begin
  perform * from public.set_period_total('day', 16000);
end $$;

reset role;

do $$
begin
  assert pg_temp.total_at('user_c', 'day', now(), 'America/Costa_Rica') = 16000, 'un ajuste de día cambia el día';
  assert pg_temp.total_at('user_c', 'week', now(), 'America/Costa_Rica') = 21000, 'un ajuste de día también cambia la semana';
  assert pg_temp.total_at('user_c', 'month', now(), 'America/Costa_Rica') = 31000, 'un ajuste de día también cambia el mes';
end $$;

set local role authenticated;

do $$
declare
  saved_adjustment public.spending_adjustments;
begin
  -- ₡15 000 en compras + ₡1 000 del ajuste de día: la diferencia es ₡9 000.
  select * into strict saved_adjustment from public.set_period_total('week', 25000);
  assert saved_adjustment.amount = 9000, 'el cálculo incluye los ajustes de los niveles menores';
end $$;

reset role;

do $$
begin
  assert pg_temp.total_at('user_c', 'week', now(), 'America/Costa_Rica') = 25000, 'la semana da lo escrito';
  delete from public.spending_adjustments a
  where a.owner_id = current_setting('tacha_test.user_c')::uuid and a.scope <> 'week';
end $$;

set local role authenticated;

-- Editar una compra con un ajuste existente no recalcula el ajuste (regla 53).
do $$
begin
  perform public.set_purchase_session_total(current_setting('tacha_test.main_session')::uuid, 17000);
end $$;

reset role;

do $$
begin
  assert (select a.amount from public.spending_adjustments a
          where a.owner_id = current_setting('tacha_test.user_c')::uuid and a.scope = 'week') = 9000,
    'editar una compra no recalcula el ajuste';
  assert pg_temp.total_at('user_c', 'week', now(), 'America/Costa_Rica') = 26000, 'el total se mueve con la diferencia de la compra';

  delete from public.spending_adjustments a where a.owner_id = current_setting('tacha_test.user_c')::uuid;
  update public.purchase_sessions s set total_amount = 10000
  where s.id = current_setting('tacha_test.main_session')::uuid;
end $$;

-- ----------------------------------------------------------------------------
-- 11. D18 (regla 54) y atomicidad [RPC]. C tiene ₡10 000 hoy.
-- ----------------------------------------------------------------------------

set local role authenticated;

do $$
declare
  saved_adjustment public.spending_adjustments;
begin
  select * into strict saved_adjustment from public.set_period_total('week', 8000);
  assert saved_adjustment.amount = -2000, 'ajuste semanal de −₡2 000';

  -- Día en ₡0: −₡10 000 dejaría la semana en −₡2 000. Se rechaza entero.
  begin
    perform * from public.set_period_total('day', 0);
    assert false, 'un ajuste dejó negativa la semana que lo contiene';
  exception when check_violation then
    assert sqlstate = '23514', 'el rechazo lleva el código 23514';
  end;
  assert (select count(*) from public.spending_adjustments a where a.scope = 'day') = 0,
    'atomicidad: el ajuste rechazado no quedó guardado';
  assert (select a.amount from public.spending_adjustments a where a.scope = 'week') = -2000,
    'atomicidad: el ajuste semanal no cambió';

  -- Compra en ₡1 000: la semana quedaría en −₡1 000. Se rechaza entera.
  begin
    perform public.set_purchase_session_total(current_setting('tacha_test.main_session')::uuid, 1000);
    assert false, 'una compra dejó negativo un periodo con ajuste';
  exception when check_violation then
    assert sqlstate = '23514', 'el rechazo lleva el código 23514';
  end;
  assert (select s.total_amount from public.purchase_sessions s
          where s.id = current_setting('tacha_test.main_session')::uuid) = 10000,
    'atomicidad: el total de la compra no cambió';

  -- Compra en ₡2 000: la semana queda justo en ₡0, que es válido.
  perform public.set_purchase_session_total(current_setting('tacha_test.main_session')::uuid, 2000);
end $$;

reset role;

-- [filas fijas] Semana que cruza meses: lunes 29 de septiembre a domingo 5 de octubre
-- de 2025, con un ajuste de −₡5 000 fechado en octubre. El estado se alcanza por las
-- RPC durante esa semana; las fechas fijas lo hacen independiente de hoy.
do $$
begin
  perform pg_temp.new_purchase('september_session', 'user_c', '2025-09-30 18:00+00', 10000);
  perform pg_temp.new_purchase('october_session', 'user_c', '2025-10-02 18:00+00', 8000);
  perform pg_temp.new_purchase('unadjusted_session', 'user_c', '2025-03-10 18:00+00', 4000);

  insert into public.spending_adjustments (owner_id, scope, effective_at, amount)
  values (current_setting('tacha_test.user_c')::uuid, 'week', '2025-10-05 18:00+00', -5000);
end $$;

set local role authenticated;

do $$
begin
  -- ₡4 000: la semana sigue positiva (₡9 000), pero octubre queda en −₡1 000.
  begin
    perform public.set_purchase_session_total(current_setting('tacha_test.october_session')::uuid, 4000);
    assert false, 'una compra histórica dejó negativo el mes que contiene el ajuste';
  exception when check_violation then null;
  end;
  assert (select s.total_amount from public.purchase_sessions s
          where s.id = current_setting('tacha_test.october_session')::uuid) = 8000,
    'atomicidad: la compra histórica no cambió';

  -- ₡5 000: octubre queda justo en ₡0.
  perform public.set_purchase_session_total(current_setting('tacha_test.october_session')::uuid, 5000);

  -- Una compra en periodos sin ajustes baja a ₡0 sin problema.
  perform public.set_purchase_session_total(current_setting('tacha_test.unadjusted_session')::uuid, 0);
end $$;

reset role;

-- [filas fijas] Medianoche repetida. La compra y el ajuste son de la primera 00:30 del 2
-- de noviembre de 2025 en La Habana, y otras compras sostienen la semana y el mes: solo
-- el día decide. Sin resolver la hora repetida, esta edición lo dejaba en −₡1 000.
do $$
begin
  perform pg_temp.new_user('user_h', 'America/Havana');
  perform pg_temp.new_purchase('havana_session', 'user_h', '2025-11-02 04:30+00', 1000);
  perform pg_temp.new_purchase('havana_week_session', 'user_h', '2025-10-30 12:00+00', 5000);
  perform pg_temp.new_purchase('havana_month_session', 'user_h', '2025-11-05 12:00+00', 5000);
  insert into public.spending_adjustments (owner_id, scope, effective_at, amount)
  values (current_setting('tacha_test.user_h')::uuid, 'day', '2025-11-02 04:40+00', -1000);
end $$;

select pg_temp.as_user('user_h');
set local role authenticated;

do $$
begin
  begin
    perform public.set_purchase_session_total(current_setting('tacha_test.havana_session')::uuid, 0);
    assert false, 'una compra dejó negativo el día de una medianoche repetida';
  exception when check_violation then null;
  end;
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 12. Bloqueo por usuario: cada RPC lo toma antes de leer y lo conserva hasta
--     terminar la transacción. La espera real entre dos conexiones no se puede
--     probar en una sola transacción; acá se comprueba el orden en el código de
--     cada RPC y que el bloqueo existe con la clave correcta.
-- ----------------------------------------------------------------------------

do $$
declare
  case_row record;
  function_source text;
begin
  for case_row in
    select * from (values
      ('public.set_purchase_session_total(uuid, numeric)'::regprocedure, 'require_spending_time_zone(current_user_id)'),
      ('public.set_period_total(text, numeric)'::regprocedure, 'require_spending_time_zone(current_user_id)'),
      ('public.set_spending_time_zone(text)'::regprocedure, 'insert into public.spending_time_zones')
    ) as cases (rpc, first_access)
  loop
    function_source := pg_get_functiondef(case_row.rpc);
    assert position('pg_advisory_xact_lock' in function_source) > 0, format('%s toma el bloqueo', case_row.rpc);
    assert position('pg_advisory_xact_lock' in function_source) < position(case_row.first_access in function_source),
      format('%s toma el bloqueo antes de leer o escribir', case_row.rpc);
  end loop;
end $$;

-- [revisión del código] Reemplazar revisa también la fecha de los ajustes anteriores.
-- Solo cambia el resultado en una semana que cruza meses, y la prueba usa la hora actual.
do $$
begin
  assert position(
    'foreach affected_instant in array previous_instants'
    in pg_get_functiondef('public.set_period_total(text, numeric)'::regprocedure)
  ) > 0, 'reemplazar revisa los periodos de la fecha anterior';
end $$;

-- [revisión del código] set_period_total toma la hora real después del bloqueo, y no
-- vuelve a usar now(), que es la del inicio de la transacción.
do $$
declare
  function_source text := pg_get_functiondef('public.set_period_total(text, numeric)'::regprocedure);
begin
  assert position('clock_timestamp()' in function_source) > position('pg_advisory_xact_lock' in function_source),
    'set_period_total toma la hora real después del bloqueo';
  assert position('now()' in function_source) = 0, 'set_period_total no usa la hora del inicio de la transacción';
end $$;

create function pg_temp.holds_user_lock(user_key text)
returns boolean
language sql
as $$
  select exists (
    select 1 from pg_catalog.pg_locks l
    where l.locktype = 'advisory'
      and l.pid = pg_backend_pid()
      and l.granted
      and ((l.classid::bigint << 32) | l.objid::bigint)
        = hashtextextended(current_setting('tacha_test.' || user_key), 0)
  );
$$;

do $$
begin
  perform pg_temp.new_user('user_d', 'America/Costa_Rica');
  perform pg_temp.new_user('user_e', 'America/Costa_Rica');
  perform pg_temp.new_user('user_z');
  assert not pg_temp.holds_user_lock('user_d'), 'D no tiene el bloqueo al empezar';
  assert not pg_temp.holds_user_lock('user_e'), 'E no tiene el bloqueo al empezar';
  assert not pg_temp.holds_user_lock('user_z'), 'Z no tiene el bloqueo al empezar';
  perform pg_temp.new_purchase('session_d', 'user_d', '2025-01-15 13:00+00', 1000);
end $$;

select pg_temp.as_user('user_d');
set local role authenticated;

do $$
begin
  perform public.set_purchase_session_total(current_setting('tacha_test.session_d')::uuid, 2000);
end $$;

reset role;
select pg_temp.as_user('user_e');
set local role authenticated;

do $$
begin
  perform * from public.set_period_total('week', 500);
end $$;

reset role;
select pg_temp.as_user('user_z');
set local role authenticated;

do $$
begin
  perform public.set_spending_time_zone('UTC');
end $$;

reset role;

do $$
begin
  assert pg_temp.holds_user_lock('user_d'), 'set_purchase_session_total conserva el bloqueo';
  assert pg_temp.holds_user_lock('user_e'), 'set_period_total conserva el bloqueo';
  assert pg_temp.holds_user_lock('user_z'), 'set_spending_time_zone conserva el bloqueo';
end $$;

-- ----------------------------------------------------------------------------
-- 13. Lectura (RLS) y cascada al borrar la cuenta.
-- ----------------------------------------------------------------------------

select pg_temp.as_user('user_e');
set local role authenticated;

do $$
begin
  assert (select count(*) from public.spending_adjustments) = 1, 'E ve solo su ajuste';
  assert (select count(*) from public.spending_time_zones) = 1, 'E ve solo su zona';
end $$;

reset role;
select pg_temp.as_user('user_b');
set local role authenticated;

do $$
begin
  assert (select count(*) from public.spending_adjustments) = 0, 'B no ve ajustes ajenos';
end $$;

reset role;
select pg_temp.as_user('user_e', true);
set local role authenticated;

do $$
begin
  assert (select count(*) from public.spending_adjustments) = 0, 'una sesión anónima no ve ajustes';
  assert (select count(*) from public.spending_time_zones) = 0, 'una sesión anónima no ve zonas';
end $$;

reset role;

do $$
begin
  delete from auth.users u where u.id = current_setting('tacha_test.user_e')::uuid;
  assert not exists (
    select 1 from public.spending_adjustments a where a.owner_id = current_setting('tacha_test.user_e')::uuid
  ), 'borrar la cuenta borra sus ajustes';
  assert not exists (
    select 1 from public.spending_time_zones t where t.owner_id = current_setting('tacha_test.user_e')::uuid
  ), 'borrar la cuenta borra su zona';
end $$;

-- ----------------------------------------------------------------------------
-- 14. Sin zona confirmada [RPC]. Un usuario existente y uno nuevo son iguales: sin
--     fila. Nada la asigna solo, ni siquiera al intentar editar.
-- ----------------------------------------------------------------------------

do $$
begin
  perform pg_temp.new_user('user_f');
  perform pg_temp.new_purchase('session_f', 'user_f', now(), 5000);
end $$;

select pg_temp.as_user('user_f');
set local role authenticated;

do $$
declare
  saved_zone public.spending_time_zones;
  bounds_row record;
begin
  begin
    perform public.set_purchase_session_total(current_setting('tacha_test.session_f')::uuid, 4000);
    assert false, 'se editó una compra sin zona confirmada';
  exception when sqlstate 'TZ001' then null;
  end;

  begin
    perform * from public.set_period_total('week', 4000);
    assert false, 'se editó un periodo sin zona confirmada';
  exception when sqlstate 'TZ001' then null;
  end;

  begin
    perform * from public.get_spending_period_bounds('week');
    assert false, 'se leyeron límites sin zona confirmada';
  exception when sqlstate 'TZ001' then null;
  end;

  -- Una compra ajena tampoco revela nada: TZ001 no depende de la compra.
  begin
    perform public.set_purchase_session_total(current_setting('tacha_test.other_owner_session')::uuid, 1);
    assert false, 'F tocó una compra ajena';
  exception when sqlstate 'TZ001' then null;
  end;

  assert (select count(*) from public.spending_time_zones) = 0, 'ningún intento asignó una zona';
  assert (select count(*) from public.spending_adjustments) = 0, 'ningún intento creó un ajuste';
  assert (select s.total_amount from public.purchase_sessions s
          where s.id = current_setting('tacha_test.session_f')::uuid) = 5000,
    'la compra sigue igual';

  -- Confirmar es la única forma: la zona queda guardada y todo funciona.
  saved_zone := public.set_spending_time_zone('America/Costa_Rica');
  assert saved_zone.time_zone = 'America/Costa_Rica', 'devuelve la zona guardada';
  assert saved_zone.owner_id = current_setting('tacha_test.user_f')::uuid, 'el dueño sale de la sesión';

  perform public.set_purchase_session_total(current_setting('tacha_test.session_f')::uuid, 4000);

  select * into strict bounds_row from public.get_spending_period_bounds('month');
  assert bounds_row.period_start = date_trunc('month', now() at time zone 'America/Costa_Rica') at time zone 'America/Costa_Rica',
    'la lectura da el inicio del mes en la zona guardada';
  assert bounds_row.period_end
    = (date_trunc('month', now() at time zone 'America/Costa_Rica') + interval '1 month') at time zone 'America/Costa_Rica',
    'la lectura da el fin del mes en la zona guardada';
end $$;

-- ----------------------------------------------------------------------------
-- 15. El entorno no cambia los periodos [RPC]. Otra zona en la sesión de la base es lo
--     único que se puede simular acá: las RPC ya no reciben ninguna del navegador
--     (paso 1), así que no tienen de dónde tomarla.
-- ----------------------------------------------------------------------------

do $$
declare
  saved_adjustment public.spending_adjustments;
  bounds_before record;
  bounds_after record;
begin
  select * into strict bounds_before from public.get_spending_period_bounds('week');
  select * into strict saved_adjustment from public.set_period_total('week', 8000);
  assert saved_adjustment.amount = 4000, 'ajuste semanal en la zona guardada';

  set local time zone 'Asia/Tokyo';

  select * into strict bounds_after from public.get_spending_period_bounds('week');
  assert bounds_after.period_start = bounds_before.period_start and bounds_after.period_end = bounds_before.period_end,
    'otra zona de sesión no cambia los límites';
  perform * from public.set_period_total('week', 9000);
  assert (select count(*) from public.spending_adjustments) = 1, 'desde otro entorno se reemplaza la misma fila';
  assert (select a.amount from public.spending_adjustments a) = 5000, 'el ajuste se calcula sin acumular';
  assert (select t.time_zone from public.spending_time_zones t) = 'America/Costa_Rica', 'nada cambió la zona guardada';

  set local time zone default;
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 16. Cambiar de zona: D18 en todos los periodos con ajustes.
-- ----------------------------------------------------------------------------

-- [filas fijas] El hallazgo original: un domingo a las 20:00 en Costa Rica ya es lunes
-- en Tokio. El estado se alcanza por las RPC ese domingo; las fechas fijas lo hacen
-- independiente de hoy. La semana de Costa Rica da ₡0; la de Tokio daría −₡5 000.
do $$
begin
  perform pg_temp.new_user('user_j', 'America/Costa_Rica');
  perform pg_temp.new_purchase('wednesday_session', 'user_j', '2025-10-01 18:00+00', 5000);
  insert into public.spending_adjustments (owner_id, scope, effective_at, amount)
  values (current_setting('tacha_test.user_j')::uuid, 'week', '2025-10-06 02:00+00', -5000);
end $$;

select pg_temp.as_user('user_j');
set local role authenticated;

do $$
begin
  begin
    perform public.set_spending_time_zone('Asia/Tokyo');
    assert false, 'el cambio de zona dejó negativa la semana del ajuste';
  exception when check_violation then
    assert sqlstate = '23514', 'el rechazo lleva el código 23514';
  end;

  assert (select t.time_zone from public.spending_time_zones t) = 'America/Costa_Rica',
    'atomicidad: sigue la zona anterior';
end $$;

reset role;

-- Con una compra en esa semana de Tokio, el cambio se acepta.
do $$
begin
  perform pg_temp.new_purchase('monday_session', 'user_j', '2025-10-07 18:00+00', 5000);
end $$;

select pg_temp.as_user('user_j');
set local role authenticated;

do $$
begin
  perform public.set_spending_time_zone('Asia/Tokyo');
  assert (select t.time_zone from public.spending_time_zones t) = 'Asia/Tokyo', 'el cambio quedó guardado';

  -- En la zona nueva, D18 se aplica con sus periodos.
  begin
    perform public.set_purchase_session_total(current_setting('tacha_test.monday_session')::uuid, 4000);
    assert false, 'en la zona nueva, una compra dejó negativa su semana';
  exception when check_violation then null;
  end;
end $$;

reset role;

-- [filas fijas] Bogotá: reemplaza la prueba que dejaba negativa su semana. El 10 de
-- marzo de 2025 a las 04:30 UTC, en Nueva York ya empezó otra semana y en Bogotá no.
-- Un ajuste de esa fecha, sostenido en Nueva York, quedaría en −₡1 000 con Bogotá.
do $$
begin
  perform pg_temp.new_user('user_n', 'America/New_York');
  insert into public.spending_adjustments (owner_id, scope, effective_at, amount)
  values (current_setting('tacha_test.user_n')::uuid, 'week', '2025-03-10 04:30+00', -1000);
  perform pg_temp.new_purchase('new_york_session', 'user_n', '2025-03-11 12:00+00', 1000);
end $$;

select pg_temp.as_user('user_n');
set local role authenticated;

do $$
begin
  -- En Nueva York, D18 protege la semana del ajuste.
  begin
    perform public.set_purchase_session_total(current_setting('tacha_test.new_york_session')::uuid, 999);
    assert false, 'con Nueva York, una compra dejó negativa la semana del ajuste';
  exception when check_violation then null;
  end;

  -- Con Bogotá, el ajuste cae en una semana sin compras: el cambio se rechaza.
  begin
    perform public.set_spending_time_zone('America/Bogota');
    assert false, 'el cambio a Bogotá dejó negativa la semana del ajuste';
  exception when check_violation then null;
  end;
  assert (select t.time_zone from public.spending_time_zones t) = 'America/New_York', 'sigue la zona de Nueva York';
end $$;

reset role;

-- Con una compra en la semana de Bogotá, el cambio se acepta y D18 sigue en ella.
do $$
begin
  perform pg_temp.new_purchase('bogota_session', 'user_n', '2025-03-05 12:00+00', 1000);
end $$;

select pg_temp.as_user('user_n');
set local role authenticated;

do $$
begin
  perform public.set_spending_time_zone('America/Bogota');
  assert (select t.time_zone from public.spending_time_zones t) = 'America/Bogota', 'el cambio quedó guardado';

  begin
    perform public.set_purchase_session_total(current_setting('tacha_test.bogota_session')::uuid, 999);
    assert false, 'con Bogotá, una compra dejó negativa la semana del ajuste';
  exception when check_violation then null;
  end;
end $$;

reset role;

-- [filas fijas] Todos los periodos con ajustes, no solo los recientes: un ajuste de hace
-- años también impide el cambio. Una zona con los mismos límites se acepta.
do $$
begin
  perform pg_temp.new_user('user_q', 'America/Costa_Rica');
  perform pg_temp.new_purchase('old_session', 'user_q', '2015-10-01 18:00+00', 5000);
  insert into public.spending_adjustments (owner_id, scope, effective_at, amount)
  values
    (current_setting('tacha_test.user_q')::uuid, 'week', '2015-10-05 02:00+00', -5000),
    (current_setting('tacha_test.user_q')::uuid, 'day', now(), 500);
end $$;

select pg_temp.as_user('user_q');
set local role authenticated;

do $$
begin
  begin
    perform public.set_spending_time_zone('Asia/Tokyo');
    assert false, 'no se revisaron los ajustes antiguos';
  exception when check_violation then null;
  end;
  assert (select t.time_zone from public.spending_time_zones t) = 'America/Costa_Rica', 'sigue la zona anterior';

  perform public.set_spending_time_zone('America/Guatemala');
  assert (select t.time_zone from public.spending_time_zones t) = 'America/Guatemala', 'los mismos límites se aceptan';
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 17. Zona que PostgreSQL deja de reconocer. [filas fijas] La RPC no guarda una así: el
--     estado solo aparece si cambia la base de zonas.
-- ----------------------------------------------------------------------------

do $$
begin
  perform pg_temp.new_user('user_u', 'Marte/Olympus');
  perform pg_temp.new_purchase('session_u', 'user_u', now(), 5000);
  insert into public.spending_adjustments (owner_id, scope, effective_at, amount)
  values (current_setting('tacha_test.user_u')::uuid, 'month', now(), -1000);
end $$;

select pg_temp.as_user('user_u');
set local role authenticated;

do $$
begin
  begin
    perform public.set_purchase_session_total(current_setting('tacha_test.session_u')::uuid, 4000);
    assert false, 'se editó una compra con una zona que PostgreSQL no reconoce';
  exception when sqlstate 'TZ002' then null;
  end;

  begin
    perform * from public.set_period_total('month', 4000);
    assert false, 'se editó un periodo con una zona que PostgreSQL no reconoce';
  exception when sqlstate 'TZ002' then null;
  end;

  -- La lectura tampoco cae a otra zona: hay ajustes que no se mostrarían.
  begin
    perform public.get_period_finance('month');
    assert false, 'se leyó Finanzas con una zona que PostgreSQL no reconoce';
  exception when sqlstate 'TZ002' then null;
  end;

  begin
    perform * from public.get_spending_period_bounds('month');
    assert false, 'se leyeron límites con una zona que PostgreSQL no reconoce';
  exception when sqlstate 'TZ002' then null;
  end;

  -- La salida es confirmar otra zona, y D18 se revisa en ella.
  perform public.set_spending_time_zone('America/Costa_Rica');
  perform public.set_purchase_session_total(current_setting('tacha_test.session_u')::uuid, 4000);

  begin
    perform public.set_purchase_session_total(current_setting('tacha_test.session_u')::uuid, 999);
    assert false, 'una compra dejó negativo el mes del ajuste';
  exception when check_violation then null;
  end;
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 18. Reemplazar conserva la fecha, y une ajustes del mismo periodo.
-- ----------------------------------------------------------------------------

-- [filas fijas] Un ajuste semanal fechado al inicio de la semana en curso. Si reemplazar
-- moviera su fecha a hoy, en una semana que cruza meses el mes anterior lo perdería.
do $$
begin
  perform pg_temp.new_user('user_r', 'America/Costa_Rica');
  insert into public.spending_adjustments (owner_id, scope, effective_at, amount)
  values (
    current_setting('tacha_test.user_r')::uuid, 'week',
    date_trunc('week', now() at time zone 'America/Costa_Rica') at time zone 'America/Costa_Rica',
    1000
  );
end $$;

select pg_temp.as_user('user_r');
set local role authenticated;

do $$
declare
  saved_adjustment public.spending_adjustments;
begin
  select * into strict saved_adjustment from public.set_period_total('week', 2000);
  assert saved_adjustment.amount = 2000, 'el ajuste se reemplazó';
  assert saved_adjustment.effective_at
    = date_trunc('week', now() at time zone 'America/Costa_Rica') at time zone 'America/Costa_Rica',
    'reemplazar conserva la fecha del ajuste';
end $$;

reset role;

-- [filas fijas] Dos ajustes del mismo nivel en un periodo: se alcanza cambiando de zona,
-- cuando dos semanas distintas caen en una sola. Editar los une en el más antiguo.
do $$
begin
  perform pg_temp.new_user('user_v', 'America/Costa_Rica');
  insert into public.spending_adjustments (owner_id, scope, effective_at, amount)
  values
    (
      current_setting('tacha_test.user_v')::uuid, 'week',
      date_trunc('week', now() at time zone 'America/Costa_Rica') at time zone 'America/Costa_Rica',
      1000
    ),
    (current_setting('tacha_test.user_v')::uuid, 'week', now(), 2000);
end $$;

select pg_temp.as_user('user_v');
set local role authenticated;

do $$
declare
  saved_adjustment public.spending_adjustments;
begin
  select * into strict saved_adjustment from public.set_period_total('week', 5000);
  assert saved_adjustment.amount = 5000, 'el total da lo escrito, sin acumular los dos ajustes';
  assert (select count(*) from public.spending_adjustments) = 1, 'queda un solo ajuste en el periodo';
  assert saved_adjustment.effective_at
    = date_trunc('week', now() at time zone 'America/Costa_Rica') at time zone 'America/Costa_Rica',
    'se conserva el más antiguo';

  assert (select count(*) from public.set_period_total('week', 0)) = 0, 'volver al total de las compras quita el ajuste';
  assert (select count(*) from public.spending_adjustments) = 0, 'no queda ningún ajuste';
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 19. Rango de los ajustes [filas fijas]: 101 compras en el tope no caben en
--     numeric(14, 2).
-- ----------------------------------------------------------------------------

do $$
begin
  perform pg_temp.new_user('user_g', 'America/Costa_Rica');
  insert into public.purchase_sessions (owner_id, store_id, closed_at, total_amount)
  select
    current_setting('tacha_test.user_g')::uuid,
    (select s.id from public.stores s order by s.slug limit 1),
    now(),
    9999999999
  from generate_series(1, 101);
end $$;

select pg_temp.as_user('user_g');
set local role authenticated;

do $$
declare
  saved_adjustment public.spending_adjustments;
begin
  select * into strict saved_adjustment from public.set_period_total('week', 0);
  assert saved_adjustment.amount = -1009999999899, 'el ajuste admite la suma de muchas compras';
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 20. get_period_finance [RPC]: W tiene compras de hoy (₡10 000, ₡0 y una sin total)
--     y un ajuste semanal. Todo sale de una sola lectura y cuadra con las RPC.
-- ----------------------------------------------------------------------------

do $$
begin
  perform pg_temp.new_user('user_w', 'America/Costa_Rica');
  perform pg_temp.new_purchase('w_main', 'user_w', now() - interval '1 second', 10000);
  perform pg_temp.new_purchase('w_zero', 'user_w', now() - interval '2 seconds', 0);
  perform pg_temp.new_purchase('w_null', 'user_w', now() - interval '3 seconds', null);
  perform pg_temp.new_purchase('w_old', 'user_w', '2025-01-15 13:00+00', 7000);
  update public.stores s set display_name = '   ' where s.id = (select st.id from public.stores st order by st.slug limit 1);
end $$;

select pg_temp.as_user('user_w');
set local role authenticated;

do $$
declare
  week_finance jsonb;
  day_finance jsonb;
  bounds_row record;
begin
  perform * from public.set_period_total('week', 20000);
  week_finance := public.get_period_finance('week');

  select * into strict bounds_row from public.get_spending_period_bounds('week');
  assert week_finance ->> 'time_zone' = 'America/Costa_Rica', 'devuelve la zona guardada';
  assert (week_finance ->> 'period_start')::timestamptz = bounds_row.period_start
    and (week_finance ->> 'period_end')::timestamptz = bounds_row.period_end,
    'los límites son los mismos de get_spending_period_bounds';
  assert (week_finance ->> 'total')::numeric = 20000, 'el total incluye compras y ajustes';
  assert (week_finance ->> 'closed_count')::int = 2, 'una compra en ₡0 cuenta como compra';
  assert (week_finance ->> 'without_total_count')::int = 1, 'una compra sin total cuenta aparte';
  assert (week_finance ->> 'adjustment_count')::int = 1, 'el ajuste no cuenta como compra';
  assert jsonb_array_length(week_finance -> 'purchases') = 3, 'solo las compras del periodo';
  assert (week_finance -> 'purchases' -> 0 ->> 'id')::uuid = current_setting('tacha_test.w_main')::uuid,
    'de la más reciente a la más antigua';
  assert week_finance -> 'purchases' -> 0 -> 'store_name' = 'null'::jsonb,
    'un supermercado en blanco llega como null y la compra se conserva';
  assert (week_finance -> 'adjustments' -> 0 ->> 'amount')::numeric = 10000, 'el ajuste viene en la misma lectura';

  -- En el día, el ajuste de semana no cuenta (regla 52).
  day_finance := public.get_period_finance('day');
  assert (day_finance ->> 'adjustment_count')::int = 0, 'un ajuste de semana no cuenta en el día';
  assert (day_finance ->> 'total')::numeric = 10000, 'el día suma solo sus compras';

  begin
    perform public.get_period_finance('year');
    assert false, 'se leyó un periodo desconocido';
  exception when invalid_parameter_value then null;
  end;
end $$;

reset role;

-- Otra cuenta no ve nada de W, y una sesión anónima no lee.
select pg_temp.as_user('user_b');
set local role authenticated;

do $$
declare
  other_finance jsonb := public.get_period_finance('week');
begin
  assert jsonb_array_length(other_finance -> 'purchases') = 0, 'B no ve las compras de W';
  assert jsonb_array_length(other_finance -> 'adjustments') = 0, 'B no ve los ajustes de W';
end $$;

reset role;
select pg_temp.as_user('user_w', true);
set local role authenticated;

do $$
begin
  begin
    perform public.get_period_finance('week');
    assert false, 'una sesión anónima leyó Finanzas';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.get_period_finance('year');
    assert false, 'una sesión anónima leyó un periodo desconocido';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- Sin zona confirmada no es un error: time_zone null, sin límites, compras ni total.
do $$
begin
  perform pg_temp.new_user('user_y');
  perform pg_temp.new_purchase('y_session', 'user_y', now(), 5000);
end $$;

select pg_temp.as_user('user_y');
set local role authenticated;

do $$
declare
  finance jsonb := public.get_period_finance('week');
begin
  assert finance -> 'time_zone' = 'null'::jsonb, 'sin zona, time_zone es null';
  assert finance -> 'period_start' = 'null'::jsonb and finance -> 'period_end' = 'null'::jsonb, 'sin zona no hay límites';
  assert finance -> 'total' = 'null'::jsonb, 'sin zona no hay total';
  assert jsonb_array_length(finance -> 'purchases') = 0, 'sin zona no se devuelven compras';
  assert (select count(*) from public.spending_time_zones) = 0, 'leer no asigna una zona';
end $$;

reset role;

-- [revisión del código] Una sola sentencia: la lectura es una función SQL estable, y
-- no toma la hora real (clock_timestamp), que cambiaría dentro de la misma lectura.
do $$
declare
  read_function regprocedure := 'public.get_period_finance(text)'::regprocedure;
begin
  assert (select l.lanname from pg_proc p join pg_language l on l.oid = p.prolang where p.oid = read_function) = 'sql',
    'get_period_finance es una sola sentencia SQL';
  assert (select p.provolatile from pg_proc p where p.oid = read_function) = 's', 'get_period_finance es estable';
  assert position('clock_timestamp' in pg_get_functiondef(read_function)) = 0,
    'get_period_finance usa una sola referencia de hora';
end $$;

-- ----------------------------------------------------------------------------
-- 21. Un periodo que ya era negativo [filas fijas]: solo aparece por un cambio fuera de
--     la aplicación o de la base de zonas. Nada lo oculta ni lo agrava: cualquier
--     operación que lo toque se rechaza, y la lectura lo muestra.
-- ----------------------------------------------------------------------------

do $$
begin
  perform pg_temp.new_user('user_x', 'America/Costa_Rica');
  perform pg_temp.new_purchase('x_today', 'user_x', now() - interval '1 second', 1000);
  perform pg_temp.new_purchase('x_old', 'user_x', '2025-01-15 13:00+00', 3000);
  insert into public.spending_adjustments (owner_id, scope, effective_at, amount)
  values (current_setting('tacha_test.user_x')::uuid, 'day', now() - interval '1 second', -5000);
end $$;

select pg_temp.as_user('user_x');
set local role authenticated;

do $$
begin
  assert (public.get_period_finance('day') ->> 'total')::numeric = -4000, 'la lectura muestra el negativo, no lo oculta';

  -- Subir la compra sin cubrir el déficit sigue dejando el día negativo: se rechaza.
  begin
    perform public.set_purchase_session_total(current_setting('tacha_test.x_today')::uuid, 2000);
    assert false, 'una operación dejó un periodo negativo';
  exception when check_violation then null;
  end;

  -- Un ajuste de semana tocaría el día negativo: se rechaza.
  begin
    perform * from public.set_period_total('week', 50000);
    assert false, 'un ajuste de semana pasó por encima de un día negativo';
  exception when check_violation then null;
  end;

  -- Cambiar de zona también lo revisa.
  begin
    perform public.set_spending_time_zone('America/Guatemala');
    assert false, 'un cambio de zona pasó por encima de un periodo negativo';
  exception when check_violation then null;
  end;

  -- Lo que no lo toca sigue funcionando.
  perform public.set_purchase_session_total(current_setting('tacha_test.x_old')::uuid, 2500);

  -- Si es el periodo en curso, la persona lo arregla escribiendo su total.
  perform * from public.set_period_total('day', 1000);
  assert (public.get_period_finance('day') ->> 'total')::numeric = 1000, 'el día quedó en lo escrito';
end $$;

reset role;

select set_config('tacha_test.done', 'ok', true);

rollback;
