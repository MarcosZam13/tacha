-- ============================================================================
-- Prueba de la migración 067 (SCRUM-106): "Ya se acabó" y ajustar la fecha.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 061, 063, 064, 065 y 067. Todo pasa dentro de una transacción que
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
-- paso (como en 061). Dentro de la transacción now() no cambia: "se acaba
-- ahora" y "dentro de 4 días" se comparan exactos.
--
-- Qué comprueba (features/my-inventory/specs/SPEC.md §16):
--   1. permisos: anon no ejecuta las acciones; nadie ejecuta la interna ni
--      escribe la tabla directo;
--   2. errores: sin sesión 42501; sin presentación, presentación de otra lista,
--      producto sin compras y chip no válido 22023;
--   3. "Ya se acabó": sale del inventario y pasa a sugerencias; si estaba
--      pospuesto con la ✕, se borra lo pospuesto; si está pendiente, ni uno ni
--      otro; no cambia list_items (CA-03); la ✕ después lo devuelve al inventario;
--   4. ajustar: el chip cuenta desde ahora (4 días); "No vence" queda sin fecha;
--      también borra lo pospuesto;
--   5. una compra nueva deja sin efecto el ajuste;
--   6. familia y aislamiento: lo que marca un miembro lo ve el otro; B no se
--      entera de lo de A.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño).
-- ----------------------------------------------------------------------------

do $$
begin
  assert to_regprocedure('public.mark_inventory_item_used_up(uuid)') is not null,
    'falta mark_inventory_item_used_up: aplicar 067 antes de esta prueba';
  assert to_regprocedure('public.adjust_inventory_item(uuid, text)') is not null,
    'falta adjust_inventory_item: aplicar 067 antes de esta prueba';
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

-- Fila tachada hace days_ago días (null = pendiente).
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

-- "Ya se acabó" como esa persona.
create function pg_temp.used_up_as(user_key text, variant_key text)
returns void
language plpgsql
as $$
declare
  variant_id uuid := pg_temp.id_of(variant_key);
begin
  perform pg_temp.as_user(user_key);
  set local role authenticated;
  perform public.mark_inventory_item_used_up(variant_id);
  reset role;
end;
$$;

-- Un chip como esa persona.
create function pg_temp.adjust_as(user_key text, variant_key text, choice text)
returns void
language plpgsql
as $$
declare
  variant_id uuid := pg_temp.id_of(variant_key);
begin
  perform pg_temp.as_user(user_key);
  set local role authenticated;
  perform public.adjust_inventory_item(variant_id, choice);
  reset role;
end;
$$;

-- El sqlstate que da una acción como esa persona ('ok' si no falla).
create function pg_temp.error_of(user_key text, action text, variant_key text, choice text default null)
returns text
language plpgsql
as $$
declare
  variant_id uuid := case when variant_key is null then null else pg_temp.id_of(variant_key) end;
begin
  if user_key is null then
    perform set_config('request.jwt.claims', '{"role": "authenticated"}', true);
  else
    perform pg_temp.as_user(user_key);
  end if;
  begin
    set local role authenticated;
    if action = 'used_up' then
      perform public.mark_inventory_item_used_up(variant_id);
    else
      perform public.adjust_inventory_item(variant_id, choice);
    end if;
    reset role;
    return 'ok';
  exception
    when others then
      return sqlstate;
  end;
end;
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
    where i.product_name like 'zz067%';
  else
    select array_agg(s.product_name order by s.ordinality) into names
    from public.get_inventory_suggestions() with ordinality as s
    where s.product_name like 'zz067%';
  end if;
  reset role;
  return coalesce(names, '{}'::text[]);
end;
$$;

-- La fecha estimada de un producto en el inventario, como esa persona.
create function pg_temp.expected_out_for(user_key text, product_name text)
returns timestamptz
language plpgsql
as $$
declare
  result timestamptz;
begin
  perform pg_temp.as_user(user_key);
  set local role authenticated;
  select i.expected_out_at into result from public.get_my_inventory() i where i.product_name = expected_out_for.product_name;
  reset role;
  return result;
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
  insert into public.categories (name) values ('zz067 Categoría') returning id into new_id;
  perform set_config('tacha_test.category', new_id::text, true);
  insert into public.category_shelf_life (category_id, shelf_life_days) values (new_id, 30);

  insert into public.households (name) values ('zz067 Familia') returning id into new_id;
  perform set_config('tacha_test.household', new_id::text, true);
  insert into public.household_members (user_id, household_id, role)
  values (pg_temp.id_of('user_c'), new_id, 'admin'), (pg_temp.id_of('user_d'), new_id, 'member');
end $$;

select pg_temp.new_product('leche', 'zz067 Leche');
select pg_temp.new_product('cafe', 'zz067 Café');
select pg_temp.new_product('arroz', 'zz067 Arroz');
select pg_temp.new_product('yogur', 'zz067 Yogur');
select pg_temp.new_product('atun', 'zz067 Atún');
select pg_temp.new_product('huevos', 'zz067 Huevos');
select pg_temp.new_product('pan', 'zz067 Pan');
select pg_temp.new_product('te', 'zz067 Té');

select pg_temp.new_general_list('list_a', 'user_a');
select pg_temp.new_general_list('list_b', 'user_b');
select pg_temp.new_general_list('list_family', 'user_c', 'household');

alter table public.list_items disable trigger list_items_stamp_check;
-- Categoría de prueba: 30 días. Todo lo de A está en el inventario al empezar,
-- salvo Yogur (pasó su fecha, pero está pospuesto con la ✕: también está).
select pg_temp.new_item('list_a', 'leche', 2);
select pg_temp.new_item('list_a', 'cafe', 2);
select pg_temp.new_item('list_a', 'arroz', 2);
select pg_temp.new_item('list_a', 'yogur', 40);
select pg_temp.new_item('list_a', 'atun', 3);
select pg_temp.new_item('list_a', 'huevos', 2);
select pg_temp.new_item('list_a', 'huevos', null);
-- Pan: solo pendiente, nunca comprado.
select pg_temp.new_item('list_a', 'pan', null);
-- B: leche y té.
select pg_temp.new_item('list_b', 'leche', 2);
select pg_temp.new_item('list_b', 'te', 2);
-- Familia de C y D: café comprado hace 2.
select pg_temp.new_item('list_family', 'cafe', 2);
alter table public.list_items enable trigger list_items_stamp_check;

insert into public.inventory_suggestion_dismissals (list_id, product_catalog_id, dismissed_until, dismissed_by)
values (pg_temp.id_of('list_a'), pg_temp.id_of('yogur_product'), now() + interval '7 days', pg_temp.id_of('user_a'));

do $$
begin
  assert pg_temp.names_for('user_a', 'inventory')
    = array['zz067 Yogur', 'zz067 Atún', 'zz067 Arroz', 'zz067 Café', 'zz067 Huevos', 'zz067 Leche'],
    'inventario inicial inesperado: ' || pg_temp.names_for('user_a', 'inventory')::text;
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos.
-- ----------------------------------------------------------------------------

do $$
begin
  assert not has_function_privilege('anon', 'public.mark_inventory_item_used_up(uuid)', 'execute'),
    'anon no debería marcar "Ya se acabó"';
  assert not has_function_privilege('anon', 'public.adjust_inventory_item(uuid, text)', 'execute'),
    'anon no debería ajustar';
  assert has_function_privilege('authenticated', 'public.mark_inventory_item_used_up(uuid)', 'execute'),
    'authenticated debería poder marcar "Ya se acabó"';
  assert has_function_privilege('authenticated', 'public.adjust_inventory_item(uuid, text)', 'execute'),
    'authenticated debería poder ajustar';
  assert not has_function_privilege('authenticated', 'public.save_inventory_adjustment(uuid, text, text, timestamptz)', 'execute'),
    'nadie debería llamar a la interna directo';
  assert not has_function_privilege('anon', 'public.save_inventory_adjustment(uuid, text, text, timestamptz)', 'execute'),
    'anon no debería llamar a la interna';
  assert not has_table_privilege('authenticated', 'public.inventory_adjustments', 'insert'),
    'la tabla no se escribe directo';
  assert not has_table_privilege('authenticated', 'public.inventory_adjustments', 'update'),
    'la tabla no se actualiza directo';
  assert not has_table_privilege('authenticated', 'public.inventory_adjustments', 'delete'),
    'la tabla no se borra directo';
  assert not has_table_privilege('anon', 'public.inventory_adjustments', 'select'),
    'anon no debería leer los ajustes';
end $$;

-- ----------------------------------------------------------------------------
-- 2. Errores.
-- ----------------------------------------------------------------------------

do $$
begin
  assert pg_temp.error_of(null, 'used_up', 'leche') = '42501', 'sin sesión debería ser 42501';
  assert pg_temp.error_of(null, 'adjust', 'leche', 'few_days') = '42501', 'sin sesión, ajustar debería ser 42501';
  assert pg_temp.error_of('user_a', 'used_up', null) = '22023', 'sin presentación debería ser 22023';
  -- Té está en la lista de B, no en la de A: no se puede ni saber si existe.
  assert pg_temp.error_of('user_a', 'used_up', 'te') = '22023', 'una presentación de otra lista debería ser 22023';
  assert pg_temp.error_of('user_a', 'adjust', 'te', 'few_days') = '22023', 'ajustar en otra lista debería ser 22023';
  -- Pan solo está pendiente: nunca se compró, no está en el inventario.
  assert pg_temp.error_of('user_a', 'used_up', 'pan') = '22023', 'un producto sin compras debería ser 22023';
  assert pg_temp.error_of('user_a', 'adjust', 'leche', 'forever') = '22023', 'un chip no válido debería ser 22023';
  assert pg_temp.error_of('user_a', 'adjust', 'leche', null) = '22023', 'sin chip debería ser 22023';
end $$;

-- Escribir la tabla directo, como A: sin permiso.
select pg_temp.as_user('user_a');
set local role authenticated;
do $$
begin
  insert into public.inventory_adjustments (list_id, product_catalog_id, purchased_at, status, expected_out_at)
  values (pg_temp.id_of('list_a'), pg_temp.id_of('leche_product'), now(), 'used_up', now());
  assert false, 'no debería poder escribir la tabla directo';
exception
  when insufficient_privilege then null;
end $$;
reset role;

-- Ningún error dejó filas.
do $$
begin
  assert (select count(*) from public.inventory_adjustments where list_id in (pg_temp.id_of('list_a'), pg_temp.id_of('list_b'))) = 0,
    'los errores no deberían guardar ajustes';
end $$;

-- ----------------------------------------------------------------------------
-- 3 a 5. Las acciones.
-- ----------------------------------------------------------------------------

do $$
declare
  items_before integer := (select count(*) from public.list_items where list_id = pg_temp.id_of('list_a'));
  leche_checked_before timestamptz := (
    select max(checked_at) from public.list_items
    where list_id = pg_temp.id_of('list_a') and product_catalog_variant_id = pg_temp.id_of('leche')
  );
begin
  -- 3. "Ya se acabó": Leche (normal), Yogur (pospuesto) y Huevos (pendiente).
  perform pg_temp.used_up_as('user_a', 'leche');
  perform pg_temp.used_up_as('user_a', 'yogur');
  perform pg_temp.used_up_as('user_a', 'huevos');
  -- 4. Café con "Vence en pocos días"; Arroz con "No vence".
  perform pg_temp.adjust_as('user_a', 'cafe', 'few_days');
  perform pg_temp.adjust_as('user_a', 'arroz', 'no_expiry');
  -- 5. Atún: "Ya se acabó" y después se vuelve a comprar hoy.
  perform pg_temp.used_up_as('user_a', 'atun');
  alter table public.list_items disable trigger list_items_stamp_check;
  perform pg_temp.new_item('list_a', 'atun', 0);
  alter table public.list_items enable trigger list_items_stamp_check;

  -- Atún (+3, ver abajo), Café (+4) y Arroz (sin fecha, al final).
  assert pg_temp.names_for('user_a', 'inventory') = array['zz067 Atún', 'zz067 Café', 'zz067 Arroz'],
    'inventario inesperado: ' || pg_temp.names_for('user_a', 'inventory')::text;
  -- Leche y Yogur pasan a sugerencias (Yogur ya no está pospuesto); Huevos está pendiente: en ninguna.
  assert pg_temp.names_for('user_a', 'suggestions') = array['zz067 Leche', 'zz067 Yogur'],
    'sugerencias inesperadas: ' || pg_temp.names_for('user_a', 'suggestions')::text;
  assert not exists (
    select 1 from public.inventory_suggestion_dismissals
    where list_id = pg_temp.id_of('list_a') and product_catalog_id = pg_temp.id_of('yogur_product')
  ), '"Ya se acabó" debería borrar lo pospuesto con la ✕';

  assert pg_temp.expected_out_for('user_a', 'zz067 Café') = now() + interval '4 days',
    'el chip debería contar desde ahora: 4 días';
  assert pg_temp.expected_out_for('user_a', 'zz067 Arroz') is null,
    '"No vence" debería quedar sin fecha';
  -- Dos compras con 3 días entre ellas: el promedio, 3 días desde hoy (061).
  assert pg_temp.expected_out_for('user_a', 'zz067 Atún') = now() + interval '3 days',
    'una compra nueva debería dejar sin efecto el ajuste (vuelve el cálculo normal)';

  -- CA-03: list_items no cambia (una fila nueva: la compra de Atún de hoy).
  assert (select count(*) from public.list_items where list_id = pg_temp.id_of('list_a')) = items_before + 1,
    'las acciones no deberían agregar ni borrar filas de la lista';
  assert (
    select max(checked_at) from public.list_items
    where list_id = pg_temp.id_of('list_a') and product_catalog_variant_id = pg_temp.id_of('leche')
  ) = leche_checked_before, '"Ya se acabó" no debería cambiar la compra';
end $$;

-- Volver a ajustar reemplaza: Café pasa de "pocos días" a "1-3 meses".
do $$
begin
  perform pg_temp.adjust_as('user_a', 'cafe', 'one_to_three_months');
  assert pg_temp.expected_out_for('user_a', 'zz067 Café') = now() + interval '60 days',
    'volver a ajustar debería reemplazar el ajuste anterior';
  assert (select count(*) from public.inventory_adjustments where list_id = pg_temp.id_of('list_a')) = 6,
    'una fila por producto';
end $$;

-- La ✕ después de "Ya se acabó": "todavía lo tengo", vuelve al inventario (SPEC §16 regla 5).
-- Y un chip también borra lo pospuesto.
create function pg_temp.dismiss_as(user_key text, variant_key text)
returns void
language plpgsql
as $$
declare
  variant_id uuid := pg_temp.id_of(variant_key);
begin
  perform pg_temp.as_user(user_key);
  set local role authenticated;
  perform public.dismiss_inventory_suggestion(variant_id);
  reset role;
end;
$$;

do $$
begin
  perform pg_temp.dismiss_as('user_a', 'leche');
  assert 'zz067 Leche' = any (pg_temp.names_for('user_a', 'inventory')),
    'la ✕ después de "Ya se acabó" debería devolver el producto al inventario';
  assert not ('zz067 Leche' = any (pg_temp.names_for('user_a', 'suggestions'))),
    'pospuesto con la ✕, no debería ser sugerencia';

  perform pg_temp.dismiss_as('user_a', 'arroz');
  perform pg_temp.adjust_as('user_a', 'arroz', 'few_days');
  assert not exists (
    select 1 from public.inventory_suggestion_dismissals
    where list_id = pg_temp.id_of('list_a') and product_catalog_id = pg_temp.id_of('arroz_product')
  ), 'un chip debería borrar lo pospuesto con la ✕';
end $$;

-- ----------------------------------------------------------------------------
-- 6. Familia y aislamiento.
-- ----------------------------------------------------------------------------

do $$
begin
  -- B no se entera de que A marcó Leche.
  assert pg_temp.names_for('user_b', 'inventory') = array['zz067 Leche', 'zz067 Té'],
    'B debería seguir viendo su propio inventario: ' || pg_temp.names_for('user_b', 'inventory')::text;
  -- C marca Café en la lista de la familia: D lo ve como sugerencia, no en el inventario.
  perform pg_temp.used_up_as('user_c', 'cafe');
  assert pg_temp.names_for('user_d', 'inventory') = '{}'::text[],
    'D no debería ver en el inventario lo que C marcó: ' || pg_temp.names_for('user_d', 'inventory')::text;
  assert pg_temp.names_for('user_d', 'suggestions') = array['zz067 Café'],
    'D debería ver como sugerencia lo que C marcó';
  -- Y lo de la familia no toca la lista de A.
  assert pg_temp.expected_out_for('user_a', 'zz067 Café') = now() + interval '60 days',
    'lo de la familia no debería cambiar la lista de A';
end $$;

-- B no puede leer los ajustes de A.
select pg_temp.as_user('user_b');
set local role authenticated;
do $$
begin
  assert (select count(*) from public.inventory_adjustments) = 0,
    'B no debería leer los ajustes de otras listas';
end $$;
reset role;

select pg_temp.as_user('user_a');

rollback;
