-- ============================================================================
-- Prueba de la migración 064 (SCRUM-104): descartar una sugerencia (la ✕).
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 061, 063 y 064. Todo pasa dentro de una transacción que termina
-- en rollback, así que no deja usuarios, productos, listas ni familias en la
-- base compartida. Si una regla no se cumple, un `assert` corta con su
-- mensaje; si termina sin error, pasó. El SQL Editor muestra el resultado del
-- último select (una fila vacía de as_user): eso también es "pasó".
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- Las RPC se llaman con `set local role authenticated` y request.jwt.claims de
-- cada persona: así corren con la RLS y los permisos reales. Las fechas
-- pasadas se fabrican como dueño, con el trigger de 015 apagado solo para ese
-- paso (como en 061).
--
-- Qué comprueba (features/inventory-suggestions/specs/SPEC.md §16):
--   1. permisos: nadie escribe la tabla directo; anon no ejecuta la función;
--   2. sin sesión: 42501; presentación nula, inexistente o sin historial en la
--      lista (también la de un producto ajeno): 22023, sin crear filas; sin lista: P0002;
--   3. la ✕ saca la sugerencia por 7 días y no toca el historial (CA-03);
--   4. descartar otra vez renueva los 7 días;
--   5. al vencer los 7 días vuelve a sugerirse (no es permanente, CA-03);
--   6. en una familia, la ✕ de un miembro pospone para todos;
--   7. una persona no pospone en la lista de otra, ni lee lo pospuesto en otra lista;
--   8. se pospone el producto, no la presentación: descartar una presentación
--      también saca la sugerencia de otra presentación del mismo producto.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño).
-- ----------------------------------------------------------------------------

do $$
begin
  assert to_regprocedure('public.dismiss_inventory_suggestion(uuid)') is not null,
    'falta dismiss_inventory_suggestion: aplicar 064 antes de esta prueba';
  assert to_regclass('public.inventory_suggestion_dismissals') is not null,
    'falta inventory_suggestion_dismissals: aplicar 064 antes de esta prueba';
end $$;

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

create function pg_temp.id_of(key text)
returns uuid
language sql
as $$
  select current_setting('tacha_test.' || key)::uuid;
$$;

create function pg_temp.new_user(user_key text)
returns void
language plpgsql
as $$
declare
  new_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, aud, role, email)
  values (new_id, 'authenticated', 'authenticated', new_id || '@prueba.tacha');
  perform set_config('tacha_test.' || user_key, new_id::text, true);
end;
$$;

-- Producto global con una presentación, en la categoría de prueba (7 días).
create function pg_temp.new_product(product_key text, product_name text)
returns void
language plpgsql
as $$
declare
  new_product_id uuid;
  new_variant_id uuid;
begin
  insert into public.product_catalog (name, category_id, owner_id, household_id, source)
  values (product_name, pg_temp.id_of('category'), null, null, 'manual')
  returning id into new_product_id;
  perform set_config('tacha_test.' || product_key || '_product', new_product_id::text, true);
  insert into public.product_catalog_variants (product_catalog_id, name, base_unit, base_quantity)
  values (new_product_id, product_name || ' 1', 'ml', 1000)
  returning id into new_variant_id;
  perform set_config('tacha_test.' || product_key, new_variant_id::text, true);
end;
$$;

create function pg_temp.new_general_list(list_key text, user_key text, household_key text default null)
returns void
language plpgsql
as $$
declare
  new_id uuid;
begin
  insert into public.lists (owner_id, type, household_id)
  values (
    pg_temp.id_of(user_key),
    'general',
    case when household_key is null then null else pg_temp.id_of(household_key) end
  )
  returning id into new_id;
  perform set_config('tacha_test.' || list_key, new_id::text, true);
end;
$$;

-- Una fila tachada hace days_ago días.
create function pg_temp.new_item(list_key text, variant_key text, days_ago integer)
returns void
language sql
as $$
  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested, checked_at)
  values (pg_temp.id_of(list_key), pg_temp.id_of(variant_key), 1, now() - make_interval(days => days_ago));
$$;

-- Otra presentación de un producto ya creado.
create function pg_temp.new_extra_variant(product_key text, variant_key text)
returns void
language plpgsql
as $$
declare
  new_variant_id uuid;
begin
  insert into public.product_catalog_variants (product_catalog_id, name, base_unit, base_quantity)
  values (pg_temp.id_of(product_key || '_product'), variant_key, 'ml', 2000)
  returning id into new_variant_id;
  perform set_config('tacha_test.' || variant_key, new_variant_id::text, true);
end;
$$;

-- Lo que la RPC le sugiere a esa persona, entre los productos de la prueba.
create function pg_temp.suggested_for(user_key text)
returns text[]
language plpgsql
as $$
declare
  names text[];
begin
  perform pg_temp.as_user(user_key);
  set local role authenticated;
  select array_agg(s.product_name order by s.product_name) into names
  from public.get_inventory_suggestions() s
  where s.product_name like 'zz064%';
  reset role;
  return coalesce(names, '{}'::text[]);
end;
$$;

select pg_temp.new_user('user_a');
select pg_temp.new_user('user_b');
select pg_temp.new_user('user_c');
select pg_temp.new_user('user_d');
select pg_temp.new_user('user_e');

do $$
declare
  new_id uuid;
begin
  insert into public.categories (name) values ('zz064 Categoría') returning id into new_id;
  perform set_config('tacha_test.category', new_id::text, true);
  insert into public.category_shelf_life (category_id, shelf_life_days) values (new_id, 7);

  insert into public.households (name) values ('zz064 Familia') returning id into new_id;
  perform set_config('tacha_test.household', new_id::text, true);
  insert into public.household_members (user_id, household_id, role)
  values (pg_temp.id_of('user_c'), new_id, 'admin'), (pg_temp.id_of('user_d'), new_id, 'member');
end $$;

select pg_temp.new_product('leche', 'zz064 Leche');
select pg_temp.new_product('arroz', 'zz064 Arroz');
-- Nunca se compró en la lista de A (sí en la de B): A no puede descartarla.
select pg_temp.new_product('cafe', 'zz064 Café');
-- Jugo: dos presentaciones; en la lista de B se compró la 1 hace 12 días y la 2 hace 10.
select pg_temp.new_product('jugo', 'zz064 Jugo');
select pg_temp.new_extra_variant('jugo', 'jugo_2l');

select pg_temp.new_general_list('list_a', 'user_a');
select pg_temp.new_general_list('list_b', 'user_b');
select pg_temp.new_general_list('list_family', 'user_c', 'household');

alter table public.list_items disable trigger list_items_stamp_check;
-- Las dos se acabaron (categoría de 7 días, compradas hace 10).
select pg_temp.new_item('list_a', 'leche', 10);
select pg_temp.new_item('list_a', 'arroz', 10);
select pg_temp.new_item('list_b', 'leche', 10);
select pg_temp.new_item('list_family', 'leche', 10);
select pg_temp.new_item('list_b', 'cafe', 10);
select pg_temp.new_item('list_b', 'jugo', 12);
select pg_temp.new_item('list_b', 'jugo_2l', 10);
alter table public.list_items enable trigger list_items_stamp_check;

do $$
begin
  assert pg_temp.suggested_for('user_a') = array['zz064 Arroz', 'zz064 Leche'],
    'antes de descartar, A debería ver Arroz y Leche';
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos.
-- ----------------------------------------------------------------------------

do $$
begin
  assert not has_function_privilege('anon', 'public.dismiss_inventory_suggestion(uuid)', 'execute'),
    'anon no debería poder descartar';
  assert has_function_privilege('authenticated', 'public.dismiss_inventory_suggestion(uuid)', 'execute'),
    'authenticated debería poder descartar';
  assert has_table_privilege('authenticated', 'public.inventory_suggestion_dismissals', 'select'),
    'authenticated debería poder leer la tabla (con la RLS de las listas)';
  assert not has_table_privilege('authenticated', 'public.inventory_suggestion_dismissals', 'insert'),
    'authenticated no debería insertar en la tabla directo';
  assert not has_table_privilege('authenticated', 'public.inventory_suggestion_dismissals', 'update'),
    'authenticated no debería cambiar la tabla directo';
  assert not has_table_privilege('authenticated', 'public.inventory_suggestion_dismissals', 'delete'),
    'authenticated no debería borrar de la tabla directo';
  assert not has_table_privilege('anon', 'public.inventory_suggestion_dismissals', 'select'),
    'anon no debería leer la tabla';
end $$;

-- ----------------------------------------------------------------------------
-- 2. Errores.
-- ----------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"role": "authenticated"}', true);
set local role authenticated;
do $$
begin
  perform public.dismiss_inventory_suggestion(pg_temp.id_of('leche'));
  assert false, 'sin sesión debería fallar';
exception
  when insufficient_privilege then null;
end $$;
reset role;

select pg_temp.as_user('user_a');
set local role authenticated;
do $$
begin
  perform public.dismiss_inventory_suggestion(null);
  assert false, 'una presentación nula debería fallar';
exception
  when invalid_parameter_value then null;
end $$;
do $$
begin
  perform public.dismiss_inventory_suggestion(gen_random_uuid());
  assert false, 'una presentación que no existe debería fallar';
exception
  when invalid_parameter_value then null;
end $$;
do $$
begin
  perform public.dismiss_inventory_suggestion(pg_temp.id_of('cafe'));
  assert false, 'una presentación sin historial en la lista de A debería fallar';
exception
  when invalid_parameter_value then null;
end $$;
reset role;

do $$
begin
  assert not exists (select 1 from public.inventory_suggestion_dismissals where list_id = pg_temp.id_of('list_a')),
    'los intentos fallidos no deberían crear filas';
end $$;

select pg_temp.as_user('user_e');
set local role authenticated;
do $$
begin
  perform public.dismiss_inventory_suggestion(pg_temp.id_of('leche'));
  assert false, 'sin lista general debería fallar';
exception
  when no_data_found then null;
end $$;
reset role;

-- ----------------------------------------------------------------------------
-- 3. A descarta la leche: sale 7 días y el historial queda igual.
-- ----------------------------------------------------------------------------

select pg_temp.as_user('user_a');
set local role authenticated;
select public.dismiss_inventory_suggestion(pg_temp.id_of('leche'));
reset role;

do $$
declare
  until_at timestamptz;
begin
  assert pg_temp.suggested_for('user_a') = array['zz064 Arroz'],
    'después de descartar, A no debería ver la leche';
  assert (select count(*) from public.list_items where list_id = pg_temp.id_of('list_a')) = 2,
    'descartar no debería tocar el historial de compras';

  select d.dismissed_until into until_at
  from public.inventory_suggestion_dismissals d
  where d.list_id = pg_temp.id_of('list_a') and d.product_catalog_id = pg_temp.id_of('leche_product');
  assert until_at = now() + interval '7 days', 'debería posponerse 7 días';
end $$;

-- ----------------------------------------------------------------------------
-- 4. Descartar otra vez renueva los 7 días (una sola fila).
-- ----------------------------------------------------------------------------

update public.inventory_suggestion_dismissals
set dismissed_until = now() + interval '1 day'
where list_id = pg_temp.id_of('list_a');

select pg_temp.as_user('user_a');
set local role authenticated;
select public.dismiss_inventory_suggestion(pg_temp.id_of('leche'));
reset role;

do $$
begin
  assert (select count(*) from public.inventory_suggestion_dismissals where list_id = pg_temp.id_of('list_a')) = 1,
    'descartar otra vez no debería crear otra fila';
  assert (select dismissed_until from public.inventory_suggestion_dismissals where list_id = pg_temp.id_of('list_a'))
    = now() + interval '7 days', 'descartar otra vez debería renovar los 7 días';
end $$;

-- ----------------------------------------------------------------------------
-- 5. Al vencer, vuelve (no es permanente).
-- ----------------------------------------------------------------------------

update public.inventory_suggestion_dismissals
set dismissed_until = now() - interval '1 minute'
where list_id = pg_temp.id_of('list_a');

do $$
begin
  assert pg_temp.suggested_for('user_a') = array['zz064 Arroz', 'zz064 Leche'],
    'al vencer los 7 días la leche debería volver a sugerirse';
end $$;

-- ----------------------------------------------------------------------------
-- 6. Familia: C descarta la leche de la lista compartida; D tampoco la ve.
-- ----------------------------------------------------------------------------

do $$
begin
  assert pg_temp.suggested_for('user_d') = array['zz064 Leche'],
    'antes de descartar, D debería ver la leche de la familia';
end $$;

select pg_temp.as_user('user_c');
set local role authenticated;
select public.dismiss_inventory_suggestion(pg_temp.id_of('leche'));
reset role;

do $$
begin
  assert pg_temp.suggested_for('user_d') = '{}'::text[],
    'la ✕ de un miembro debería posponer para toda la familia';
  assert pg_temp.suggested_for('user_c') = '{}'::text[],
    'quien descartó tampoco debería ver la leche';
end $$;

-- ----------------------------------------------------------------------------
-- 7. Aislamiento: la ✕ de la familia y la de A no tocan la lista de B.
-- ----------------------------------------------------------------------------

do $$
begin
  assert pg_temp.suggested_for('user_b') = array['zz064 Café', 'zz064 Jugo', 'zz064 Leche'],
    'B debería seguir viendo su leche: las ✕ de otros no son de su lista';
  assert not exists (
    select 1 from public.inventory_suggestion_dismissals where list_id = pg_temp.id_of('list_b')
  ), 'nadie debería haber pospuesto en la lista de B';
end $$;

-- B no lee lo pospuesto en la lista de A ni en la de la familia (RLS de lectura).
select pg_temp.as_user('user_b');
set local role authenticated;
do $$
begin
  assert (select count(*) from public.inventory_suggestion_dismissals) = 0,
    'B no debería leer lo pospuesto en listas que no ve';
end $$;
reset role;

-- ----------------------------------------------------------------------------
-- 8. Por producto: B descarta Jugo con la presentación vieja (1) y tampoco ve
--    la sugerencia, que es de la última compra (2 L).
-- ----------------------------------------------------------------------------

select pg_temp.as_user('user_b');
set local role authenticated;
select public.dismiss_inventory_suggestion(pg_temp.id_of('jugo'));
reset role;

do $$
begin
  assert pg_temp.suggested_for('user_b') = array['zz064 Café', 'zz064 Leche'],
    'descartar una presentación debería posponer todo el producto';
end $$;

select pg_temp.as_user('user_a');

rollback;
