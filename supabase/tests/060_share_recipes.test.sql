-- ============================================================================
-- Prueba de la migración 060 (SCRUM-162): compartir recetas con la familia.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño), después de aplicar 060.
-- Todo pasa dentro de una transacción que termina en rollback: no deja datos en
-- la base compartida. Si una regla no se cumple, un `assert` corta con su
-- mensaje; si termina sin error, pasó. Contra la base sin 060 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes.
--
-- Datos:
--   familia 1: A (admin), B y C (miembros). Familia 2: D (admin).
--   E: registrado sin familia. N: sesión anónima que figura en la familia 1 (no
--   debería pasar; prueba que igual no ve nada).
--   Productos: común, común 2, de la familia 1, personal de B.
--   Recetas de B: shared (común + familia + foto), solo_family (solo el producto
--   de la familia), mine (personal), blocked (con su producto personal).
--   Receta de D: foreign, personal.
-- La concurrencia real no se reproduce en una sola transacción.
-- ============================================================================

begin;

create temporary table t (key text primary key, id uuid not null default gen_random_uuid()) on commit drop;
insert into t (key) select unnest(array[
  'A','B','C','D','E','N','h1','h2','common','common2','family','personal',
  'shared','only_family','mine','blocked','foreign']);
grant select, insert on t to authenticated, anon;

create function pg_temp.id(wanted text) returns uuid language sql stable as $$ select id from t where key = wanted $$;

-- Entra como alguien; sin nombre, sin sesión.
create function pg_temp.act_as(who text) returns void language sql as $$
  select set_config(
    'request.jwt.claims',
    case when who is null then '{}' else json_build_object(
      'sub', pg_temp.id(who), 'role', 'authenticated', 'is_anonymous', who = 'N')::text end,
    true);
$$;

-- Corre una sentencia que tiene que fallar con ese código.
create function pg_temp.fails(statement text, code text, why text) returns void language plpgsql as $$
declare
  got text := 'ninguno';
begin
  begin
    execute statement;
  exception when others then
    got := sqlstate;
  end;
  assert got = code, why || ' (esperaba ' || code || ', dio ' || got || ')';
end $$;

-- Cuántas filas toca una sentencia.
create function pg_temp.touched(statement text) returns integer language plpgsql as $$
declare
  n integer;
begin
  execute statement;
  get diagnostics n = row_count;
  return n;
end $$;

-- Un payload de save_recipe con un solo ingrediente.
create function pg_temp.one_item(product text) returns jsonb language sql stable as $$
  select jsonb_build_array(jsonb_build_object(
    'product_catalog_id', pg_temp.id(product), 'quantity_value', 3, 'quantity_unit', 'ml'))
$$;

insert into auth.users (id, aud, role, email)
select id, 'authenticated', 'authenticated', id || '@prueba.tacha' from t where key in ('A','B','C','D','E','N');

insert into public.households (id, name)
values (pg_temp.id('h1'), 'Familia 1 SCRUM-162'), (pg_temp.id('h2'), 'Familia 2 SCRUM-162');
insert into public.household_members (user_id, household_id, role)
values
  (pg_temp.id('A'), pg_temp.id('h1'), 'admin'),
  (pg_temp.id('B'), pg_temp.id('h1'), 'member'),
  (pg_temp.id('C'), pg_temp.id('h1'), 'member'),
  (pg_temp.id('N'), pg_temp.id('h1'), 'member'),
  (pg_temp.id('D'), pg_temp.id('h2'), 'admin');

insert into public.product_catalog (id, name, source, owner_id, household_id)
values
  (pg_temp.id('common'), 'Común SCRUM-162', 'manual', null, null),
  (pg_temp.id('common2'), 'Común 2 SCRUM-162', 'manual', null, null),
  (pg_temp.id('family'), 'Familiar SCRUM-162', 'manual', null, pg_temp.id('h1')),
  (pg_temp.id('personal'), 'Personal SCRUM-162', 'manual', pg_temp.id('B'), null);
insert into public.product_catalog_variants (product_catalog_id, name, base_unit, base_quantity)
select id, key || ' v', 'ml', 100 from t where key in ('common', 'common2', 'family');

insert into public.recipes (id, owner_id, name, base_servings)
select id, pg_temp.id(case key when 'foreign' then 'D' else 'B' end), 'Receta ' || key, 4
from t where key in ('shared', 'only_family', 'mine', 'blocked', 'foreign');
insert into public.recipe_ingredients (recipe_id, product_catalog_id, quantity_value, quantity_unit, position)
values
  (pg_temp.id('shared'), pg_temp.id('common'), 100, 'ml', 0),
  (pg_temp.id('shared'), pg_temp.id('family'), 50, 'ml', 1),
  (pg_temp.id('only_family'), pg_temp.id('family'), 50, 'ml', 0),
  (pg_temp.id('mine'), pg_temp.id('common'), 100, 'ml', 0),
  (pg_temp.id('blocked'), pg_temp.id('common'), 100, 'ml', 0),
  (pg_temp.id('blocked'), pg_temp.id('personal'), 1, 'ml', 1),
  (pg_temp.id('foreign'), pg_temp.id('common'), 100, 'ml', 0);

select set_config('storage.allow_delete_query', 'true', true);
select set_config('t.photo', pg_temp.id('shared') || '/' || gen_random_uuid() || '.jpg', true);
select set_config('t.photo2', pg_temp.id('shared') || '/' || gen_random_uuid() || '.png', true);
select set_config('t.foreign_photo', pg_temp.id('foreign') || '/' || gen_random_uuid() || '.jpg', true);
insert into storage.objects (bucket_id, name, owner_id)
values
  ('recipe-photos', current_setting('t.photo'), pg_temp.id('B')::text),
  ('recipe-photos', current_setting('t.foreign_photo'), pg_temp.id('D')::text);
update public.recipes set photo_path = current_setting('t.photo') where id = pg_temp.id('shared');
update public.recipes set photo_path = current_setting('t.foreign_photo') where id = pg_temp.id('foreign');

-- ----------------------------------------------------------------------------
-- 1. Permisos y forma.
-- ----------------------------------------------------------------------------
do $$
declare
  fn text;
begin
  assert to_regprocedure('public.share_recipe(uuid)') is not null, '1: falta aplicar la 060';

  foreach fn in array array['current_household_id()', 'share_recipe(uuid)', 'copy_recipe(uuid)',
    'is_recipe_photo_in_use(text)', 'set_recipe_photo(uuid, text)'] loop
    assert has_function_privilege('authenticated', 'public.' || fn, 'execute'), '1: authenticated ejecuta ' || fn;
    assert not has_function_privilege('anon', 'public.' || fn, 'execute'), '1: anon no ejecuta ' || fn;
    assert (select p.prosecdef and p.proconfig @> array['search_path=""'] from pg_proc p
            where p.oid = ('public.' || fn)::regprocedure), '1: definer con search_path vacío: ' || fn;
  end loop;

  foreach fn in array array['clone_recipe(uuid, uuid, uuid)', 'keep_recipes_on_household_exit()'] loop
    assert not has_function_privilege('authenticated', 'public.' || fn, 'execute'), '1: nadie llama a ' || fn;
    assert not has_function_privilege('anon', 'public.' || fn, 'execute'), '1: anon no llama a ' || fn;
  end loop;

  assert not (select p.prosecdef from pg_proc p
              where p.oid = 'public.save_recipe(text, integer, jsonb, uuid)'::regprocedure),
    '1: save_recipe sigue invoker';

  foreach fn in array array['household_id', 'owner_id', 'photo_path'] loop
    assert not has_column_privilege('authenticated', 'public.recipes', fn, 'update'), '1: update de ' || fn;
    assert not has_column_privilege('authenticated', 'public.recipes', fn, 'insert'), '1: insert de ' || fn;
  end loop;

  assert (select array_agg(p.policyname::text order by p.policyname) from pg_policies p
          where p.schemaname = 'public' and p.tablename = 'recipes')
         = array['deletes own personal or household recipes', 'owner creates own recipes',
                 'reads own personal or household recipes', 'updates own personal or household recipes'],
    '1: políticas de recipes';
  assert (select count(*) = 4 from pg_policies p
          where p.schemaname = 'public' and p.tablename = 'recipe_ingredients'), '1: políticas de ingredientes';
  assert (select count(*) = 3 and count(*) filter (where cmd in ('UPDATE', 'ALL')) = 0 from pg_policies
          where schemaname = 'storage' and policyname like 'recipe_photos_%'), '1: políticas de fotos';
end $$;

-- ----------------------------------------------------------------------------
-- 2. Compartir.
-- ----------------------------------------------------------------------------
set local role authenticated;

do $$
begin
  perform pg_temp.act_as(null);
  perform pg_temp.fails('select public.share_recipe(pg_temp.id(''shared''))', '42501', '2: sin sesión');
  perform pg_temp.act_as('N');
  perform pg_temp.fails('select public.share_recipe(pg_temp.id(''shared''))', '42501', '2: anónimo');
  assert public.current_household_id() is null, '2: el anónimo no tiene familia';
  perform pg_temp.act_as('E');
  perform pg_temp.fails('select public.share_recipe(pg_temp.id(''shared''))', '42501', '2: sin familia');
  perform pg_temp.act_as('C');
  perform pg_temp.fails('select public.share_recipe(pg_temp.id(''mine''))', 'P0002', '2: receta personal de otro miembro');
  perform pg_temp.act_as('D');
  perform pg_temp.fails('select public.share_recipe(pg_temp.id(''shared''))', 'P0002', '2: receta de otra familia');

  perform pg_temp.act_as('A');
  assert not exists (select 1 from public.recipes), '2: antes de compartir la familia no ve nada';

  perform pg_temp.act_as('B');
  assert public.share_recipe(pg_temp.id('blocked')) = array['Personal SCRUM-162'], '2: devuelve los personales';
  assert (select household_id is null from public.recipes where id = pg_temp.id('blocked')), '2: no se compartió';
  assert public.share_recipe(pg_temp.id('shared')) = '{}', '2: se comparte';
  assert public.share_recipe(pg_temp.id('shared')) = '{}', '2: repetir no falla';
  assert public.share_recipe(pg_temp.id('only_family')) = '{}', '2: producto de la familia vale';
  assert (select household_id = pg_temp.id('h1') and owner_id = pg_temp.id('B')
          from public.recipes where id = pg_temp.id('shared')), '2: familia y dueño';
end $$;

-- ----------------------------------------------------------------------------
-- 3. Un miembro la ve completa y la edita; no ve las personales.
-- ----------------------------------------------------------------------------
do $$
declare
  message_detail text;
  message_hint text;
begin
  perform pg_temp.act_as('C');
  assert (select array_agg(id order by id) from public.recipes)
    = (select array_agg(id order by id) from t where key in ('shared', 'only_family')), '3: ve solo las de la familia';
  assert (select count(*) = 2 and count(pc.name) = 2 from public.recipe_ingredients ri
          left join public.product_catalog pc on pc.id = ri.product_catalog_id
          where ri.recipe_id = pg_temp.id('shared')), '3: ve los ingredientes con nombre';
  assert (select array_agg(name) = array[current_setting('t.photo')] from storage.objects
          where bucket_id = 'recipe-photos'), '3: ve esa foto y ninguna otra';

  perform public.save_recipe('Editada por C', 6,
    pg_temp.one_item('common') || pg_temp.one_item('family'), pg_temp.id('shared'));
  assert (select name = 'Editada por C' and owner_id = pg_temp.id('B') and household_id = pg_temp.id('h1')
          from public.recipes where id = pg_temp.id('shared')), '3: edita sin cambiar dueño';

  perform pg_temp.act_as('B');
  begin
    perform public.save_recipe('x', 2, pg_temp.one_item('personal'), pg_temp.id('shared'));
    raise exception using errcode = 'P0004', message = '3: aceptó un producto personal';
  exception when invalid_parameter_value then
    get stacked diagnostics message_detail = pg_exception_detail, message_hint = pg_exception_hint;
    assert message_hint = 'recipe_personal_products', '3: hint';
    assert message_detail::jsonb = '["Personal SCRUM-162"]', '3: nombres';
  end;
  perform pg_temp.fails(
    'insert into public.recipe_ingredients (recipe_id, product_catalog_id, quantity_value, quantity_unit, position)
     values (pg_temp.id(''shared''), pg_temp.id(''personal''), 1, ''ml'', 9)', '42501', '3: insert directo');
  perform pg_temp.fails(
    'update public.recipe_ingredients set product_catalog_id = pg_temp.id(''personal'')
     where recipe_id = pg_temp.id(''only_family'')', '42501', '3: update directo');
  perform pg_temp.fails(
    'update public.recipe_ingredients set recipe_id = pg_temp.id(''shared'')
     where recipe_id = pg_temp.id(''blocked'') and product_catalog_id = pg_temp.id(''personal'')', '42501',
    '3: mover el ingrediente');

  perform pg_temp.fails('update public.recipes set household_id = null', '42501', '3: household_id');
  perform pg_temp.fails('update public.recipes set owner_id = pg_temp.id(''B'')', '42501', '3: owner_id');
  perform pg_temp.fails('update public.recipes set photo_path = null', '42501', '3: photo_path');
  perform public.save_recipe('Personal de B', 2, pg_temp.one_item('personal'), pg_temp.id('mine'));
end $$;

-- ----------------------------------------------------------------------------
-- 4. Nadie más: otra familia, sin familia, anónimo y anon.
-- ----------------------------------------------------------------------------
do $$
declare
  who text;
begin
  foreach who in array array['D', 'E', 'N'] loop
    perform pg_temp.act_as(who);
    assert not exists (select 1 from public.recipes where household_id = pg_temp.id('h1')), '4: lee ' || who;
    assert not exists (select 1 from public.recipe_ingredients where recipe_id = pg_temp.id('shared')), '4: ingredientes ' || who;
    assert not exists (select 1 from storage.objects where name = current_setting('t.photo')), '4: foto ' || who;
    assert pg_temp.touched('update public.recipes set name = ''x'' where id = pg_temp.id(''shared'')') = 0, '4: edita ' || who;
    assert pg_temp.touched('delete from public.recipes where id = pg_temp.id(''shared'')') = 0, '4: borra ' || who;
    assert pg_temp.touched('delete from public.recipe_ingredients where recipe_id = pg_temp.id(''shared'')') = 0, '4: borra ingredientes ' || who;
    perform pg_temp.fails('select public.save_recipe(''x'', 1, pg_temp.one_item(''common''), pg_temp.id(''shared''))', 'P0002', '4: guarda ' || who);
    perform pg_temp.fails('select public.set_recipe_photo(pg_temp.id(''shared''), null)', 'P0002', '4: foto ' || who);
    perform pg_temp.fails('select public.copy_recipe(pg_temp.id(''shared''))',
      case who when 'N' then '42501' else 'P0002' end, '4: copia ' || who);
    perform pg_temp.fails('select public.add_recipe_to_general_list(pg_temp.id(''shared''))', 'P0002', '4: lista ' || who);
    perform pg_temp.fails('select public.assign_meal_slot(current_date, ''lunch'', pg_temp.id(''shared''), false, 1)', 'P0002', '4: plan ' || who);
    perform pg_temp.fails(
      'insert into public.meal_plans (date, meal_type, recipe_id) values (current_date, ''lunch'', pg_temp.id(''shared''))',
      '42501', '4: plan directo ' || who);
    perform pg_temp.fails(
      'insert into storage.objects (bucket_id, name, owner_id) values (''recipe-photos'', pg_temp.id(''shared'') || ''/'' || gen_random_uuid() || ''.jpg'', auth.uid()::text)',
      '42501', '4: sube ' || who);
  end loop;
end $$;

reset role;
set local role anon;
do $$
begin
  perform set_config('request.jwt.claims', '{}', true);
  perform pg_temp.fails('select 1 from public.recipes', '42501', '4: anon lee');
  perform pg_temp.fails('select public.copy_recipe(gen_random_uuid())', '42501', '4: anon copia');
  assert not exists (select 1 from storage.objects where bucket_id = 'recipe-photos'), '4: anon ve fotos';
end $$;
reset role;
set local role authenticated;

-- Ser dueño no alcanza: manda la membresía (E es dueño de una receta de la familia 1).
reset role;
insert into public.recipes (owner_id, household_id, name, base_servings)
values (pg_temp.id('E'), pg_temp.id('h1'), 'De un exmiembro', 1);
set local role authenticated;
do $$
begin
  perform pg_temp.act_as('E');
  assert not exists (select 1 from public.recipes), '4: dueño que no es miembro lee';
  assert pg_temp.touched('delete from public.recipes') = 0, '4: dueño que no es miembro borra';
  perform pg_temp.act_as('C');
  assert pg_temp.touched('delete from public.recipes where name = ''De un exmiembro''') = 1, '4: un miembro la borra';
end $$;

-- ----------------------------------------------------------------------------
-- 5. Lista y plan con una receta de la familia.
-- ----------------------------------------------------------------------------
do $$
begin
  perform pg_temp.act_as('C');
  perform public.add_recipe_to_general_list(pg_temp.id('shared'));
  perform public.add_recipe_to_general_list(pg_temp.id('shared'));
  assert exists (select 1 from public.list_item_recipe_requirements where recipe_id = pg_temp.id('shared')), '5: la lista guarda lo que pide';
  assert jsonb_array_length(public.get_recipe_coverage_today(pg_temp.id('shared'), now() - interval '1 hour')) = 2, '5: ver qué falta';
  perform public.assign_meal_slot(current_date, 'lunch', pg_temp.id('shared'), true, 1);
  perform public.assign_meal_slot(current_date, 'lunch', pg_temp.id('shared'), true, 2);
  perform pg_temp.fails(
    'insert into public.list_item_recipe_requirements (list_item_id, recipe_id, quantity_needed, quantity_missing, quantity_unit)
     select list_item_id, pg_temp.id(''mine''), 1, 1, ''ml'' from public.list_item_recipe_requirements limit 1',
    '42501', '5: pedir para una receta que no ve');

  perform pg_temp.act_as('B');
  perform public.assign_meal_slot(current_date, 'lunch', pg_temp.id('shared'), false, 1);
  perform public.assign_meal_slot(current_date, 'dinner', pg_temp.id('only_family'), false, 1);
  perform public.assign_meal_slot(current_date, 'breakfast', pg_temp.id('mine'), false, 1);
  assert (select count(*) = 3 from public.meal_plans), '5: cada uno ve solo su plan';
end $$;

-- ----------------------------------------------------------------------------
-- 6. Copia personal y foto por referencia.
-- ----------------------------------------------------------------------------
do $$
declare
  copy_id uuid;
begin
  perform pg_temp.act_as('C');
  perform pg_temp.fails('select public.copy_recipe(pg_temp.id(''mine''))', 'P0002', '6: no copia una personal ajena');
  copy_id := public.copy_recipe(pg_temp.id('shared'));
  insert into t values ('copy', copy_id);

  assert (select owner_id = pg_temp.id('C') and household_id is null and name = 'Editada por C'
            and base_servings = 6 and photo_path = current_setting('t.photo')
          from public.recipes where id = copy_id), '6: la copia es de C, personal y completa';
  assert (select count(*) = 2 and min(quantity_value) = 3 from public.recipe_ingredients where recipe_id = copy_id), '6: con sus ingredientes';
  assert (select household_id = pg_temp.id('h1') from public.recipes where id = pg_temp.id('shared')), '6: la familia conserva la suya';

  perform pg_temp.act_as('B');
  assert not exists (select 1 from public.recipes where id = copy_id), '6: la copia es privada';

  perform pg_temp.fails('select public.set_recipe_photo(pg_temp.id(''mine''), current_setting(''t.foreign_photo''))', '23514', '6: archivo ajeno');
  perform pg_temp.fails('select public.set_recipe_photo(pg_temp.id(''mine''), current_setting(''t.photo''))', '23514', '6: carpeta de otra receta');
  perform pg_temp.fails('select public.set_recipe_photo(pg_temp.id(''mine''), pg_temp.id(''mine'') || ''/foto.jpg'')', '23514', '6: forma inválida');

  -- C (no es el dueño) cambia la foto de la familia.
  perform pg_temp.act_as('C');
  insert into storage.objects (bucket_id, name, owner_id)
  values ('recipe-photos', current_setting('t.photo2'), pg_temp.id('C')::text);
  assert public.set_recipe_photo(pg_temp.id('shared'), current_setting('t.photo2')) = current_setting('t.photo'), '6: devuelve la anterior';

  -- B subió la anterior, pero la copia de C la usa: no se borra.
  perform pg_temp.act_as('B');
  assert public.is_recipe_photo_in_use(current_setting('t.photo')), '6: en uso aunque B no vea la copia';
  assert pg_temp.touched('delete from storage.objects where name = current_setting(''t.photo'')') = 0, '6: no borra un archivo en uso';
  assert pg_temp.touched('delete from storage.objects where name = current_setting(''t.photo2'')') = 0, '6: no borra el de otro';

  perform pg_temp.act_as('C');
  assert exists (select 1 from storage.objects where name = current_setting('t.photo')), '6: C ve la foto de su copia';
  perform public.save_recipe('Copia cambiada', 1, pg_temp.one_item('common'), copy_id);
  assert (select name = 'Editada por C' from public.recipes where id = pg_temp.id('shared')), '6: editar la copia no toca el original';

  delete from public.recipes where id = copy_id;
  assert exists (select 1 from public.recipes where id = pg_temp.id('shared')), '6: borrar la copia no borra el original';
  perform pg_temp.act_as('B');
  assert pg_temp.touched('delete from storage.objects where name = current_setting(''t.photo'')') = 1, '6: sin uso, quien lo subió lo borra';
end $$;

-- ----------------------------------------------------------------------------
-- 7. A remueve a B.
-- ----------------------------------------------------------------------------
do $$
declare
  copy_id uuid;
begin
  perform pg_temp.act_as('A');
  assert public.remove_household_member(pg_temp.id('B')) = 'removed', '7: A remueve a B';
  assert (select count(*) = 2 and bool_and(owner_id = pg_temp.id('A') and household_id = pg_temp.id('h1'))
          from public.recipes where id in (pg_temp.id('shared'), pg_temp.id('only_family'))), '7: la familia conserva, dueño A';

  perform pg_temp.act_as('B');
  assert not exists (select 1 from public.recipes where household_id is not null), '7: B ya no ve las de la familia';
  perform pg_temp.fails('select public.set_recipe_photo(pg_temp.id(''shared''), null)', 'P0002', '7: ni cambia su foto');
  perform pg_temp.fails('select public.copy_recipe(pg_temp.id(''shared''))', 'P0002', '7: ni la copia');

  select id into copy_id from public.recipes where name = 'Editada por C';
  assert copy_id is not null and copy_id <> pg_temp.id('shared'), '7: B recibe su copia';
  assert (select count(*) = 1 from public.recipes where name = 'Editada por C'), '7: una sola';
  assert (select array_agg(product_catalog_id) = array[pg_temp.id('common')] from public.recipe_ingredients
          where recipe_id = copy_id), '7: sin el producto de la familia';
  assert (select photo_path = current_setting('t.photo2') from public.recipes where id = copy_id), '7: con la foto';
  assert exists (select 1 from storage.objects where name = current_setting('t.photo2')), '7: y la ve';
  assert not exists (select 1 from public.recipes where name = 'Receta only_family'), '7: sin ingredientes no hay copia';

  assert (select recipe_id = copy_id from public.meal_plans where meal_type = 'lunch'), '7: el plan pasa a la copia';
  assert not exists (select 1 from public.meal_plans where meal_type = 'dinner'), '7: el espacio sin copia queda libre';
  assert exists (select 1 from public.meal_plans where meal_type = 'breakfast'), '7: lo personal no se toca';
  assert exists (select 1 from public.recipes where id = pg_temp.id('mine')), '7: sus personales siguen';

  perform pg_temp.act_as('C');
  assert (select recipe_id = pg_temp.id('shared') from public.meal_plans), '7: el plan de C sigue';
  assert exists (select 1 from storage.objects where name = current_setting('t.photo2')), '7: C sigue viendo la foto';
end $$;

-- ----------------------------------------------------------------------------
-- 8. A transfiere el admin a C y sale: los originales pasan a C, y C (que no
--    era dueño) no recibe copias. N sale antes por el rol dueño.
-- ----------------------------------------------------------------------------
reset role;
delete from public.household_members where user_id = pg_temp.id('N');
set local role authenticated;

do $$
begin
  perform pg_temp.act_as('A');
  assert public.leave_household(pg_temp.id('C')) = 'left', '8: A sale';
  assert (select count(*) = 1 from public.recipes), '8: A tiene una copia';

  perform pg_temp.act_as('C');
  assert (select count(*) = 2 and bool_and(owner_id = pg_temp.id('C') and household_id = pg_temp.id('h1'))
          from public.recipes), '8: originales de C, sin copias';
end $$;

-- ----------------------------------------------------------------------------
-- 9. Cualquier miembro elimina; disolver devuelve al último admin sin duplicar.
-- ----------------------------------------------------------------------------
reset role;
insert into public.household_members (user_id, household_id, role) values (pg_temp.id('E'), pg_temp.id('h1'), 'member');
set local role authenticated;

do $$
begin
  perform pg_temp.act_as('E');
  assert pg_temp.touched('delete from public.recipes where id = pg_temp.id(''only_family'')') = 1, '9: un miembro elimina';
  perform public.assign_meal_slot(current_date, 'lunch', pg_temp.id('shared'), false, 1);
  assert public.leave_household() = 'left', '9: E sale';
  assert not exists (select 1 from public.recipes), '9: E no era dueño: sin copias';
  assert not exists (select 1 from public.meal_plans), '9: su espacio queda libre';

  perform pg_temp.act_as('C');
  assert public.leave_household() = 'household_deleted', '9: C disuelve';
  assert (select count(*) = 1 and bool_and(id = pg_temp.id('shared') and household_id is null and owner_id = pg_temp.id('C'))
          from public.recipes), '9: C conserva el original, personal y sin duplicado';
  assert (select recipe_id = pg_temp.id('shared') from public.meal_plans), '9: y su plan';

  perform pg_temp.act_as('B');
  assert (select count(*) = 1 from public.recipes where name = 'Editada por C'), '9: B no recibe otra';
end $$;

-- ----------------------------------------------------------------------------
-- 10. Borrar una cuenta no falla por el trigger (D, con una receta de su familia).
-- ----------------------------------------------------------------------------
do $$
begin
  perform pg_temp.act_as('D');
  assert public.share_recipe(pg_temp.id('foreign')) = '{}', '10: D comparte';
end $$;

reset role;
delete from auth.users where id = pg_temp.id('D');

do $$
begin
  assert not exists (select 1 from public.recipes where name = 'Receta foreign'), '10: sin copias huérfanas';
end $$;

rollback;
