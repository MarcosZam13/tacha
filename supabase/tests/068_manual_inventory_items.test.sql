-- ============================================================================
-- Prueba de la migración 068 (SCRUM-107): agregar algo a "Mi inventario" a mano.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 061, 063, 064, 065, 067 y 068. Todo pasa dentro de una
-- transacción que termina en rollback, así que no deja usuarios, productos ni
-- listas en la base compartida. Si una regla no se cumple, un `assert` corta
-- con su mensaje; si termina sin error, pasó. El SQL Editor muestra el
-- resultado del último select (una fila vacía de as_user): eso también es "pasó".
--
-- Ejecutarlo completo, nunca por partes.
--
-- Las RPC se llaman con `set local role authenticated` y request.jwt.claims de
-- cada persona: así corren con la RLS y los permisos reales. Dentro de la
-- transacción now() no cambia: "agregado ahora + 21 días" se compara exacto.
--
-- Qué comprueba (features/my-inventory/specs/SPEC.md §17):
--   1. permisos: anon no agrega; nadie escribe la tabla directo;
--   2. errores: sin sesión 42501; sin presentación, chip no válido, producto
--      personal ajeno, propio sin compartir en la lista de una familia,
--      archivado o compartido con otra familia 22023; nada se guarda;
--   3. lo agregado aparece en el inventario como cualquier otro (CA-02): sin
--      chip, la categoría desde ahora; con chip, el chip desde ahora; "No
--      vence", sin fecha; no cambia list_items;
--   4. con una compra anterior, cuenta como una llegada más (promedio);
--   5. quien no tiene lista general todavía: se le crea;
--   6. "Ya se acabó" y "Ajustar fecha" (067) también sirven para lo agregado;
--   7. familia y aislamiento: lo que agrega un miembro lo ve el otro; B no ve
--      lo de A.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño).
-- ----------------------------------------------------------------------------

do $$
begin
  assert to_regprocedure('public.add_inventory_item(uuid, text)') is not null,
    'falta add_inventory_item: aplicar 068 antes de esta prueba';
  assert to_regprocedure('public.mark_inventory_item_used_up(uuid)') is not null,
    'falta la 067: aplicarla antes de la 068';
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

-- Producto con una presentación, en la categoría de prueba (30 días). Sin
-- dueño ni familia es del catálogo global.
create function pg_temp.new_product(
  product_key text,
  product_name text,
  owner_key text default null,
  household_key text default null
)
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
    pg_temp.id_of('category'),
    case when owner_key is null then null else pg_temp.id_of(owner_key) end,
    case when household_key is null then null else pg_temp.id_of(household_key) end,
    'manual'
  )
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

-- Fila tachada hace days_ago días.
create function pg_temp.new_item(list_key text, variant_key text, days_ago integer)
returns void
language sql
as $$
  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested, checked_at)
  values (pg_temp.id_of(list_key), pg_temp.id_of(variant_key), 1, now() - make_interval(days => days_ago));
$$;

-- "+ Agregar a mi inventario" como esa persona.
create function pg_temp.add_as(user_key text, variant_key text, choice text default null)
returns void
language plpgsql
as $$
declare
  variant_id uuid := pg_temp.id_of(variant_key);
begin
  perform pg_temp.as_user(user_key);
  set local role authenticated;
  perform public.add_inventory_item(variant_id, choice);
  reset role;
end;
$$;

-- El sqlstate de agregar como esa persona ('ok' si no falla).
create function pg_temp.add_error_of(user_key text, variant_key text, choice text default null)
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
    perform public.add_inventory_item(variant_id, choice);
    reset role;
    return 'ok';
  exception
    when others then
      return sqlstate;
  end;
end;
$$;

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
    where i.product_name like 'zz068%';
  else
    select array_agg(s.product_name order by s.ordinality) into names
    from public.get_inventory_suggestions() with ordinality as s
    where s.product_name like 'zz068%';
  end if;
  reset role;
  return coalesce(names, '{}'::text[]);
end;
$$;

-- La fecha estimada de un producto en el inventario, como esa persona.
-- 'infinity' si el producto no está: así "no está" y "sin fecha" (null) no se confunden.
create function pg_temp.expected_out_for(user_key text, target_name text)
returns timestamptz
language plpgsql
as $$
declare
  result timestamptz := 'infinity';
begin
  perform pg_temp.as_user(user_key);
  set local role authenticated;
  select i.expected_out_at into result from public.get_my_inventory() i where i.product_name = target_name;
  if not found then
    result := 'infinity';
  end if;
  reset role;
  return result;
end;
$$;

select pg_temp.new_user('user_a');
select pg_temp.new_user('user_b');
select pg_temp.new_user('user_c');
select pg_temp.new_user('user_d');
-- E todavía no tiene lista general.
select pg_temp.new_user('user_e');

do $$
declare
  new_id uuid;
begin
  insert into public.categories (name) values ('zz068 Categoría') returning id into new_id;
  perform set_config('tacha_test.category', new_id::text, true);
  insert into public.category_shelf_life (category_id, shelf_life_days) values (new_id, 30);

  insert into public.households (name) values ('zz068 Familia') returning id into new_id;
  perform set_config('tacha_test.household', new_id::text, true);
  insert into public.households (name) values ('zz068 Otra familia') returning id into new_id;
  perform set_config('tacha_test.other_household', new_id::text, true);
  insert into public.household_members (user_id, household_id, role)
  values (pg_temp.id_of('user_c'), pg_temp.id_of('household'), 'admin'),
         (pg_temp.id_of('user_d'), pg_temp.id_of('household'), 'member');
end $$;

-- Catálogo global.
select pg_temp.new_product('cafe', 'zz068 Café');
select pg_temp.new_product('arroz', 'zz068 Arroz');
select pg_temp.new_product('sal', 'zz068 Sal');
select pg_temp.new_product('leche', 'zz068 Leche');
select pg_temp.new_product('archivado', 'zz068 Archivado');
update public.product_catalog set archived_at = now() where name = 'zz068 Archivado';
-- Personales: de A, de B y de C (sin compartir); compartido con la familia de C y D; y uno de otra familia.
select pg_temp.new_product('queso_a', 'zz068 Queso de A', 'user_a');
select pg_temp.new_product('queso_b', 'zz068 Queso de B', 'user_b');
select pg_temp.new_product('queso_c', 'zz068 Queso de C', 'user_c');
select pg_temp.new_product('pan_familia', 'zz068 Pan de la familia', null, 'household');
select pg_temp.new_product('pan_otra', 'zz068 Pan de otra familia', null, 'other_household');

select pg_temp.new_general_list('list_a', 'user_a');
select pg_temp.new_general_list('list_b', 'user_b');
select pg_temp.new_general_list('list_family', 'user_c', 'household');

-- Leche: A la compró hace 10 días.
alter table public.list_items disable trigger list_items_stamp_check;
select pg_temp.new_item('list_a', 'leche', 10);
alter table public.list_items enable trigger list_items_stamp_check;

-- ----------------------------------------------------------------------------
-- 1. Permisos.
-- ----------------------------------------------------------------------------

do $$
begin
  assert not has_function_privilege('anon', 'public.add_inventory_item(uuid, text)', 'execute'),
    'anon no debería agregar';
  assert has_function_privilege('authenticated', 'public.add_inventory_item(uuid, text)', 'execute'),
    'authenticated debería poder agregar';
  assert not has_function_privilege('authenticated', 'public.save_inventory_adjustment(uuid, text, text, timestamptz)', 'execute'),
    'la interna de la 067 sigue sin execute';
  assert not has_table_privilege('authenticated', 'public.inventory_manual_items', 'insert'),
    'la tabla no se escribe directo';
  assert not has_table_privilege('authenticated', 'public.inventory_manual_items', 'update'),
    'la tabla no se actualiza directo';
  assert not has_table_privilege('authenticated', 'public.inventory_manual_items', 'delete'),
    'la tabla no se borra directo';
  assert not has_table_privilege('anon', 'public.inventory_manual_items', 'select'),
    'anon no debería leer lo agregado';
end $$;

-- ----------------------------------------------------------------------------
-- 2. Errores.
-- ----------------------------------------------------------------------------

do $$
declare
  items_before integer := (select count(*) from public.inventory_manual_items);
begin
  assert pg_temp.add_error_of(null, 'cafe') = '42501', 'sin sesión debería ser 42501';
  assert pg_temp.add_error_of('user_a', null) = '22023', 'sin presentación debería ser 22023';
  assert pg_temp.add_error_of('user_a', 'cafe', 'forever') = '22023', 'un chip no válido debería ser 22023';
  assert pg_temp.add_error_of('user_a', 'queso_b') = '22023', 'un producto personal ajeno debería ser 22023';
  assert pg_temp.add_error_of('user_c', 'queso_c') = '22023',
    'un producto propio sin compartir no entra a la lista de la familia (066)';
  assert pg_temp.add_error_of('user_a', 'archivado') = '22023', 'un producto archivado debería ser 22023';
  assert pg_temp.add_error_of('user_c', 'pan_otra') = '22023', 'un producto de otra familia debería ser 22023';
  assert pg_temp.add_error_of('user_a', 'pan_familia') = '22023', 'un producto de una familia ajena debería ser 22023';
  assert (select count(*) from public.inventory_manual_items) = items_before,
    'los errores no deberían guardar nada';
end $$;

-- Escribir la tabla directo, como A: sin permiso.
select pg_temp.as_user('user_a');
set local role authenticated;
do $$
begin
  insert into public.inventory_manual_items (list_id, product_catalog_variant_id)
  values (pg_temp.id_of('list_a'), pg_temp.id_of('cafe'));
  assert false, 'no debería poder escribir la tabla directo';
exception
  when insufficient_privilege then null;
end $$;
reset role;

-- ----------------------------------------------------------------------------
-- 3 a 5. Agregar.
-- ----------------------------------------------------------------------------

do $$
declare
  list_items_before integer := (select count(*) from public.list_items);
begin
  perform pg_temp.add_as('user_a', 'cafe');
  perform pg_temp.add_as('user_a', 'arroz', 'two_to_four_weeks');
  perform pg_temp.add_as('user_a', 'sal', 'no_expiry');
  perform pg_temp.add_as('user_a', 'queso_a');
  perform pg_temp.add_as('user_a', 'leche');

  -- 3. Sin chip: la categoría (30) desde ahora; con chip: 21; "No vence": sin fecha.
  assert pg_temp.expected_out_for('user_a', 'zz068 Café') = now() + interval '30 days',
    'sin chip debería ser la categoría desde ahora';
  assert pg_temp.expected_out_for('user_a', 'zz068 Arroz') = now() + interval '21 days',
    'con "2-4 semanas" deberían ser 21 días desde ahora';
  assert pg_temp.expected_out_for('user_a', 'zz068 Sal') is null,
    '"No vence" debería quedar sin fecha';
  assert pg_temp.expected_out_for('user_a', 'zz068 Queso de A') = now() + interval '30 days',
    'un producto propio en una lista personal también se agrega';
  -- 4. Leche: comprada hace 10 y agregada hoy: dos llegadas, el promedio (10 días) desde hoy.
  assert pg_temp.expected_out_for('user_a', 'zz068 Leche') = now() + interval '10 days',
    'lo agregado debería contar como una llegada más';

  assert pg_temp.names_for('user_a', 'inventory')
    = array['zz068 Leche', 'zz068 Arroz', 'zz068 Café', 'zz068 Queso de A', 'zz068 Sal'],
    'inventario inesperado: ' || pg_temp.names_for('user_a', 'inventory')::text;

  -- Agregar otra vez el mismo día no crea otra fila: actualiza el chip.
  perform pg_temp.add_as('user_a', 'sal', 'few_days');
  assert (
    select count(*) from public.inventory_manual_items
    where list_id = pg_temp.id_of('list_a') and product_catalog_variant_id = pg_temp.id_of('sal')
  ) = 1, 'una fila por presentación y día';
  assert pg_temp.expected_out_for('user_a', 'zz068 Sal') = now() + interval '4 days',
    'agregar otra vez el mismo día debería cambiar el chip';

  -- CA-02 y no es una compra: list_items no cambia.
  assert (select count(*) from public.list_items) = list_items_before,
    'agregar a mano no debería crear filas en la lista';

  -- 5. E no tenía lista general: se le crea y lo agregado aparece.
  perform pg_temp.add_as('user_e', 'cafe');
  assert pg_temp.names_for('user_e', 'inventory') = array['zz068 Café'],
    'quien no tenía lista debería ver lo que agregó';
  assert exists (
    select 1 from public.lists l
    where l.owner_id = pg_temp.id_of('user_e') and l.type = 'general' and l.household_id is null
  ), 'debería crearse la lista general de E';
end $$;

-- ----------------------------------------------------------------------------
-- 6. "Ya se acabó" y "Ajustar fecha" (067) sobre lo agregado.
-- ----------------------------------------------------------------------------

do $$
begin
  -- now() no cambia en la transacción: el primer Café se corre a ayer para que
  -- "volver a agregar" (abajo) sea una llegada distinta.
  update public.inventory_manual_items
  set added_at = now() - interval '1 day'
  where list_id = pg_temp.id_of('list_a') and product_catalog_variant_id = pg_temp.id_of('cafe');

  perform pg_temp.used_up_as('user_a', 'cafe');
  assert not ('zz068 Café' = any (pg_temp.names_for('user_a', 'inventory'))),
    '"Ya se acabó" debería sacar lo agregado del inventario';
  assert pg_temp.names_for('user_a', 'suggestions') = array['zz068 Café'],
    'lo agregado y acabado debería pasar a sugerencias';

  perform pg_temp.adjust_as('user_a', 'arroz', 'few_days');
  assert pg_temp.expected_out_for('user_a', 'zz068 Arroz') = now() + interval '4 days',
    '"Ajustar fecha" debería servir para lo agregado';

  -- Volver a agregar es una llegada nueva: el ajuste de antes deja de aplicar.
  perform pg_temp.add_as('user_a', 'cafe', 'one_to_three_months');
  assert pg_temp.expected_out_for('user_a', 'zz068 Café') = now() + interval '60 days',
    'volver a agregar debería dejar sin efecto "Ya se acabó"';
end $$;

-- ----------------------------------------------------------------------------
-- 7. Familia y aislamiento.
-- ----------------------------------------------------------------------------

do $$
begin
  -- C agrega el pan compartido con su familia: D lo ve.
  perform pg_temp.add_as('user_c', 'pan_familia');
  assert pg_temp.names_for('user_d', 'inventory') = array['zz068 Pan de la familia'],
    'D debería ver lo que agregó C: ' || pg_temp.names_for('user_d', 'inventory')::text;
  -- D también puede ajustar lo que agregó C.
  perform pg_temp.adjust_as('user_d', 'pan_familia', 'two_to_four_weeks');
  assert pg_temp.expected_out_for('user_c', 'zz068 Pan de la familia') = now() + interval '21 days',
    'el ajuste de D debería valer para C';
  -- B no ve nada de A.
  assert pg_temp.names_for('user_b', 'inventory') = '{}'::text[],
    'B no debería ver el inventario de A';
end $$;

-- B no puede leer lo agregado por A.
select pg_temp.as_user('user_b');
set local role authenticated;
do $$
begin
  assert (select count(*) from public.inventory_manual_items) = 0,
    'B no debería leer lo agregado en otras listas';
end $$;
reset role;

select pg_temp.as_user('user_a');

rollback;
