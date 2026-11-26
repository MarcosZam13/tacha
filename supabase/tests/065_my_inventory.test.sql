-- ============================================================================
-- Prueba de la migración 065 (SCRUM-105): "Mi inventario".
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 061, 063, 064 y 065. Todo pasa dentro de una transacción que
-- termina en rollback, así que no deja usuarios, productos ni listas en la
-- base compartida. Si una regla no se cumple, un `assert` corta con su
-- mensaje; si termina sin error, pasó. El SQL Editor muestra el resultado del
-- último select (una fila vacía de as_user): eso también es "pasó".
--
-- Ejecutarlo completo, nunca por partes.
--
-- Las RPC se llaman con `set local role authenticated` y request.jwt.claims de
-- cada persona: así corren con la RLS y los permisos reales. Las fechas
-- pasadas se fabrican como dueño, con el trigger de 015 apagado solo para ese
-- paso (como en 061).
--
-- Qué comprueba (features/my-inventory/specs/SPEC.md §5):
--   1. permisos: anon no ejecuta ninguna de las tres funciones;
--   2. sin sesión: 42501;
--   3. get_my_inventory: lo que no se acabó, no tiene fecha o está pospuesto,
--      en orden (lo que se acaba antes primero, sin fecha al final), con lo
--      pendiente que no se acabó; sin lo que se acabó y está pendiente;
--   4. get_inventory_suggestions sigue igual que en la 064: lo que se acabó, sin
--      lo pendiente ni lo pospuesto;
--   5. un producto nunca está en los dos: inventario y sugerencias (también en el
--      borde exacto: se acaba ahora → sugerencia);
--   5b. fuera de los dos: lo comprado hace más de 180 días (también sin fecha) y
--      lo archivado; con la misma fecha, el orden es por nombre;
--   6. aislamiento: B no ve el inventario de A; un miembro de una familia ve el
--      de la lista compartida y quien no es miembro, no.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño).
-- ----------------------------------------------------------------------------

do $$
begin
  assert to_regprocedure('public.get_my_inventory()') is not null,
    'falta get_my_inventory: aplicar 065 antes de esta prueba';
  assert to_regprocedure('public.inventory_estimates()') is not null,
    'falta inventory_estimates: aplicar 065 antes de esta prueba';
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

-- Producto global con una presentación, en la categoría de prueba (30 días).
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

-- Fila tachada hace days_ago días (null = pendiente), con su chip.
create function pg_temp.new_item(list_key text, variant_key text, days_ago integer, choice text default null)
returns void
language sql
as $$
  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested, checked_at, shelf_life_choice)
  values (
    pg_temp.id_of(list_key),
    pg_temp.id_of(variant_key),
    1,
    case when days_ago is null then null else now() - make_interval(days => days_ago) end,
    choice
  );
$$;

-- Nombres que devuelve una función, como esa persona, entre los de la prueba.
create function pg_temp.names_for(user_key text, function_name text)
returns text[]
language plpgsql
as $$
declare
  names text[];
begin
  perform pg_temp.as_user(user_key);
  set local role authenticated;
  if function_name = 'inventory' then
    select array_agg(i.product_name order by i.ordinality) into names
    from public.get_my_inventory() with ordinality as i
    where i.product_name like 'zz065%';
  else
    select array_agg(s.product_name order by s.ordinality) into names
    from public.get_inventory_suggestions() with ordinality as s
    where s.product_name like 'zz065%';
  end if;
  reset role;
  return coalesce(names, '{}'::text[]);
end;
$$;

select pg_temp.new_user('user_a');
select pg_temp.new_user('user_b');
select pg_temp.new_user('user_c');
select pg_temp.new_user('user_d');

do $$
declare
  new_id uuid;
begin
  insert into public.categories (name) values ('zz065 Categoría') returning id into new_id;
  perform set_config('tacha_test.category', new_id::text, true);
  insert into public.category_shelf_life (category_id, shelf_life_days) values (new_id, 30);

  insert into public.households (name) values ('zz065 Familia') returning id into new_id;
  perform set_config('tacha_test.household', new_id::text, true);
  insert into public.household_members (user_id, household_id, role)
  values (pg_temp.id_of('user_c'), new_id, 'admin'), (pg_temp.id_of('user_d'), new_id, 'member');
end $$;

select pg_temp.new_product('leche', 'zz065 Leche');
select pg_temp.new_product('cafe', 'zz065 Café');
select pg_temp.new_product('atun', 'zz065 Atún');
select pg_temp.new_product('arroz', 'zz065 Arroz');
select pg_temp.new_product('sal', 'zz065 Sal');
select pg_temp.new_product('pan', 'zz065 Pan');
select pg_temp.new_product('huevos', 'zz065 Huevos');
select pg_temp.new_product('yogur', 'zz065 Yogur');
select pg_temp.new_product('te', 'zz065 Té');
select pg_temp.new_product('avena', 'zz065 Avena');
select pg_temp.new_product('viejo', 'zz065 Viejo');
select pg_temp.new_product('archivado', 'zz065 Archivado');
update public.product_catalog set archived_at = now() where name = 'zz065 Archivado';

select pg_temp.new_general_list('list_a', 'user_a');
select pg_temp.new_general_list('list_b', 'user_b');
select pg_temp.new_general_list('list_family', 'user_c', 'household');

alter table public.list_items disable trigger list_items_stamp_check;
-- Categoría de prueba: 30 días. Día en que se acaba, desde hoy:
-- Leche: hace 27 → +3 (inventario, Vence pronto).
select pg_temp.new_item('list_a', 'leche', 27);
-- Café: hace 10 → +20 (inventario, Este mes).
select pg_temp.new_item('list_a', 'cafe', 10);
-- Atún: hace 5 → +25, y pendiente otra vez: sigue en el inventario.
select pg_temp.new_item('list_a', 'atun', 5);
select pg_temp.new_item('list_a', 'atun', null);
-- Arroz: hoy con "1-3 meses" → +60 (inventario, Más adelante).
select pg_temp.new_item('list_a', 'arroz', 0, 'one_to_three_months');
-- Sal: "No vence" con una sola compra → sin fecha (inventario, al final).
select pg_temp.new_item('list_a', 'sal', 5, 'no_expiry');
-- Pan: hace 40 → -10 (sugerencia).
select pg_temp.new_item('list_a', 'pan', 40);
-- Huevos: hace 40 → -10, pero pendiente: ni sugerencia ni inventario.
select pg_temp.new_item('list_a', 'huevos', 40);
select pg_temp.new_item('list_a', 'huevos', null);
-- Yogur: hace 40 → -10, pospuesto (064): no es sugerencia; sí inventario ("todavía lo tengo"), primero.
select pg_temp.new_item('list_a', 'yogur', 40);
-- Té: hace exactamente 30 → se acaba ahora: sugerencia, no inventario (borde).
select pg_temp.new_item('list_a', 'te', 30);
-- Avena: hace 10, el mismo momento que Café → misma fecha: va antes por nombre.
select pg_temp.new_item('list_a', 'avena', 10);
-- Viejo: "No vence" hace 181 días: fuera de la ventana de 180, en ningún lado.
select pg_temp.new_item('list_a', 'viejo', 181, 'no_expiry');
-- Archivado: comprado hace 5, pero el producto está archivado (052): en ningún lado.
select pg_temp.new_item('list_a', 'archivado', 5);
-- B: leche hace 27 (inventario de B, no de A).
select pg_temp.new_item('list_b', 'leche', 27);
-- Familia de C y D: café comprado por C hace 10 (inventario de los dos).
select pg_temp.new_item('list_family', 'cafe', 10);
alter table public.list_items enable trigger list_items_stamp_check;

insert into public.inventory_suggestion_dismissals (list_id, product_catalog_id, dismissed_until, dismissed_by)
values (pg_temp.id_of('list_a'), pg_temp.id_of('yogur_product'), now() + interval '7 days', pg_temp.id_of('user_a'));

-- ----------------------------------------------------------------------------
-- 1. Permisos.
-- ----------------------------------------------------------------------------

do $$
begin
  assert not has_function_privilege('anon', 'public.get_my_inventory()', 'execute'),
    'anon no debería ver el inventario';
  assert not has_function_privilege('anon', 'public.inventory_estimates()', 'execute'),
    'anon no debería ejecutar inventory_estimates';
  assert not has_function_privilege('anon', 'public.get_inventory_suggestions()', 'execute'),
    'anon no debería ver las sugerencias';
  assert has_function_privilege('authenticated', 'public.get_my_inventory()', 'execute'),
    'authenticated debería ver su inventario';
  -- Las dos de arriba son invoker: sin execute sobre esta, fallarían para todos.
  assert has_function_privilege('authenticated', 'public.inventory_estimates()', 'execute'),
    'authenticated debería poder ejecutar inventory_estimates';
  assert has_function_privilege('authenticated', 'public.get_inventory_suggestions()', 'execute'),
    'authenticated debería ver sus sugerencias';
end $$;

-- ----------------------------------------------------------------------------
-- 2. Sin sesión: 42501.
-- ----------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"role": "authenticated"}', true);
set local role authenticated;
do $$
begin
  perform public.get_my_inventory();
  assert false, 'sin sesión debería fallar';
exception
  when insufficient_privilege then null;
end $$;
-- Las sugerencias pasaron de plpgsql a sql: el control de sesión sigue (vive en inventory_estimates).
do $$
begin
  perform public.get_inventory_suggestions();
  assert false, 'sin sesión las sugerencias deberían fallar';
exception
  when insufficient_privilege then null;
end $$;
reset role;

-- ----------------------------------------------------------------------------
-- 3 a 6.
-- ----------------------------------------------------------------------------

do $$
declare
  inventory_names text[] := pg_temp.names_for('user_a', 'inventory');
  suggestion_names text[] := pg_temp.names_for('user_a', 'suggestions');
begin
  assert inventory_names = array['zz065 Yogur', 'zz065 Leche', 'zz065 Avena', 'zz065 Café', 'zz065 Atún', 'zz065 Arroz', 'zz065 Sal'],
    'inventario inesperado: ' || inventory_names::text;
  assert suggestion_names = array['zz065 Pan', 'zz065 Té'],
    'sugerencias inesperadas: ' || suggestion_names::text;
  assert not (inventory_names && suggestion_names),
    'un producto no debería estar en el inventario y en las sugerencias a la vez';
  assert pg_temp.names_for('user_b', 'inventory') = array['zz065 Leche'],
    'B solo debería ver su propio inventario';
  assert pg_temp.names_for('user_d', 'inventory') = array['zz065 Café'],
    'un miembro debería ver el inventario de la lista de la familia';
  assert pg_temp.names_for('user_c', 'inventory') = array['zz065 Café'],
    'quien compró en la familia también lo ve';
end $$;

-- Sal no tiene fecha estimada; Arroz sí (60 días).
select pg_temp.as_user('user_a');
set local role authenticated;
do $$
begin
  assert (select i.expected_out_at from public.get_my_inventory() i where i.product_name = 'zz065 Sal') is null,
    'Sal ("No vence" con una compra) no debería tener fecha';
  assert (select i.expected_out_at from public.get_my_inventory() i where i.product_name = 'zz065 Arroz')
    = (select i.last_purchased_at from public.get_my_inventory() i where i.product_name = 'zz065 Arroz') + interval '60 days',
    'Arroz con "1-3 meses" debería acabarse a los 60 días';
end $$;
reset role;

select pg_temp.as_user('user_a');

rollback;
