-- ============================================================================
-- Prueba de la migración 062 (SCRUM-162): plan semanal de la familia.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño), después de aplicar 062.
-- Todo pasa dentro de una transacción que termina en rollback: no deja datos en
-- la base compartida. Si una regla no se cumple, un `assert` corta con su
-- mensaje; si termina sin error, pasó. Contra la base sin 062 falla en el paso 1.
--
-- El editor avisa de "operaciones destructivas" y de una tabla sin RLS: la tabla
-- es temporal. Elegir "Run without RLS".
--
-- Ejecutarlo completo, nunca por partes.
--
-- Datos:
--   familia 1: A (admin), B y C (miembros). Familia 2: D (admin).
--   E: registrado sin familia. N: sesión anónima que figura en la familia 1.
--   Recetas: family (de B, familia 1), only_family (de B, solo un producto de la
--   familia: al salir no deja copia), personal (de B), other (de D, familia 2).
-- La concurrencia real no se reproduce en una sola transacción.
-- ============================================================================

begin;

create temporary table t (key text primary key, id uuid not null default gen_random_uuid()) on commit drop;
insert into t (key) select unnest(array[
  'A','B','C','D','E','N','h1','h2','product','family_product','family','only_family','personal','other']);
grant select on t to authenticated, anon;

create function pg_temp.id(wanted text) returns uuid language sql stable as $$ select id from t where key = wanted $$;

-- Entra como alguien; sin nombre, sin sesión.
create function pg_temp.act_as(who text) returns void language sql as $$
  select set_config(
    'request.jwt.claims',
    case when who is null then '{}' else json_build_object(
      'sub', pg_temp.id(who), 'role', 'authenticated', 'is_anonymous', who = 'N')::text end,
    true);
$$;

-- Corre una sentencia que tiene que fallar con ese código (y ese hint).
create function pg_temp.fails(statement text, code text, why text, expected_hint text default null)
returns void language plpgsql as $$
declare
  got text := 'ninguno';
  got_hint text;
begin
  begin
    execute statement;
  exception when others then
    got := sqlstate;
    get stacked diagnostics got_hint = pg_exception_hint;
  end;
  assert got = code, why || ' (esperaba ' || code || ', dio ' || got || ')';
  assert expected_hint is null or got_hint = expected_hint, why || ': hint ' || coalesce(got_hint, 'nulo');
end $$;

create function pg_temp.touched(statement text) returns integer language plpgsql as $$
declare
  n integer;
begin
  execute statement;
  get diagnostics n = row_count;
  return n;
end $$;

insert into auth.users (id, aud, role, email, raw_user_meta_data)
select id, 'authenticated', 'authenticated', id || '@prueba.tacha',
  case key when 'C' then '{"name": "   "}'::jsonb else jsonb_build_object('name', 'Persona ' || key) end
from t where key in ('A','B','C','D','E','N');

insert into public.households (id, name)
values (pg_temp.id('h1'), 'Familia 1 SCRUM-162'), (pg_temp.id('h2'), 'Familia 2 SCRUM-162');
insert into public.household_members (user_id, household_id, role)
values
  (pg_temp.id('A'), pg_temp.id('h1'), 'admin'),
  (pg_temp.id('B'), pg_temp.id('h1'), 'member'),
  (pg_temp.id('C'), pg_temp.id('h1'), 'member'),
  (pg_temp.id('N'), pg_temp.id('h1'), 'member'),
  (pg_temp.id('D'), pg_temp.id('h2'), 'admin');

insert into public.product_catalog (id, name, source, household_id)
values
  (pg_temp.id('product'), 'Producto SCRUM-162', 'manual', null),
  (pg_temp.id('family_product'), 'Producto familiar SCRUM-162', 'manual', pg_temp.id('h1'));
insert into public.product_catalog_variants (product_catalog_id, name, base_unit, base_quantity)
values
  (pg_temp.id('product'), 'Producto v', 'ml', 100),
  (pg_temp.id('family_product'), 'Familiar v', 'ml', 100);

insert into public.recipes (id, owner_id, household_id, name, base_servings)
values
  (pg_temp.id('family'), pg_temp.id('B'), pg_temp.id('h1'), 'De la familia', 4),
  (pg_temp.id('only_family'), pg_temp.id('B'), pg_temp.id('h1'), 'Solo familia', 4),
  (pg_temp.id('personal'), pg_temp.id('B'), null, 'Personal de B', 2),
  (pg_temp.id('other'), pg_temp.id('D'), pg_temp.id('h2'), 'De otra familia', 2);
insert into public.recipe_ingredients (recipe_id, product_catalog_id, quantity_value, quantity_unit)
select pg_temp.id(key), pg_temp.id(case key when 'only_family' then 'family_product' else 'product' end), 100, 'ml'
from t where key in ('family', 'only_family', 'personal', 'other');

-- ----------------------------------------------------------------------------
-- 1. Permisos y forma. Las políticas de meal_plans no cambian.
-- ----------------------------------------------------------------------------
do $$
declare
  fn text;
begin
  assert to_regprocedure('public.get_household_meal_plan(date, date)') is not null, '1: falta aplicar la 062';

  foreach fn in array array['get_household_meal_plan(date, date)', 'clear_household_meal_slot(date, text)',
    'assign_household_meal_slot(date, text, uuid, numeric, uuid)', 'require_household_id()',
    'keep_recipes_on_household_exit()'] loop
    assert not has_function_privilege('anon', 'public.' || fn, 'execute'), '1: anon no ejecuta ' || fn;
    assert (select p.prosecdef and p.proconfig @> array['search_path=""'] from pg_proc p
            where p.oid = ('public.' || fn)::regprocedure), '1: definer con search_path vacío: ' || fn;
  end loop;
  assert not has_function_privilege('authenticated', 'public.require_household_id()', 'execute'), '1: interna';
  assert not has_function_privilege('authenticated', 'public.keep_recipes_on_household_exit()', 'execute'), '1: trigger';
  assert not has_function_privilege('anon', 'public.add_plan_week_to_list(date, date, boolean, uuid)', 'execute'), '1: anon semana';
  assert not (select p.prosecdef from pg_proc p
              where p.oid = 'public.add_plan_week_to_list(date, date, boolean, uuid)'::regprocedure), '1: invoker';
  assert not has_column_privilege('authenticated', 'public.meal_plans', 'household_id', 'insert')
    and not has_column_privilege('authenticated', 'public.meal_plans', 'household_id', 'update'), '1: household_id cerrada';
  assert (select count(*) = 4 and bool_and(coalesce(qual, with_check) like '%household_id IS NULL%')
          from pg_policies where schemaname = 'public' and tablename = 'meal_plans'), '1: políticas personales';
end $$;

-- ----------------------------------------------------------------------------
-- 2. Asignar, reemplazar, leer y quitar.
-- ----------------------------------------------------------------------------
set local role authenticated;

do $$
declare
  first_slot uuid;
  row_seen record;
begin
  perform pg_temp.act_as('A');
  first_slot := public.assign_household_meal_slot(date '2026-12-01', 'lunch', pg_temp.id('family'), 1, pg_temp.id('A'));
  perform pg_temp.act_as('C');
  assert public.assign_household_meal_slot(date '2026-12-01', 'lunch', pg_temp.id('only_family'), 2, pg_temp.id('B')) = first_slot,
    '2: otro miembro reemplaza el mismo espacio';
  perform public.assign_household_meal_slot(date '2026-12-02', 'dinner', pg_temp.id('family'), 1.5);
  perform public.assign_household_meal_slot(date '2026-12-03', 'dinner', pg_temp.id('family'), 1, pg_temp.id('C'));

  perform pg_temp.act_as('B');
  assert (select count(*) = 3 from public.get_household_meal_plan(date '2026-12-01', date '2026-12-14')), '2: tres espacios';
  select * into row_seen from public.get_household_meal_plan(date '2026-12-01', date '2026-12-01');
  assert row_seen.recipe_id = pg_temp.id('only_family') and row_seen.recipe_name = 'Solo familia'
    and row_seen.recipe_base_servings = 4 and row_seen.servings_multiplier = 2
    and row_seen.cook_user_id = pg_temp.id('B') and row_seen.cook_name = 'Persona B' and row_seen.cook_is_current_user,
    '2: B ve la receta y que cocina';
  perform pg_temp.act_as('A');
  select * into row_seen from public.get_household_meal_plan(date '2026-12-01', date '2026-12-01');
  assert row_seen.cook_name = 'Persona B' and not row_seen.cook_is_current_user, '2: A ve el nombre de B';
  select * into row_seen from public.get_household_meal_plan(date '2026-12-02', date '2026-12-02');
  assert row_seen.cook_user_id is null and row_seen.cook_name is null and row_seen.cook_is_current_user = false, '2: sin cocinero';
  select * into row_seen from public.get_household_meal_plan(date '2026-12-03', date '2026-12-03');
  assert row_seen.cook_user_id = pg_temp.id('C') and row_seen.cook_name is null, '2: sin nombre';

  perform pg_temp.fails('select public.assign_household_meal_slot(current_date, ''lunch'', pg_temp.id(''personal''), 1)', 'P0002', '2: receta personal de otro');
  perform pg_temp.act_as('B');
  perform pg_temp.fails('select public.assign_household_meal_slot(current_date, ''lunch'', pg_temp.id(''personal''), 1)', 'P0002', '2: receta personal propia');
  perform pg_temp.fails('select public.assign_household_meal_slot(current_date, ''lunch'', pg_temp.id(''other''), 1)', 'P0002', '2: receta de otra familia');
  perform pg_temp.fails('select public.assign_household_meal_slot(current_date, ''lunch'', pg_temp.id(''family''), 1, pg_temp.id(''D''))', 'P0002', '2: cocinero ajeno', 'plan_cook_not_member');
  perform pg_temp.fails('select public.assign_household_meal_slot(current_date, ''lunch'', pg_temp.id(''family''), 1, pg_temp.id(''E''))', 'P0002', '2: cocinero sin familia', 'plan_cook_not_member');
  perform pg_temp.fails('select public.assign_household_meal_slot(current_date, ''brunch'', pg_temp.id(''family''), 1)', '23514', '2: comida inválida');
  perform pg_temp.fails('select public.assign_household_meal_slot(current_date, ''lunch'', pg_temp.id(''family''), 9)', '23514', '2: multiplicador inválido');
  perform pg_temp.fails('select * from public.get_household_meal_plan(date ''2026-12-01'', date ''2026-12-15'')', '22023', '2: rango largo');
  perform pg_temp.fails('select * from public.get_household_meal_plan(date ''2026-12-02'', date ''2026-12-01'')', '22023', '2: rango al revés');
end $$;

-- ----------------------------------------------------------------------------
-- 3. Los dos planes no se mezclan, ni por la API directa.
-- ----------------------------------------------------------------------------
do $$
begin
  perform pg_temp.act_as('B');
  perform public.assign_meal_slot(date '2026-12-01', 'lunch', pg_temp.id('personal'), true, 1);
  assert (select count(*) = 1 from public.meal_plans), '3: la tabla da solo lo personal';
  assert pg_temp.touched('update public.meal_plans set servings_multiplier = 3') = 1, '3: update directo, solo lo personal';
  assert pg_temp.touched('delete from public.meal_plans where date = date ''2026-12-01'' and meal_type = ''lunch''') = 1, '3: delete directo, solo lo personal';
  assert (select count(*) = 1 and min(servings_multiplier) = 2 from public.get_household_meal_plan(date '2026-12-01', date '2026-12-01')), '3: el de la familia sigue igual';

  perform public.assign_meal_slot(date '2026-12-01', 'lunch', pg_temp.id('personal'), true, 1);
  perform public.assign_household_meal_slot(date '2026-12-01', 'breakfast', pg_temp.id('family'), 1);
  perform public.clear_household_meal_slot(date '2026-12-01', 'lunch');
  perform public.clear_household_meal_slot(date '2026-12-01', 'lunch');
  assert (select array_agg(meal_type) = array['breakfast'] from public.get_household_meal_plan(date '2026-12-01', date '2026-12-01')), '3: quitado solo ese';
  perform public.clear_household_meal_slot(date '2026-12-01', 'breakfast');
  assert (select count(*) = 1 from public.meal_plans), '3: el personal sigue';
  perform public.assign_household_meal_slot(date '2026-12-01', 'lunch', pg_temp.id('only_family'), 2, pg_temp.id('B'));

  perform pg_temp.act_as('A');
  assert not exists (select 1 from public.meal_plans), '3: A no ve el plan personal de B';
end $$;

-- ----------------------------------------------------------------------------
-- 4. Nadie más.
-- ----------------------------------------------------------------------------
do $$
declare
  who text;
begin
  foreach who in array array['E', 'N', null] loop
    perform pg_temp.act_as(who);
    perform pg_temp.fails('select * from public.get_household_meal_plan(date ''2026-12-01'', date ''2026-12-07'')', '42501', '4: lee', 'plan_no_household');
    perform pg_temp.fails('select public.assign_household_meal_slot(current_date, ''lunch'', pg_temp.id(''family''), 1)', '42501', '4: asigna', 'plan_no_household');
    perform pg_temp.fails('select public.clear_household_meal_slot(date ''2026-12-01'', ''lunch'')', '42501', '4: quita', 'plan_no_household');
    perform pg_temp.fails('select public.add_plan_week_to_list(date ''2026-12-01'', date ''2026-12-07'', true)', '42501', '4: semana');
  end loop;

  perform pg_temp.act_as('D');
  assert not exists (select 1 from public.get_household_meal_plan(date '2026-12-01', date '2026-12-07')), '4: otra familia no lo ve';
  perform public.clear_household_meal_slot(date '2026-12-01', 'lunch');
  perform pg_temp.fails('select public.assign_household_meal_slot(date ''2026-12-01'', ''lunch'', pg_temp.id(''family''), 1)', 'P0002', '4: otra familia, receta ajena');
  perform public.assign_household_meal_slot(date '2026-12-01', 'lunch', pg_temp.id('other'), 1, pg_temp.id('D'));

  perform pg_temp.act_as('A');
  assert (select recipe_id = pg_temp.id('only_family') from public.get_household_meal_plan(date '2026-12-01', date '2026-12-01')), '4: cada familia el suyo';
end $$;

reset role;
set local role anon;
do $$
begin
  perform pg_temp.fails('select * from public.get_household_meal_plan(current_date, current_date)', '42501', '4: anon lee');
  perform pg_temp.fails('select public.clear_household_meal_slot(current_date, ''lunch'')', '42501', '4: anon quita');
end $$;
reset role;
set local role authenticated;

-- ----------------------------------------------------------------------------
-- 5. La semana a la lista: solo el plan pedido.
-- ----------------------------------------------------------------------------
do $$
declare
  result jsonb;
begin
  perform pg_temp.act_as('B');
  result := public.add_plan_week_to_list(date '2026-12-01', date '2026-12-07', true);
  assert (result ->> 'meals')::integer = 3 and (result ->> 'ingredients')::integer = 2, '5: familia ' || result::text;
  result := public.add_plan_week_to_list(date '2026-12-01', date '2026-12-07', false);
  assert (result ->> 'meals')::integer = 1 and (result ->> 'ingredients')::integer = 1, '5: personal ' || result::text;
  result := public.add_week_to_list(date '2026-12-01', date '2026-12-07');
  assert (result ->> 'meals')::integer = 1, '5: la de siempre es la personal';
  result := public.add_week_to_general_list(date '2026-12-01', date '2026-12-07');
  assert (result ->> 'meals')::integer = 1, '5: y la anterior también';
  result := public.add_plan_week_to_list(date '2026-12-08', date '2026-12-14', true);
  assert (result ->> 'meals')::integer = 0, '5: semana vacía';
  perform pg_temp.fails('select public.add_plan_week_to_list(date ''2026-12-01'', date ''2026-12-08'', true)', '22023', '5: rango');
  perform pg_temp.fails('select public.add_plan_week_to_list(date ''2026-12-01'', date ''2026-12-07'', null)', '22023', '5: sin plan');
  perform pg_temp.fails('select public.add_plan_week_to_list(date ''2026-12-01'', date ''2026-12-07'', true, gen_random_uuid())', 'P0002', '5: lista ajena', 'date_list_unavailable');

  -- Sin familia, el plan personal no falla por la función de la familia.
  perform pg_temp.act_as('E');
  assert (public.add_plan_week_to_list(date '2026-12-01', date '2026-12-07', false) ->> 'meals')::integer = 0, '5: sin familia';
end $$;

-- ----------------------------------------------------------------------------
-- 6. A remueve a B, que cocina un espacio, asignó otro y tiene un plan personal
--    con recetas de la familia.
-- ----------------------------------------------------------------------------
do $$
begin
  perform pg_temp.act_as('B');
  perform public.assign_household_meal_slot(date '2026-12-04', 'lunch', pg_temp.id('family'), 1, pg_temp.id('A'));
  perform public.assign_meal_slot(date '2026-12-05', 'lunch', pg_temp.id('family'), true, 1);
  perform public.assign_meal_slot(date '2026-12-06', 'lunch', pg_temp.id('only_family'), true, 1);

  perform pg_temp.act_as('A');
  assert public.remove_household_member(pg_temp.id('B')) = 'removed', '6: A remueve a B';
  assert (select count(*) = 4 from public.get_household_meal_plan(date '2026-12-01', date '2026-12-07')), '6: el plan se conserva completo';
  assert (select recipe_id = pg_temp.id('only_family') and cook_user_id is null and servings_multiplier = 2
          from public.get_household_meal_plan(date '2026-12-01', date '2026-12-01')), '6: B deja de cocinar y la receta no cambia';
  assert (select recipe_id = pg_temp.id('family') and cook_user_id = pg_temp.id('A')
          from public.get_household_meal_plan(date '2026-12-04', date '2026-12-04')), '6: lo que asignó sigue igual';

  perform pg_temp.act_as('B');
  perform pg_temp.fails('select * from public.get_household_meal_plan(date ''2026-12-01'', date ''2026-12-07'')', '42501', '6: B ya no lo ve');
  assert (select count(*) = 2 from public.meal_plans), '6: B conserva lo personal, sin el que no tiene copia';
  assert (select r.owner_id = pg_temp.id('B') and r.name = 'De la familia' from public.meal_plans mp
          join public.recipes r on r.id = mp.recipe_id where mp.date = date '2026-12-05'), '6: su espacio pasa a la copia';

  perform pg_temp.act_as('A');
  perform pg_temp.fails('select public.assign_household_meal_slot(current_date, ''lunch'', pg_temp.id(''family''), 1, pg_temp.id(''B''))', 'P0002', '6: B ya no puede cocinar', 'plan_cook_not_member');
end $$;

reset role;
do $$
begin
  assert (select count(*) = 4 and count(*) filter (where owner_id = pg_temp.id('B')) = 0
          from public.meal_plans where household_id = pg_temp.id('h1')), '6: nada de la familia queda a nombre de B';
end $$;
delete from public.household_members where user_id = pg_temp.id('N');
set local role authenticated;

-- ----------------------------------------------------------------------------
-- 7. A transfiere el admin a C y sale; C disuelve: los espacios quedan
--    personales de C y gana el personal si chocan.
-- ----------------------------------------------------------------------------
do $$
begin
  perform pg_temp.act_as('A');
  assert public.leave_household(pg_temp.id('C')) = 'left', '7: A sale';

  perform pg_temp.act_as('C');
  assert (select count(*) = 4 and count(cook_user_id) = 1 from public.get_household_meal_plan(date '2026-12-01', date '2026-12-07')), '7: queda el plan, solo C cocina';
  perform public.assign_meal_slot(date '2026-12-02', 'dinner', pg_temp.id('family'), true, 4);

  assert public.leave_household() = 'household_deleted', '7: C disuelve';
  assert (select count(*) = 4 from public.meal_plans), '7: todo queda personal de C';
  assert (select servings_multiplier = 4 from public.meal_plans where date = date '2026-12-02'), '7: gana el personal';
end $$;

-- La FK diferida se revisa acá y no en el rollback.
reset role;
set constraints all immediate;

do $$
begin
  assert not exists (select 1 from public.meal_plans p where p.household_id = pg_temp.id('h1')), '7: sin familia inválida';
  perform pg_temp.fails('insert into public.meal_plans (owner_id, household_id, date, meal_type, recipe_id)
    values (pg_temp.id(''C''), gen_random_uuid(), current_date, ''lunch'', pg_temp.id(''family''))', '23503', '7: familia inexistente');
  perform pg_temp.fails('insert into public.meal_plans (owner_id, household_id, date, meal_type, recipe_id)
    select pg_temp.id(''C''), household_id, date, meal_type, recipe_id from public.meal_plans where household_id = pg_temp.id(''h2'')', '23505', '7: espacio repetido');
end $$;

-- ----------------------------------------------------------------------------
-- 8. Eliminar la receta libera el espacio de la familia.
-- ----------------------------------------------------------------------------
delete from public.recipes where id = pg_temp.id('other');
do $$
begin
  assert not exists (select 1 from public.meal_plans where household_id = pg_temp.id('h2')), '8: espacio libre';
end $$;

rollback;
