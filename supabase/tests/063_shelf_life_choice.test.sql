-- ============================================================================
-- Prueba de la migración 063 (SCRUM-103): cuánto le va a durar, al tachar.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 061 y 063. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios, productos ni listas en la base
-- compartida. Si una regla no se cumple, un `assert` corta con su mensaje; si
-- termina sin error, pasó. El SQL Editor muestra el resultado del último
-- select (una fila vacía de as_user): eso también es "pasó".
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- Las escrituras de chips y la RPC se hacen con `set local role authenticated`
-- y request.jwt.claims de cada persona: así corren con la RLS y los permisos
-- reales. Las fechas pasadas se fabrican como dueño, con el trigger de 015
-- apagado solo para ese paso (como en 049 y 061).
--
-- Qué comprueba (features/shopping-list/specs/SPEC.md §19):
--   1. la columna acepta solo los cuatro valores;
--   2. authenticated puede escribir el chip de una fila de su lista y no de otra;
--   3. una fila pendiente no guarda chip (ni al insertarla ni con un update como
--      authenticated), y destachar lo borra;
--   4. el chip de la última compra manda sobre la categoría y el historial; si la
--      última compra no tiene chip, se ignora el de una anterior;
--   5. "No vence" con una compra no se sugiere; con dos, se usa el historial;
--   6. sin chip, todo sigue igual que en 061.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño).
-- ----------------------------------------------------------------------------

do $$
begin
  assert to_regprocedure('public.get_inventory_suggestions()') is not null,
    'falta get_inventory_suggestions: aplicar 061 antes de esta prueba';
  assert exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'list_items' and column_name = 'shelf_life_choice'
  ), 'falta list_items.shelf_life_choice: aplicar 063 antes de esta prueba';
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
  insert into public.product_catalog_variants (product_catalog_id, name, base_unit, base_quantity)
  values (new_product_id, product_name || ' 1', 'ml', 1000)
  returning id into new_variant_id;
  perform set_config('tacha_test.' || product_key, new_variant_id::text, true);
end;
$$;

create function pg_temp.new_general_list(list_key text, user_key text)
returns void
language plpgsql
as $$
declare
  new_id uuid;
begin
  insert into public.lists (owner_id, type) values (pg_temp.id_of(user_key), 'general') returning id into new_id;
  perform set_config('tacha_test.' || list_key, new_id::text, true);
end;
$$;

-- Fila tachada hace days_ago días (null = pendiente), con su chip. Guarda su id en tacha_test.<item_key>.
create function pg_temp.new_item(item_key text, list_key text, variant_key text, days_ago integer, choice text)
returns void
language plpgsql
as $$
declare
  new_id uuid;
begin
  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested, checked_at, shelf_life_choice)
  values (
    pg_temp.id_of(list_key),
    pg_temp.id_of(variant_key),
    1,
    case when days_ago is null then null else now() - make_interval(days => days_ago) end,
    choice
  )
  returning id into new_id;
  perform set_config('tacha_test.' || item_key, new_id::text, true);
end;
$$;

select pg_temp.new_user('user_a');
select pg_temp.new_user('user_b');

do $$
declare
  new_id uuid;
begin
  insert into public.categories (name) values ('zz063 Categoría') returning id into new_id;
  perform set_config('tacha_test.category', new_id::text, true);
  insert into public.category_shelf_life (category_id, shelf_life_days) values (new_id, 30);
end $$;

select pg_temp.new_product('queso', 'zz063 Queso');
select pg_temp.new_product('yogur', 'zz063 Yogur');
select pg_temp.new_product('cafe', 'zz063 Café');
select pg_temp.new_product('sal', 'zz063 Sal');
select pg_temp.new_product('azucar', 'zz063 Azúcar');
select pg_temp.new_product('arroz', 'zz063 Arroz');
select pg_temp.new_product('pan', 'zz063 Pan');
select pg_temp.new_product('leche', 'zz063 Leche');
select pg_temp.new_product('te', 'zz063 Té');

select pg_temp.new_general_list('list_a', 'user_a');
select pg_temp.new_general_list('list_b', 'user_b');

alter table public.list_items disable trigger list_items_stamp_check;

-- Lista de A. Categoría de prueba: 30 días.
-- Queso: una compra hace 6 días con "pocos días" (4): se sugiere. Sin chip no (30).
select pg_temp.new_item('queso_1', 'list_a', 'queso', 6, 'few_days');
-- Yogur: una compra hace 40 días con "1-3 meses" (60): no se sugiere. Sin chip sí (30).
select pg_temp.new_item('yogur_1', 'list_a', 'yogur', 40, 'one_to_three_months');
-- Café: compras cada 10 días (30 y 20), la última con "2-4 semanas" (21): no se sugiere.
-- Sin chip, el historial (10) lo sugeriría.
select pg_temp.new_item('cafe_1', 'list_a', 'cafe', 30, null);
select pg_temp.new_item('cafe_2', 'list_a', 'cafe', 20, 'two_to_four_weeks');
-- Sal: una compra hace 100 días con "No vence": no se sugiere (sin chip, 30, sí).
select pg_temp.new_item('sal_1', 'list_a', 'sal', 100, 'no_expiry');
-- Azúcar: compras hace 30 y 20 días, la última con "No vence": se usa el historial (10), se sugiere.
select pg_temp.new_item('azucar_1', 'list_a', 'azucar', 30, null);
select pg_temp.new_item('azucar_2', 'list_a', 'azucar', 20, 'no_expiry');
-- Arroz: una compra hace 40 días sin chip: igual que 061 (categoría, 30), se sugiere.
select pg_temp.new_item('arroz_1', 'list_a', 'arroz', 40, null);
-- Té: compras hace 30 (con "1-3 meses") y 20 días (sin chip). Manda la última, sin
-- chip: el historial (10 días), se sugiere. Si mandara el chip viejo (60), no.
select pg_temp.new_item('te_1', 'list_a', 'te', 30, 'one_to_three_months');
select pg_temp.new_item('te_2', 'list_a', 'te', 20, null);
-- Pan: pendiente, insertada con un chip que la base no guarda.
select pg_temp.new_item('pan_pending', 'list_a', 'pan', null, 'few_days');
-- Fila de A tachada hoy, para escribirle el chip como A y destacharla. Otro
-- producto que el pan pendiente: dos pendientes de la misma presentación chocan
-- con el índice único de 035.
select pg_temp.new_item('leche_today', 'list_a', 'leche', 0, null);

-- Fila de B tachada hoy: A no la puede tocar.
select pg_temp.new_item('pan_b', 'list_b', 'pan', 0, null);

alter table public.list_items enable trigger list_items_stamp_check;

-- ----------------------------------------------------------------------------
-- 1. Valores de la columna.
-- ----------------------------------------------------------------------------

do $$
begin
  update public.list_items set shelf_life_choice = 'para_siempre' where id = pg_temp.id_of('leche_today');
  assert false, 'un valor fuera de los cuatro debería fallar';
exception
  when check_violation then null;
end $$;

-- ----------------------------------------------------------------------------
-- 3. Una fila pendiente no guarda chip.
-- ----------------------------------------------------------------------------

do $$
begin
  assert (select shelf_life_choice from public.list_items where id = pg_temp.id_of('pan_pending')) is null,
    'una fila pendiente no debería guardar chip';
end $$;

-- ----------------------------------------------------------------------------
-- 2. Escribir el chip como A: su fila sí, la de B no.
-- ----------------------------------------------------------------------------

select pg_temp.as_user('user_a');
set local role authenticated;

update public.list_items set shelf_life_choice = 'two_to_four_weeks' where id = pg_temp.id_of('leche_today');
update public.list_items set shelf_life_choice = 'few_days' where id = pg_temp.id_of('pan_b');
-- Su propia fila pendiente: la base no deja el chip.
update public.list_items set shelf_life_choice = 'few_days' where id = pg_temp.id_of('pan_pending');

reset role;

do $$
begin
  assert (select shelf_life_choice from public.list_items where id = pg_temp.id_of('leche_today')) = 'two_to_four_weeks',
    'A debería poder guardar el chip de su fila';
  assert (select shelf_life_choice from public.list_items where id = pg_temp.id_of('pan_b')) is null,
    'A no debería poder guardar el chip de una fila de B';
  assert (select shelf_life_choice from public.list_items where id = pg_temp.id_of('pan_pending')) is null,
    'una fila pendiente no debería guardar chip con un update';
end $$;

-- ----------------------------------------------------------------------------
-- 3 (bis). Destachar borra el chip (como A, con la RLS real).
-- ----------------------------------------------------------------------------

select pg_temp.as_user('user_a');
set local role authenticated;

update public.list_items set checked_at = null where id = pg_temp.id_of('leche_today');

reset role;

do $$
begin
  assert (select shelf_life_choice from public.list_items where id = pg_temp.id_of('leche_today')) is null,
    'destachar debería borrar el chip';
end $$;

-- ----------------------------------------------------------------------------
-- 4 a 6. Sugerencias de A.
-- ----------------------------------------------------------------------------

select pg_temp.as_user('user_a');
set local role authenticated;

do $$
declare
  suggested_names text[];
begin
  select array_agg(s.product_name order by s.product_name)
  into suggested_names
  from public.get_inventory_suggestions() s
  where s.product_name like 'zz063%';

  assert suggested_names = array['zz063 Arroz', 'zz063 Azúcar', 'zz063 Queso', 'zz063 Té'],
    'sugerencias inesperadas: ' || coalesce(suggested_names::text, 'ninguna');
end $$;

reset role;

rollback;
