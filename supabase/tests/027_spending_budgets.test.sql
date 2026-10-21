-- ============================================================================
-- Prueba de la migración 027 (SCRUM-69): presupuestos de Finanzas.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 027. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios ni presupuestos en la base compartida. Si
-- una regla no se cumple, un `assert` corta con su mensaje; si termina sin
-- error, pasó. Contra la base sin 027 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- El editor muestra el resultado de la última sentencia que devuelve filas: al
-- terminar bien se ve la fila del último `select set_config(...)`. Un error
-- sale en rojo.
--
-- Datos:
--   A: usuario registrado, sin presupuestos al empezar.
--   B: usuario registrado con un presupuesto semanal de 30000 (lo crea el
--      dueño de la tabla, sin pasar por la RLS).
--
-- Qué comprueba (features/finance/specs/SPEC.md §13, "Base"):
--   1. permisos de la tabla, de sus columnas y de la RPC; RLS y políticas;
--   2. sin sesión: la RPC responde 42501 y la tabla no muestra nada;
--   3. sesión anónima (con el id de B): ninguna operación de presupuesto;
--   4. A crea los tres periodos y reemplazar no duplica;
--   5. validaciones de la RPC (22023) y de los checks de la tabla;
--   6. A no lee, cambia ni borra lo de B, ni se pone como dueño de otro;
--   7. A borra lo suyo; al borrar la cuenta se borran sus presupuestos.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño). Los ids viajan entre pasos en variables de la
--    transacción (set_config(..., true)).
-- ----------------------------------------------------------------------------

do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
begin
  insert into auth.users (id, aud, role, email)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha');

  insert into public.spending_budgets (owner_id, period, amount)
  values (user_b, 'week', 30000);

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_b', user_b::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos (rol dueño).
-- ----------------------------------------------------------------------------

do $$
begin
  assert (select c.relrowsecurity from pg_class c where c.oid = 'public.spending_budgets'::regclass),
    'spending_budgets tiene que tener RLS activada';

  -- Las cuatro políticas, y ninguna más.
  assert (select count(*) from pg_policies p
          where p.schemaname = 'public' and p.tablename = 'spending_budgets') = 4,
    'spending_budgets tiene que tener exactamente cuatro políticas';
  assert not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = 'spending_budgets'
      and (p.roles <> '{authenticated}' or p.permissive <> 'PERMISSIVE')
  ), 'las políticas de spending_budgets son permisivas y solo para authenticated';

  -- Tabla: nada para anon ni para public.
  assert not has_table_privilege('anon', 'public.spending_budgets', 'select'), 'anon no lee spending_budgets';
  assert not has_table_privilege('anon', 'public.spending_budgets', 'insert'), 'anon no inserta en spending_budgets';
  assert not has_table_privilege('anon', 'public.spending_budgets', 'update'), 'anon no actualiza spending_budgets';
  assert not has_table_privilege('anon', 'public.spending_budgets', 'delete'), 'anon no borra spending_budgets';
  assert not exists (
    select 1 from pg_class c, aclexplode(c.relacl) a
    where c.oid = 'public.spending_budgets'::regclass and a.grantee = 0
  ), 'public no tiene permisos sobre spending_budgets';

  -- authenticated: leer y borrar la tabla; escribir solo periodo y monto.
  assert has_table_privilege('authenticated', 'public.spending_budgets', 'select'), 'authenticated lee spending_budgets';
  assert has_table_privilege('authenticated', 'public.spending_budgets', 'delete'), 'authenticated borra spending_budgets';
  assert not has_column_privilege('authenticated', 'public.spending_budgets', 'owner_id', 'insert'),
    'authenticated no elige el dueño al insertar';
  assert has_column_privilege('authenticated', 'public.spending_budgets', 'period', 'insert'),
    'authenticated inserta el periodo';
  assert has_column_privilege('authenticated', 'public.spending_budgets', 'amount', 'insert'),
    'authenticated inserta el monto';
  assert not has_column_privilege('authenticated', 'public.spending_budgets', 'owner_id', 'update'),
    'authenticated no cambia el dueño';
  assert not has_column_privilege('authenticated', 'public.spending_budgets', 'period', 'update'),
    'authenticated no cambia el periodo de una fila';
  assert has_column_privilege('authenticated', 'public.spending_budgets', 'amount', 'update'),
    'authenticated cambia el monto';

  -- RPC: solo authenticated.
  assert not has_function_privilege('anon', 'public.set_spending_budget(text, numeric)', 'execute'),
    'anon no ejecuta set_spending_budget';
  assert has_function_privilege('authenticated', 'public.set_spending_budget(text, numeric)', 'execute'),
    'authenticated ejecuta set_spending_budget';
  assert not exists (
    select 1 from pg_proc p, aclexplode(p.proacl) a
    where p.oid = 'public.set_spending_budget(text, numeric)'::regprocedure
      and a.grantee = 0 and a.privilege_type = 'EXECUTE'
  ), 'public no ejecuta set_spending_budget';
  assert not (select p.prosecdef from pg_proc p
              where p.oid = 'public.set_spending_budget(text, numeric)'::regprocedure),
    'set_spending_budget tiene que ser security invoker';
end $$;

-- ----------------------------------------------------------------------------
-- 2. Sin sesión: la RPC rechaza (42501) y la tabla no muestra nada.
-- ----------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{}', true);

do $$
begin
  begin
    perform public.set_spending_budget('day', 1000);
    assert false, 'sin sesión se pudo guardar un presupuesto';
  exception
    -- 42501, y por la falta de cuenta: así la prueba falla si se quita la
    -- validación de sesión.
    when insufficient_privilege then
      assert sqlerrm like 'Se requiere una cuenta registrada%', 'sin sesión: el 42501 tiene que ser por falta de cuenta';
  end;

  assert (select count(*) from public.spending_budgets) = 0, 'sin sesión no se ve ningún presupuesto';
end $$;

-- ----------------------------------------------------------------------------
-- 3. Sesión anónima con el id de B (un usuario authenticated con
--    is_anonymous): no lee, no crea, no cambia ni borra, ni siquiera sus filas.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('tacha_test.user_b'), 'role', 'authenticated', 'is_anonymous', true
  )::text,
  true
);

do $$
declare
  affected_rows integer;
begin
  begin
    perform public.set_spending_budget('day', 1000);
    assert false, 'una sesión anónima pudo guardar un presupuesto';
  exception
    when insufficient_privilege then
      assert sqlerrm like 'Se requiere una cuenta registrada%', 'sesión anónima: el 42501 tiene que ser por anónima';
  end;

  assert (select count(*) from public.spending_budgets) = 0,
    'una sesión anónima no ve presupuestos, aunque haya filas con su id';

  begin
    insert into public.spending_budgets (period, amount) values ('day', 1000);
    assert false, 'una sesión anónima pudo insertar un presupuesto';
  exception
    -- "new row violates row-level security policy" es 42501.
    when insufficient_privilege then null;
  end;

  update public.spending_budgets set amount = 1 where true;
  get diagnostics affected_rows = row_count;
  assert affected_rows = 0, 'una sesión anónima pudo cambiar un presupuesto';

  delete from public.spending_budgets where true;
  get diagnostics affected_rows = row_count;
  assert affected_rows = 0, 'una sesión anónima pudo borrar un presupuesto';
end $$;

-- El rol anon (sin sesión de Supabase) no tiene ni el permiso de la tabla.
reset role;
set local role anon;

do $$
begin
  begin
    perform 1 from public.spending_budgets;
    assert false, 'el rol anon pudo leer spending_budgets';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.set_spending_budget('day', 1000);
    assert false, 'el rol anon pudo ejecutar set_spending_budget';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

do $$
begin
  assert (select s.amount from public.spending_budgets s
          where s.owner_id = current_setting('tacha_test.user_b')::uuid and s.period = 'week') = 30000,
    'el presupuesto de B no cambió con la sesión anónima';
  assert (select count(*) from public.spending_budgets s
          where s.owner_id = current_setting('tacha_test.user_b')::uuid) = 1,
    'la sesión anónima no agregó presupuestos a B';
end $$;

-- ----------------------------------------------------------------------------
-- 4. A (registrado): crea los tres periodos, independientes; reemplazar deja
--    una sola fila con el monto nuevo.
-- ----------------------------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('tacha_test.user_a'), 'role', 'authenticated', 'is_anonymous', false
  )::text,
  true
);

do $$
declare
  saved_budget public.spending_budgets;
begin
  saved_budget := public.set_spending_budget('day', 5000);
  assert saved_budget.owner_id = current_setting('tacha_test.user_a')::uuid, 'el dueño sale de la sesión';
  assert saved_budget.period = 'day' and saved_budget.amount = 5000, 'devuelve la fila guardada';

  perform public.set_spending_budget('week', 50000);
  perform public.set_spending_budget('month', 0);

  assert (select count(*) from public.spending_budgets) = 3, 'A ve solo sus tres presupuestos';

  saved_budget := public.set_spending_budget('week', 12000);
  assert saved_budget.amount = 12000, 'reemplazar devuelve el monto nuevo';
  assert (select count(*) from public.spending_budgets s where s.period = 'week') = 1,
    'reemplazar no duplica el presupuesto semanal';
  assert (select s.amount from public.spending_budgets s where s.period = 'day') = 5000,
    'cambiar el semanal no toca el diario';
  assert (select s.amount from public.spending_budgets s where s.period = 'month') = 0,
    'cambiar el semanal no toca el mensual; ₡0 es un presupuesto válido';

  -- Separadores de miles ya resueltos por el cliente: llega un número entero.
  perform public.set_spending_budget('month', 9999999999);
  assert (select s.amount from public.spending_budgets s where s.period = 'month') = 9999999999,
    'el tope 9.999.999.999 se acepta';
end $$;

-- ----------------------------------------------------------------------------
-- 5. Validaciones: la RPC responde 22023; un insert directo choca con los checks.
-- ----------------------------------------------------------------------------

do $$
begin
  begin perform public.set_spending_budget('year', 1000);
    assert false, 'se aceptó un periodo desconocido';
  exception when invalid_parameter_value then null; end;

  begin perform public.set_spending_budget(null, 1000);
    assert false, 'se aceptó un periodo nulo';
  exception when invalid_parameter_value then null; end;

  begin perform public.set_spending_budget('day', null);
    assert false, 'se aceptó un monto nulo';
  exception when invalid_parameter_value then null; end;

  begin perform public.set_spending_budget('day', -1);
    assert false, 'se aceptó un monto negativo';
  exception when invalid_parameter_value then null; end;

  begin perform public.set_spending_budget('day', 12.5);
    assert false, 'se aceptó un monto con decimales';
  exception when invalid_parameter_value then null; end;

  begin perform public.set_spending_budget('day', 'NaN'::numeric);
    assert false, 'se aceptó NaN';
  exception when invalid_parameter_value then null; end;

  begin perform public.set_spending_budget('day', 10000000000);
    assert false, 'se aceptó un monto sobre el tope';
  exception when invalid_parameter_value then null; end;

  begin perform public.set_spending_budget('day', 'Infinity'::numeric);
    assert false, 'se aceptó Infinity';
  exception when invalid_parameter_value then null; end;

  begin perform public.set_spending_budget('day', '-Infinity'::numeric);
    assert false, 'se aceptó -Infinity';
  exception when invalid_parameter_value then null; end;

  assert (select s.amount from public.spending_budgets s where s.period = 'day') = 5000,
    'los intentos inválidos no cambiaron el presupuesto diario';

  -- Por la tabla, sin la RPC: los checks rechazan lo mismo. Se usa un periodo
  -- nuevo para que no choque con la clave primaria antes que con el check.
  delete from public.spending_budgets s where s.period = 'day';

  begin insert into public.spending_budgets (period, amount) values ('year', 1000);
    assert false, 'la tabla aceptó un periodo desconocido';
  exception when check_violation then null; end;

  begin insert into public.spending_budgets (period, amount) values ('day', 12.5);
    assert false, 'la tabla aceptó un monto con decimales';
  exception when check_violation then null; end;

  begin insert into public.spending_budgets (period, amount) values ('day', -1);
    assert false, 'la tabla aceptó un monto negativo';
  exception when check_violation then null; end;

  begin insert into public.spending_budgets (period, amount) values ('day', 'NaN'::numeric);
    assert false, 'la tabla aceptó NaN';
  exception when check_violation then null; end;

  -- Con más decimales que centavos: no se redondea en silencio a 12.
  begin insert into public.spending_budgets (period, amount) values ('day', 12.004);
    assert false, 'la tabla aceptó 12.004 (redondeado)';
  exception when check_violation then null; end;

  begin insert into public.spending_budgets (period, amount) values ('day', 10000000000);
    assert false, 'la tabla aceptó un monto sobre el tope';
  exception when check_violation then null; end;

  begin insert into public.spending_budgets (period, amount) values ('day', 'Infinity'::numeric);
    assert false, 'la tabla aceptó Infinity';
  exception when check_violation then null; end;

  assert (select count(*) from public.spending_budgets s where s.period = 'day') = 0,
    'ningún insert inválido quedó guardado';

  -- Un update directo de la fila propia, sin la RPC, choca con los mismos checks.
  begin update public.spending_budgets s set amount = -1 where s.period = 'week';
    assert false, 'un update directo aceptó un monto negativo';
  exception when check_violation then null; end;

  begin update public.spending_budgets s set amount = 'NaN'::numeric where s.period = 'week';
    assert false, 'un update directo aceptó NaN';
  exception when check_violation then null; end;

  assert (select s.amount from public.spending_budgets s where s.period = 'week') = 12000,
    'los updates inválidos no cambiaron el presupuesto semanal';
end $$;

-- ----------------------------------------------------------------------------
-- 6. Aislamiento: A no lee, cambia ni borra el presupuesto de B, ni escribe
--    con el dueño de otro ni cambia el periodo de una fila.
-- ----------------------------------------------------------------------------

do $$
declare
  affected_rows integer;
begin
  assert (select count(*) from public.spending_budgets s
          where s.owner_id = current_setting('tacha_test.user_b')::uuid) = 0,
    'A no ve el presupuesto de B';

  update public.spending_budgets s set amount = 1
  where s.owner_id = current_setting('tacha_test.user_b')::uuid;
  get diagnostics affected_rows = row_count;
  assert affected_rows = 0, 'A pudo cambiar el presupuesto de B';

  delete from public.spending_budgets s
  where s.owner_id = current_setting('tacha_test.user_b')::uuid;
  get diagnostics affected_rows = row_count;
  assert affected_rows = 0, 'A pudo borrar el presupuesto de B';

  -- Sin permiso de columna sobre owner_id: ni siquiera llega a la RLS.
  begin
    insert into public.spending_budgets (owner_id, period, amount)
    values (current_setting('tacha_test.user_b')::uuid, 'day', 1);
    assert false, 'A pudo insertar un presupuesto a nombre de B';
  exception when insufficient_privilege then null; end;

  begin
    update public.spending_budgets s set period = 'day' where s.period = 'week';
    assert false, 'A pudo cambiar el periodo de una fila';
  exception when insufficient_privilege then null; end;

  -- La RPC solo escribe lo de quien llama: el semanal de A cambia, el de B no.
  perform public.set_spending_budget('week', 7000);
end $$;

reset role;

do $$
begin
  assert (select s.amount from public.spending_budgets s
          where s.owner_id = current_setting('tacha_test.user_b')::uuid and s.period = 'week') = 30000,
    'el presupuesto semanal de B sigue en 30000';
  assert (select s.amount from public.spending_budgets s
          where s.owner_id = current_setting('tacha_test.user_a')::uuid and s.period = 'week') = 7000,
    'el presupuesto semanal de A quedó en 7000';
end $$;

-- ----------------------------------------------------------------------------
-- 7. A borra lo suyo; al borrar la cuenta de B se borran sus presupuestos.
--    Acá el JWT de A no trae is_anonymous (el coalesce lo toma como cuenta
--    registrada): A sigue pudiendo leer, guardar y borrar.
-- ----------------------------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  assert (select count(*) from public.spending_budgets) = 2,
    'sin el claim is_anonymous, A ve sus dos presupuestos (semanal y mensual)';
  perform public.set_spending_budget('day', 3000);
  assert (select s.amount from public.spending_budgets s where s.period = 'day') = 3000,
    'sin el claim is_anonymous, A puede guardar';
end $$;

do $$
declare
  affected_rows integer;
begin
  delete from public.spending_budgets s where s.period = 'month';
  get diagnostics affected_rows = row_count;
  assert affected_rows = 1, 'A pudo borrar su presupuesto mensual';
end $$;

reset role;

do $$
begin
  delete from auth.users u where u.id = current_setting('tacha_test.user_b')::uuid;
  assert not exists (
    select 1 from public.spending_budgets s
    where s.owner_id = current_setting('tacha_test.user_b')::uuid
  ), 'borrar la cuenta borra sus presupuestos (on delete cascade)';
end $$;

select set_config('tacha_test.done', 'ok', true);

rollback;
