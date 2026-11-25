-- ============================================================================
-- Prueba de la migración 061 (SCRUM-102): sugerencias de inventario.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 061. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios, productos, listas ni familias en la
-- base compartida. Si una regla no se cumple, un `assert` corta con su
-- mensaje; si termina sin error, pasó. Contra la base sin 061 falla en el paso 0.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- La RPC se llama con `set local role authenticated` y request.jwt.claims de
-- cada persona, nunca como el dueño de las tablas: así corre con la RLS real.
--
-- Usa su propia categoría ("zz061 Categoría", 7 días) para no depender de los
-- valores de las categorías reales. Los nombres empiezan con "zz061".
--
-- Los artículos se tachan con el trigger de 015 apagado solo para ese paso: es
-- la única forma de fabricar varias fechas en una transacción (como en 049).
-- Dentro de la transacción now() no cambia, así que los días son exactos.
--
-- Qué comprueba (features/inventory-suggestions/specs/SPEC.md §5):
--   1. permisos: anon no ejecuta la RPC ni lee category_shelf_life;
--      authenticated no escribe en category_shelf_life;
--   2. sin sesión: 42501;
--   3. sin lista general: vacío;
--   4. una compra: duración de la categoría o 14 días sin categoría;
--   5. dos compras o más: promedio entre compras, aunque la categoría diga otra cosa;
--   6. varias filas el mismo día de Costa Rica cuentan como una compra, aunque sean
--      de otra presentación; el borde exacto de la duración se sugiere;
--   7. por producto: se sugiere la presentación de la última compra;
--   8. no se sugiere lo pendiente (cualquier presentación), lo de hace más de 180 días
--      ni un producto archivado (052);
--   9. orden: la que se acabó hace más tiempo primero, después por nombre;
--  10. aislamiento: otra persona no ve las sugerencias de A;
--  11. familia: un miembro ve las sugerencias de la lista de la familia.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño). Los ids viajan entre pasos en variables de la
--    transacción (set_config(..., true)).
-- ----------------------------------------------------------------------------

do $$
begin
  assert to_regprocedure('public.get_inventory_suggestions()') is not null,
    'falta get_inventory_suggestions: aplicar 061 antes de esta prueba';
  assert to_regclass('public.category_shelf_life') is not null,
    'falta category_shelf_life: aplicar 061 antes de esta prueba';
end $$;

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

-- Producto global con sus presentaciones. with_category: la de la prueba (7 días) o ninguna.
create function pg_temp.new_product(product_key text, product_name text, with_category boolean, variant_count integer)
returns void
language plpgsql
as $$
declare
  new_product_id uuid;
  new_variant_id uuid;
begin
  insert into public.product_catalog (name, category_id, owner_id, household_id, source)
  values (
    product_name,
    case when with_category then pg_temp.id_of('category') else null end,
    null,
    null,
    'manual'
  )
  returning id into new_product_id;

  for variant_index in 1..variant_count loop
    insert into public.product_catalog_variants (product_catalog_id, name, base_unit, base_quantity)
    values (new_product_id, product_name || ' ' || variant_index, 'ml', 1000 * variant_index)
    returning id into new_variant_id;
    perform set_config('tacha_test.' || product_key || '_v' || variant_index, new_variant_id::text, true);
  end loop;
end;
$$;

-- Lista general: personal (household_key null) o de la familia.
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

-- Un artículo tachado en un momento exacto.
create function pg_temp.new_item_at(list_key text, variant_key text, checked timestamptz)
returns void
language sql
as $$
  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested, checked_at)
  values (pg_temp.id_of(list_key), pg_temp.id_of(variant_key), 1, checked);
$$;

-- Un artículo tachado hace days_ago días; days_ago null = pendiente.
create function pg_temp.new_item(list_key text, variant_key text, days_ago integer)
returns void
language sql
as $$
  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested, checked_at)
  values (
    pg_temp.id_of(list_key),
    pg_temp.id_of(variant_key),
    1,
    case when days_ago is null then null else now() - make_interval(days => days_ago) end
  );
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
  insert into public.categories (name) values ('zz061 Categoría') returning id into new_id;
  perform set_config('tacha_test.category', new_id::text, true);
  insert into public.category_shelf_life (category_id, shelf_life_days) values (new_id, 7);

  insert into public.households (name) values ('zz061 Familia') returning id into new_id;
  perform set_config('tacha_test.household', new_id::text, true);
  insert into public.household_members (user_id, household_id, role)
  values (pg_temp.id_of('user_c'), new_id, 'admin'), (pg_temp.id_of('user_d'), new_id, 'member');
end $$;

select pg_temp.new_product('leche', 'zz061 Leche', true, 1);
select pg_temp.new_product('pan', 'zz061 Pan', true, 1);
select pg_temp.new_product('arroz', 'zz061 Arroz', false, 1);
select pg_temp.new_product('frijoles', 'zz061 Frijoles', false, 1);
select pg_temp.new_product('cafe', 'zz061 Café', true, 1);
select pg_temp.new_product('te', 'zz061 Té', true, 1);
select pg_temp.new_product('atun', 'zz061 Atún', true, 2);
select pg_temp.new_product('yogur', 'zz061 Yogur', true, 1);
select pg_temp.new_product('jugo', 'zz061 Jugo', true, 2);
select pg_temp.new_product('huevos', 'zz061 Huevos', true, 2);
select pg_temp.new_product('sal', 'zz061 Sal', true, 1);
select pg_temp.new_product('archivado', 'zz061 Archivado', true, 1);
update public.product_catalog set archived_at = now() where name = 'zz061 Archivado';

select pg_temp.new_general_list('list_a', 'user_a');
select pg_temp.new_general_list('list_b', 'user_b');
select pg_temp.new_general_list('list_family', 'user_c', 'household');

alter table public.list_items disable trigger list_items_stamp_check;

-- Lista de A. Salida esperada (día en que se acabó, días desde hoy):
--   Café   20 + 10 = -10 | Jugo 25 + 15 = -10 | Arroz 20 + 14 = -6
--   Leche  10 + 7  = -3  | Atún ~9 + 7  = ~-2 | Yogur  7 + 7 = 0 (borde: se sugiere)
-- Leche: una compra, categoría de 7 días, hace 10.
select pg_temp.new_item('list_a', 'leche_v1', 10);
-- Pan: una compra hace 3; todavía le quedan 4 días.
select pg_temp.new_item('list_a', 'pan_v1', 3);
-- Arroz: sin categoría (14 días), hace 20.
select pg_temp.new_item('list_a', 'arroz_v1', 20);
-- Frijoles: sin categoría, hace 10; todavía le quedan 4 días.
select pg_temp.new_item('list_a', 'frijoles_v1', 10);
-- Café: tres compras cada 10 días; la última hace 20.
select pg_temp.new_item('list_a', 'cafe_v1', 40);
select pg_temp.new_item('list_a', 'cafe_v1', 30);
select pg_temp.new_item('list_a', 'cafe_v1', 20);
-- Té: dos compras con 28 días entre ellas, la última hace 10. Con la categoría
-- (7 días) se habría acabado hace 3 y se sugeriría; con el historial le quedan 18.
select pg_temp.new_item('list_a', 'te_v1', 38);
select pg_temp.new_item('list_a', 'te_v1', 10);
-- Atún: dos filas del mismo día de Costa Rica, a la 1 a. m. y a las 9 p. m., de
-- presentaciones distintas. En UTC serían dos días (las 9 p. m. ya es el día
-- siguiente): con dos compras la duración sería 1 y quedaría antes que Leche.
select pg_temp.new_item_at('list_a', 'atun_v1',
  date_trunc('day', now(), 'America/Costa_Rica') - interval '9 days' + interval '1 hour');
select pg_temp.new_item_at('list_a', 'atun_v2',
  date_trunc('day', now(), 'America/Costa_Rica') - interval '9 days' + interval '21 hours');
-- Yogur: una compra hace exactamente 7 días (la duración de su categoría).
select pg_temp.new_item('list_a', 'yogur_v1', 7);
-- Jugo: dos compras de presentaciones distintas; se sugiere la última (v2).
select pg_temp.new_item('list_a', 'jugo_v1', 40);
select pg_temp.new_item('list_a', 'jugo_v2', 25);
-- Huevos: se acabó, pero otra presentación ya está pendiente en la lista.
select pg_temp.new_item('list_a', 'huevos_v1', 20);
select pg_temp.new_item('list_a', 'huevos_v2', null);
-- Sal: la última compra fue hace más de 180 días.
select pg_temp.new_item('list_a', 'sal_v1', 200);
-- Archivado: se acabó, pero el producto se eliminó de "Mis productos" (052).
select pg_temp.new_item('list_a', 'archivado_v1', 20);

-- Lista de la familia de C y D: leche comprada por C hace 10 días.
select pg_temp.new_item('list_family', 'leche_v1', 10);
-- Lista de B: pan comprado hace 20 días. A no lo tiene que ver, ni B lo de A.
select pg_temp.new_item('list_b', 'pan_v1', 20);

alter table public.list_items enable trigger list_items_stamp_check;

-- ----------------------------------------------------------------------------
-- 1. Permisos.
-- ----------------------------------------------------------------------------

do $$
begin
  assert not has_function_privilege('anon', 'public.get_inventory_suggestions()', 'execute'),
    'anon no debería poder ejecutar get_inventory_suggestions';
  assert has_function_privilege('authenticated', 'public.get_inventory_suggestions()', 'execute'),
    'authenticated debería poder ejecutar get_inventory_suggestions';
  assert not has_table_privilege('anon', 'public.category_shelf_life', 'select'),
    'anon no debería leer category_shelf_life';
  assert not has_table_privilege('authenticated', 'public.category_shelf_life', 'insert'),
    'authenticated no debería insertar en category_shelf_life';
  assert not has_table_privilege('authenticated', 'public.category_shelf_life', 'update'),
    'authenticated no debería cambiar category_shelf_life';
  assert not has_table_privilege('authenticated', 'public.category_shelf_life', 'delete'),
    'authenticated no debería borrar de category_shelf_life';
end $$;

-- ----------------------------------------------------------------------------
-- 2. Sin sesión: 42501.
-- ----------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"role": "authenticated"}', true);
set local role authenticated;

do $$
begin
  perform public.get_inventory_suggestions();
  assert false, 'sin sesión debería fallar';
exception
  when insufficient_privilege then null;
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 3. E no tiene lista general: vacío.
-- ----------------------------------------------------------------------------

select pg_temp.as_user('user_e');
set local role authenticated;

do $$
begin
  assert (select count(*) from public.get_inventory_suggestions()) = 0,
    'sin lista general no debería haber sugerencias';
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 4 a 9. Lista de A: qué se sugiere, con qué presentación y en qué orden.
-- ----------------------------------------------------------------------------

select pg_temp.as_user('user_a');
set local role authenticated;

do $$
declare
  suggested_names text[];
  jugo_variant uuid;
  leche_out_at timestamptz;
  leche_last_at timestamptz;
begin
  select array_agg(s.product_name order by s.ordinality)
  into suggested_names
  from public.get_inventory_suggestions() with ordinality as s;

  assert suggested_names = array['zz061 Café', 'zz061 Jugo', 'zz061 Arroz', 'zz061 Leche', 'zz061 Atún', 'zz061 Yogur'],
    'sugerencias u orden inesperados: ' || coalesce(suggested_names::text, 'ninguna');

  select s.product_catalog_variant_id into jugo_variant
  from public.get_inventory_suggestions() s
  where s.product_name = 'zz061 Jugo';
  assert jugo_variant = pg_temp.id_of('jugo_v2'),
    'se debería sugerir la presentación de la última compra';

  select s.expected_out_at, s.last_purchased_at into leche_out_at, leche_last_at
  from public.get_inventory_suggestions() s
  where s.product_name = 'zz061 Leche';
  assert leche_out_at = leche_last_at + interval '7 days',
    'una compra debería usar la duración de la categoría';
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 10 y 11. Aislamiento y familia: B ve solo lo suyo; D (miembro) ve la leche
--         de la lista de la familia; A no ve lo de B ni lo de la familia.
-- ----------------------------------------------------------------------------

select pg_temp.as_user('user_b');
set local role authenticated;

do $$
begin
  assert (select array_agg(s.product_name) from public.get_inventory_suggestions() s) = array['zz061 Pan'],
    'B solo debería ver las sugerencias de su propia lista';
end $$;

reset role;

select pg_temp.as_user('user_d');
set local role authenticated;

do $$
begin
  assert (select array_agg(s.product_name) from public.get_inventory_suggestions() s) = array['zz061 Leche'],
    'un miembro debería ver las sugerencias de la lista de la familia';
end $$;

reset role;

select pg_temp.as_user('user_a');
set local role authenticated;

do $$
begin
  assert (select count(*) from public.get_inventory_suggestions()) = 6,
    'A solo debería ver las sugerencias de su propia lista';
end $$;

reset role;

rollback;
