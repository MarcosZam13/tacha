-- ============================================================================
-- Prueba de la migración 019 (SCRUM-100): plan semanal (meal_plans).
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 019. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios, recetas ni espacios en la base
-- compartida. Si una regla no se cumple, un `assert` corta con su mensaje; si
-- termina sin error, pasó. Contra la base sin 019 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- El editor muestra el resultado de la última sentencia que devuelve filas, no
-- de la última sentencia: al terminar bien se ve la fila del último
-- `select set_config(...)`, no "No rows returned". Un error sale en rojo.
--
-- Datos: dos usuarios (A y B), dos recetas de A y una de B. Recetas con un
-- ingrediente cada una no hace falta: meal_plans solo guarda el id de la receta.
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
  recipe_a1 uuid := gen_random_uuid();
  recipe_a2 uuid := gen_random_uuid();
  recipe_b uuid := gen_random_uuid();
begin
  insert into auth.users (id, aud, role, email)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha');

  insert into public.recipes (id, owner_id, name, base_servings)
  values
    (recipe_a1, user_a, 'Receta A1 SCRUM-100', 4),
    (recipe_a2, user_a, 'Receta A2 SCRUM-100', 6),
    (recipe_b, user_b, 'Receta B SCRUM-100', 2);

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_b', user_b::text, true);
  perform set_config('tacha_test.recipe_a1', recipe_a1::text, true);
  perform set_config('tacha_test.recipe_a2', recipe_a2::text, true);
  perform set_config('tacha_test.recipe_b', recipe_b::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Usuario A: asignar, reemplazar y los tres espacios de un día.
-- ----------------------------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  first_id uuid;
  second_id uuid;
  slot public.meal_plans;
begin
  -- Asignar: queda del usuario, sin household, con el cocinero propio.
  first_id := public.assign_meal_slot(
    date '2026-10-12', 'lunch', current_setting('tacha_test.recipe_a1')::uuid, true, 1
  );

  select * into slot from public.meal_plans where id = first_id;
  assert slot.owner_id = auth.uid(), 'el espacio es del usuario: owner_id sale de la base';
  assert slot.household_id is null, 'el plan es personal: household_id es nulo';
  assert slot.assigned_cook = auth.uid(), 'cook_is_self pone al propio usuario como cocinero';
  assert slot.servings_multiplier = 1, 'multiplicador ×1';
  assert slot.recipe_id = current_setting('tacha_test.recipe_a1')::uuid, 'receta asignada';

  -- Reemplazar: misma fila, receta nueva, sin cocinero y ×2,5. No se acumulan.
  second_id := public.assign_meal_slot(
    date '2026-10-12', 'lunch', current_setting('tacha_test.recipe_a2')::uuid, false, 2.5
  );

  assert second_id = first_id, 'reasignar reemplaza el espacio: misma fila';
  assert (select count(*) from public.meal_plans where date = '2026-10-12' and meal_type = 'lunch') = 1,
    'un solo espacio por día y comida';

  select * into slot from public.meal_plans where id = first_id;
  assert slot.recipe_id = current_setting('tacha_test.recipe_a2')::uuid, 'la receta se reemplazó';
  assert slot.assigned_cook is null, 'cook_is_self = false deja el espacio sin cocinero';
  assert slot.servings_multiplier = 2.5, 'el multiplicador se reemplazó';

  -- Los tres espacios del día y la misma comida en otro día no chocan.
  perform public.assign_meal_slot(date '2026-10-12', 'breakfast', current_setting('tacha_test.recipe_a1')::uuid, true, 1);
  perform public.assign_meal_slot(date '2026-10-12', 'dinner', current_setting('tacha_test.recipe_a1')::uuid, true, 0.5);
  perform public.assign_meal_slot(date '2026-10-13', 'lunch', current_setting('tacha_test.recipe_a1')::uuid, true, 4);

  assert (select count(*) from public.meal_plans) = 4, 'tres comidas del lunes y una del martes';

  perform set_config('tacha_test.slot_id', first_id::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 2. Usuario A, límites: el multiplicador y el tipo de comida los valida la
--    base aunque se llame a la RPC directo.
-- ----------------------------------------------------------------------------

do $$
declare
  bad_multiplier numeric;
begin
  -- Fuera de rango, no múltiplo de 0,5, y los valores especiales de numeric.
  foreach bad_multiplier in array array[0, 0.3, 0.4, 4.5, 5, 2.04, -1, 'NaN'::numeric, 'Infinity'::numeric]
  loop
    begin
      perform public.assign_meal_slot(
        date '2026-10-14', 'lunch', current_setting('tacha_test.recipe_a1')::uuid, true, bad_multiplier
      );
      assert false, format('el multiplicador %s no se rechazó', bad_multiplier);
    exception
      when check_violation then null; -- 23514
    end;
  end loop;

  -- Los extremos válidos sí entran.
  perform public.assign_meal_slot(date '2026-10-14', 'lunch', current_setting('tacha_test.recipe_a1')::uuid, true, 0.5);
  perform public.assign_meal_slot(date '2026-10-14', 'lunch', current_setting('tacha_test.recipe_a1')::uuid, true, 4);

  begin
    perform public.assign_meal_slot(
      date '2026-10-14', 'brunch', current_setting('tacha_test.recipe_a1')::uuid, true, 1
    );
    assert false, 'un tipo de comida inventado no se rechazó';
  exception
    when check_violation then null;
  end;

  assert (select count(*) from public.meal_plans where date = '2026-10-14') = 1,
    'lo rechazado no dejó filas: solo el espacio válido del 14';
end $$;

-- Rango de fechas (check meal_plans_date_in_range): los extremos entran; un día
-- antes, un día después y los infinitos de date se rechazan por la RPC y por el
-- insert directo. Los extremos y lo rechazado se limpian al final del bloque.
do $$
declare
  bad_date date;
  rows_before integer := (select count(*) from public.meal_plans);
begin
  assert exists (
    select 1 from pg_constraint
    where conrelid = 'public.meal_plans'::regclass and conname = 'meal_plans_date_in_range' and contype = 'c'
  ), 'falta el check meal_plans_date_in_range';

  perform public.assign_meal_slot(date '2020-01-01', 'lunch', current_setting('tacha_test.recipe_a1')::uuid, true, 1);
  perform public.assign_meal_slot(date '2100-12-31', 'lunch', current_setting('tacha_test.recipe_a1')::uuid, true, 1);
  assert (select count(*) from public.meal_plans) = rows_before + 2, 'los dos extremos del rango se guardan';

  foreach bad_date in array array[
    date '2019-12-31', date '2101-01-01', date '0001-01-01', date '9999-12-31', 'infinity'::date, '-infinity'::date
  ]
  loop
    begin
      perform public.assign_meal_slot(bad_date, 'lunch', current_setting('tacha_test.recipe_a1')::uuid, true, 1);
      assert false, format('la RPC no rechazó la fecha %s', bad_date);
    exception
      when check_violation then null; -- 23514
    end;
  end loop;

  foreach bad_date in array array[date '2019-12-31', date '2101-01-01', 'infinity'::date, '-infinity'::date]
  loop
    begin
      insert into public.meal_plans (date, meal_type, recipe_id)
      values (bad_date, 'dinner', current_setting('tacha_test.recipe_a1')::uuid);
      assert false, format('el insert directo no rechazó la fecha %s', bad_date);
    exception
      when check_violation then null;
    end;
  end loop;

  assert (select count(*) from public.meal_plans) = rows_before + 2, 'las fechas fuera de rango no dejaron filas';

  delete from public.meal_plans where date in (date '2020-01-01', date '2100-12-31');
end $$;

-- ----------------------------------------------------------------------------
-- 3. Usuario A, negativos: receta ajena o inexistente (P0002) y escrituras
--    directas que los permisos o las políticas rechazan.
-- ----------------------------------------------------------------------------

do $$
begin
  -- Receta de B: mismo error que una que no existe.
  begin
    perform public.assign_meal_slot(date '2026-10-15', 'lunch', current_setting('tacha_test.recipe_b')::uuid, true, 1);
    assert false, 'A no puede asignar la receta de B';
  exception
    when no_data_found then null; -- P0002
  end;

  begin
    perform public.assign_meal_slot(date '2026-10-15', 'lunch', gen_random_uuid(), true, 1);
    assert false, 'una receta que no existe da el mismo error';
  exception
    when no_data_found then null;
  end;

  -- Insert directo con una receta ajena: la política lo rechaza.
  begin
    insert into public.meal_plans (date, meal_type, recipe_id)
    values (date '2026-10-15', 'dinner', current_setting('tacha_test.recipe_b')::uuid);
    assert false, 'insert directo con la receta de B';
  exception
    when insufficient_privilege then null; -- 42501 (RLS)
  end;

  -- Insert directo con otro usuario como cocinero.
  begin
    insert into public.meal_plans (date, meal_type, recipe_id, assigned_cook)
    values (date '2026-10-15', 'dinner', current_setting('tacha_test.recipe_a1')::uuid, current_setting('tacha_test.user_b')::uuid);
    assert false, 'insert directo con B como cocinero';
  exception
    when insufficient_privilege then null;
  end;

  -- Columnas sin permiso: dueño, household y fecha no se escriben a mano. Estos
  -- casos prueban el PERMISO DE COLUMNA (el insert ni llega a la política); la
  -- cláusula `household_id is null` de la política queda como segunda defensa
  -- que el cliente no puede ejercer mientras ese permiso esté cerrado.
  begin
    insert into public.meal_plans (date, meal_type, recipe_id, owner_id)
    values (date '2026-10-15', 'dinner', current_setting('tacha_test.recipe_a1')::uuid, current_setting('tacha_test.user_b')::uuid);
    assert false, 'el permiso de columna debe rechazar el insert directo fijando owner_id';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.meal_plans (date, meal_type, recipe_id, household_id)
    values (date '2026-10-15', 'dinner', current_setting('tacha_test.recipe_a1')::uuid, gen_random_uuid());
    assert false, 'el permiso de columna debe rechazar el insert directo fijando household_id';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.meal_plans set owner_id = current_setting('tacha_test.user_b')::uuid
    where id = current_setting('tacha_test.slot_id')::uuid;
    assert false, 'update directo de owner_id';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.meal_plans set date = date '2026-11-01'
    where id = current_setting('tacha_test.slot_id')::uuid;
    assert false, 'update directo de la fecha: un espacio no se mueve';
  exception
    when insufficient_privilege then null;
  end;

  -- Update directo de lo permitido con una receta ajena o un cocinero ajeno.
  begin
    update public.meal_plans set recipe_id = current_setting('tacha_test.recipe_b')::uuid
    where id = current_setting('tacha_test.slot_id')::uuid;
    assert false, 'update directo con la receta de B';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.meal_plans set assigned_cook = current_setting('tacha_test.user_b')::uuid
    where id = current_setting('tacha_test.slot_id')::uuid;
    assert false, 'update directo con B como cocinero';
  exception
    when insufficient_privilege then null;
  end;

  -- Lo permitido sí funciona: cambiar a mano la receta propia, el cocinero
  -- (uno mismo o nadie) y el multiplicador de un espacio propio. Sin esto, una
  -- política que rechazara todo pasaría todos los negativos de arriba.
  declare
    own_rows integer;
  begin
    update public.meal_plans
    set recipe_id = current_setting('tacha_test.recipe_a1')::uuid
    where id = current_setting('tacha_test.slot_id')::uuid;
    get diagnostics own_rows = row_count;
    assert own_rows = 1, 'update directo de la receta propia: debe cambiar 1 fila';

    update public.meal_plans set assigned_cook = auth.uid() where id = current_setting('tacha_test.slot_id')::uuid;
    get diagnostics own_rows = row_count;
    assert own_rows = 1, 'update directo con uno mismo como cocinero: debe cambiar 1 fila';

    update public.meal_plans set assigned_cook = null where id = current_setting('tacha_test.slot_id')::uuid;
    get diagnostics own_rows = row_count;
    assert own_rows = 1, 'update directo sin cocinero: debe cambiar 1 fila';

    update public.meal_plans set servings_multiplier = 3 where id = current_setting('tacha_test.slot_id')::uuid;
    get diagnostics own_rows = row_count;
    assert own_rows = 1, 'update directo del multiplicador: debe cambiar 1 fila';

    assert (
      select recipe_id = current_setting('tacha_test.recipe_a1')::uuid and servings_multiplier = 3
      from public.meal_plans where id = current_setting('tacha_test.slot_id')::uuid
    ), 'los updates directos permitidos quedaron guardados';

    -- Se deja el espacio como estaba para los pasos siguientes.
    update public.meal_plans
    set recipe_id = current_setting('tacha_test.recipe_a2')::uuid, servings_multiplier = 2.5
    where id = current_setting('tacha_test.slot_id')::uuid;
  end;

  -- Dos inserts directos al mismo espacio: la clave parcial lo impide.
  insert into public.meal_plans (date, meal_type, recipe_id)
  values (date '2026-10-16', 'lunch', current_setting('tacha_test.recipe_a1')::uuid);

  begin
    insert into public.meal_plans (date, meal_type, recipe_id)
    values (date '2026-10-16', 'lunch', current_setting('tacha_test.recipe_a2')::uuid);
    assert false, 'dos filas en el mismo espacio';
  exception
    when unique_violation then null; -- 23505
  end;

  -- Los valores por defecto: ×1 y sin cocinero cuando el cliente no manda nada.
  assert (select servings_multiplier from public.meal_plans where date = '2026-10-16' and meal_type = 'lunch') = 1,
    'multiplicador por defecto ×1';
end $$;

-- ----------------------------------------------------------------------------
-- 4. Usuario B: no ve, no cambia y no borra el plan de A, y planifica el suyo.
-- ----------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  deleted_rows integer;
  updated_rows integer;
begin
  assert (select count(*) from public.meal_plans) = 0, 'B no ve ninguna fila del plan de A';

  delete from public.meal_plans where id = current_setting('tacha_test.slot_id')::uuid;
  get diagnostics deleted_rows = row_count;
  assert deleted_rows = 0, 'B no borra nada del plan de A (RLS no ve la fila, y no da error)';

  update public.meal_plans set servings_multiplier = 3 where id = current_setting('tacha_test.slot_id')::uuid;
  get diagnostics updated_rows = row_count;
  assert updated_rows = 0, 'B no cambia nada del plan de A';

  -- B planifica el mismo día y la misma comida que A sin chocar con su espacio.
  perform public.assign_meal_slot(date '2026-10-12', 'lunch', current_setting('tacha_test.recipe_b')::uuid, true, 1);

  assert (select count(*) from public.meal_plans) = 1, 'B ve solo su propio espacio';
  assert (select recipe_id from public.meal_plans) = current_setting('tacha_test.recipe_b')::uuid,
    'el espacio de B tiene la receta de B';
end $$;

-- ----------------------------------------------------------------------------
-- 5. Sin sesión y como anon: la RPC pide sesión (42501) y anon no tiene permisos.
-- ----------------------------------------------------------------------------

select set_config('request.jwt.claims', '{}', true);

do $$
begin
  perform public.assign_meal_slot(date '2026-10-12', 'lunch', current_setting('tacha_test.recipe_a1')::uuid, true, 1);
  assert false, 'sin sesión no se puede planificar';
exception
  when insufficient_privilege then null; -- 42501
end $$;

reset role;
set local role anon;

do $$
begin
  perform public.assign_meal_slot(date '2026-10-12', 'lunch', current_setting('tacha_test.recipe_a1')::uuid, true, 1);
  assert false, 'anon no tiene permiso de ejecución';
exception
  when insufficient_privilege then null;
end $$;

do $$
begin
  perform count(*) from public.meal_plans;
  assert false, 'anon no tiene permiso de lectura de la tabla';
exception
  when insufficient_privilege then null;
end $$;

reset role;

-- Los permisos, sin depender del mensaje de error.
do $$
begin
  assert not has_function_privilege('anon', 'public.assign_meal_slot(date, text, uuid, boolean, numeric)', 'execute'),
    'anon no puede ejecutar assign_meal_slot';
  assert has_function_privilege('authenticated', 'public.assign_meal_slot(date, text, uuid, boolean, numeric)', 'execute'),
    'authenticated sí puede ejecutar assign_meal_slot';
  assert not has_table_privilege('anon', 'public.meal_plans', 'select'), 'anon no lee meal_plans';
  assert has_table_privilege('authenticated', 'public.meal_plans', 'select'), 'authenticated lee meal_plans';
  assert has_table_privilege('authenticated', 'public.meal_plans', 'delete'), 'authenticated borra de meal_plans';
  assert not has_column_privilege('authenticated', 'public.meal_plans', 'owner_id', 'insert'), 'owner_id no se inserta a mano';
  assert not has_column_privilege('authenticated', 'public.meal_plans', 'household_id', 'insert'), 'household_id no se inserta a mano';
  assert not has_column_privilege('authenticated', 'public.meal_plans', 'owner_id', 'update'), 'owner_id no se actualiza';
  assert not has_column_privilege('authenticated', 'public.meal_plans', 'date', 'update'), 'la fecha no se actualiza';
  assert has_column_privilege('authenticated', 'public.meal_plans', 'recipe_id', 'update'), 'la receta sí se actualiza';
  assert not has_column_privilege('authenticated', 'public.meal_plans', 'id', 'insert'), 'id no se inserta a mano';
  assert not has_column_privilege('authenticated', 'public.meal_plans', 'id', 'update'), 'id no se actualiza';
  assert not has_column_privilege('authenticated', 'public.meal_plans', 'created_at', 'insert'), 'created_at no se inserta a mano';
  assert not has_column_privilege('authenticated', 'public.meal_plans', 'created_at', 'update'), 'created_at no se actualiza';
  assert not has_column_privilege('authenticated', 'public.meal_plans', 'meal_type', 'update'), 'la comida no se actualiza';
end $$;

-- La RPC corre con los permisos de quien la llama (security invoker) y con el
-- search_path vacío: si alguien la cambiara a security definer o le quitara el
-- search_path, ningún otro caso lo notaría.
do $$
declare
  rpc pg_proc;
begin
  select * into rpc from pg_proc
  where oid = 'public.assign_meal_slot(date, text, uuid, boolean, numeric)'::regprocedure;

  assert not rpc.prosecdef, 'assign_meal_slot es security invoker, no definer';
  assert coalesce(rpc.proconfig, array[]::text[]) @> array['search_path=""'],
    'assign_meal_slot fija un search_path vacío';
end $$;

-- Una sesión anónima de Supabase es un usuario authenticated con is_anonymous:
-- es la que usa la app, así que planifica lo suyo igual que cualquiera.
set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('tacha_test.user_a'), 'role', 'authenticated', 'is_anonymous', true
  )::text,
  true
);

do $$
begin
  perform public.assign_meal_slot(date '2026-10-19', 'lunch', current_setting('tacha_test.recipe_a1')::uuid, true, 1);

  assert (select owner_id from public.meal_plans where date = '2026-10-19') = current_setting('tacha_test.user_a')::uuid,
    'una sesión anónima planifica a su nombre';

  delete from public.meal_plans where date = '2026-10-19';
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 6. Rol dueño: una fila de household no es visible para su dueño (el plan de
--    hoy es personal); y quitar y borrar la receta liberan los espacios.
-- ----------------------------------------------------------------------------

insert into public.meal_plans (owner_id, household_id, date, meal_type, recipe_id)
values (
  current_setting('tacha_test.user_a')::uuid,
  gen_random_uuid(),
  date '2026-10-17',
  'dinner',
  -- Con la receta A2: la A1 se borra más abajo y esta fila no tiene que irse con ella.
  current_setting('tacha_test.recipe_a2')::uuid
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  deleted_rows integer;
begin
  assert not exists (select 1 from public.meal_plans where date = '2026-10-17'),
    'una fila con household_id no se ve en el plan personal';

  -- Ni se cambia ni se borra: el dueño la ve como si no existiera (0 filas, sin
  -- error). Esto prueba el resultado de select + update + delete juntos; el
  -- predicado `household_id is null` de cada política por separado no se puede
  -- aislar desde el cliente, porque la política de lectura ya oculta la fila.
  update public.meal_plans set servings_multiplier = 3 where date = '2026-10-17';
  get diagnostics deleted_rows = row_count;
  assert deleted_rows = 0, 'una fila con household_id no se puede cambiar desde el plan personal';

  delete from public.meal_plans where date = '2026-10-17';
  get diagnostics deleted_rows = row_count;
  assert deleted_rows = 0, 'una fila con household_id no se puede borrar desde el plan personal';

  -- Quitar un espacio propio: borra una fila y el espacio queda vacío.
  delete from public.meal_plans where date = '2026-10-13' and meal_type = 'lunch';
  get diagnostics deleted_rows = row_count;
  assert deleted_rows = 1, 'quitar un espacio propio borra una fila';
  assert not exists (select 1 from public.meal_plans where date = '2026-10-13'), 'el espacio quedó vacío';

  -- Borrar la receta libera sus espacios (on delete cascade).
  assert exists (
    select 1 from public.meal_plans where recipe_id = current_setting('tacha_test.recipe_a1')::uuid
  ), 'antes de borrar, la receta A1 está en el plan';

  delete from public.recipes where id = current_setting('tacha_test.recipe_a1')::uuid;

  assert not exists (
    select 1 from public.meal_plans where recipe_id = current_setting('tacha_test.recipe_a1')::uuid
  ), 'borrar la receta libera sus espacios del plan';
  assert exists (
    select 1 from public.meal_plans where recipe_id = current_setting('tacha_test.recipe_a2')::uuid
  ), 'los espacios de otras recetas siguen';
end $$;

reset role;

-- La fila de household sigue existiendo para el dueño de las tablas.
do $$
begin
  assert exists (select 1 from public.meal_plans where household_id is not null),
    'la fila de household solo se ve con el rol dueño';
  assert (select servings_multiplier from public.meal_plans where date = '2026-10-17') = 1,
    'la fila de household no cambió: el update desde el plan personal no la tocó';
end $$;

-- Borrar un usuario borra su plan (cascade) y, si era cocinero de un espacio de
-- otra persona, deja ese espacio sin cocinero (set null) sin perder la comida.
do $$
begin
  insert into public.meal_plans (owner_id, date, meal_type, recipe_id, assigned_cook)
  values (
    current_setting('tacha_test.user_a')::uuid,
    date '2026-10-18',
    'dinner',
    current_setting('tacha_test.recipe_a2')::uuid,
    current_setting('tacha_test.user_b')::uuid
  );

  delete from auth.users where id = current_setting('tacha_test.user_b')::uuid;

  assert not exists (select 1 from public.meal_plans where owner_id = current_setting('tacha_test.user_b')::uuid),
    'borrar al dueño borra su plan';
  assert exists (select 1 from public.meal_plans where date = '2026-10-18'),
    'el espacio de A sigue aunque su cocinero se borró';
  assert (select assigned_cook from public.meal_plans where date = '2026-10-18') is null,
    'borrar al cocinero deja el espacio sin cocinero';
end $$;

select set_config('tacha_test.done', 'ok', true);

rollback;
