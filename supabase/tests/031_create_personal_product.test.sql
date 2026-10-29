-- ============================================================================
-- Prueba de la migración 031 (SCRUM-87): create_personal_product.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 031. Todo pasa dentro de una transacción que termina en
-- rollback (mismo patrón que supabase/tests/024_household_lists.test.sql) —
-- nada de esto queda en la base compartida.
--
-- Datos:
--   familia 1: A (admin), único miembro.
--   E: usuario registrado sin household.
--   "Lácteos": categoría real, sembrada por 020.
--
-- Casos:
--   1. Sin sesión / sesión anónima: 42501, nunca llega a insertar.
--   2. Nombre vacío o solo espacios: 22023, sin insertar fila.
--   3. category_id inexistente: 22023, sin insertar fila.
--   4. base_unit inválido: 22023, sin insertar fila.
--   5. base_quantity <= 0: 22023, sin insertar fila.
--   6. E (sin household) crea sin marca: owner_id propio, household_id null,
--      variante y marca correctas.
--   7. A (con household) crea SIN marcar compartir: household_id null aunque
--      tenga household (CA-03, "personal por defecto").
--   8. A (con household) crea marcando compartir: household_id = su familia.
--   9. Con marca: product_brands recibe la fila esperada.
--  10. Un producto personal puede reusar el nombre de un producto del
--      catálogo global curado ("Leche") sin chocar con
--      idx_product_catalog_global_name (fix del punto 2 de la migración).
--  11. Dos dueños distintos (A y E) pueden tener cada uno un producto
--      personal con el mismo nombre, sin chocar entre sí.
--  12. search_catalog no devuelve un producto personal (fix del punto 2 de
--      la migración — sin esto, "Buscar" mezclaría productos personales de
--      cualquier usuario con el catálogo global).
--  13. list_catalog_by_category tampoco lo devuelve (mismo fix).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño).
-- ----------------------------------------------------------------------------
do $$
declare
  user_a uuid := gen_random_uuid();
  user_e uuid := gen_random_uuid();
  household_1 uuid := gen_random_uuid();
  lacteos_id uuid;
begin
  select id into lacteos_id from categories where name = 'Lácteos';
  assert lacteos_id is not null, 'No se encontró la categoría "Lácteos" (¿se aplicó la migración 020?)';

  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha', '{"name": "Ana"}'),
    (user_e, 'authenticated', 'authenticated', user_e || '@prueba.tacha', '{"name": "Eva"}');

  insert into public.households (id, name) values (household_1, 'Familia 1 SCRUM-87');
  insert into public.household_members (user_id, household_id, role)
  values (user_a, household_1, 'admin');

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_e', user_e::text, true);
  perform set_config('tacha_test.household_1', household_1::text, true);
  perform set_config('tacha_test.lacteos_id', lacteos_id::text, true);
end $$;

set local role authenticated;

-- ----------------------------------------------------------------------------
-- 1. Sin sesión / sesión anónima.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{}', true);

do $$
begin
  begin
    perform public.create_personal_product(
      'Producto sin sesión', current_setting('tacha_test.lacteos_id')::uuid, 'unidad', 1, null, false
    );
    assert false, 'sin sesión se pudo crear un producto';
  exception
    when insufficient_privilege then
      assert sqlerrm like 'Se requiere una sesión%', 'sin sesión: el 42501 tiene que ser por falta de sesión';
  end;
end $$;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('tacha_test.user_e'), 'role', 'authenticated', 'is_anonymous', true
  )::text,
  true
);

do $$
begin
  -- auth.uid() depende de auth.jwt(), no de is_anonymous: una sesión anónima
  -- sí tiene auth.uid(), así que esta función (a diferencia de
  -- decide_personal_lists) no la distingue de una registrada — no hay CA que
  -- lo exija para crear un producto personal. Este caso documenta eso: no
  -- falla por anónima, falla por los mismos motivos que cualquier sesión.
  perform public.create_personal_product(
    '', current_setting('tacha_test.lacteos_id')::uuid, 'unidad', 1, null, false
  );
  assert false, 'nombre vacío debió fallar antes de llegar acá';
exception
  when insufficient_privilege then
    raise exception 'una sesión anónima no debió fallar por falta de sesión, sino por nombre vacío';
  when others then
    assert sqlerrm = 'El nombre del producto es obligatorio', 'anónima + nombre vacío: ' || sqlerrm;
end $$;

-- ----------------------------------------------------------------------------
-- Desde acá, siempre con sesión real de E (sin household).
-- ----------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text,
  true
);

-- ----------------------------------------------------------------------------
-- 2. Nombre vacío o solo espacios.
-- ----------------------------------------------------------------------------
do $$
declare
  rows_before integer;
  rows_after integer;
begin
  select count(*) into rows_before from public.product_catalog;

  begin
    perform public.create_personal_product(
      '   ', current_setting('tacha_test.lacteos_id')::uuid, 'unidad', 1, null, false
    );
    assert false, 'nombre solo espacios se pudo crear';
  exception
    when others then
      assert sqlerrm = 'El nombre del producto es obligatorio', 'nombre solo espacios: ' || sqlerrm;
  end;

  select count(*) into rows_after from public.product_catalog;
  assert rows_after = rows_before, 'nombre inválido no debió insertar ninguna fila';
end $$;

-- ----------------------------------------------------------------------------
-- 3. category_id inexistente.
-- ----------------------------------------------------------------------------
do $$
declare
  rows_before integer;
  rows_after integer;
begin
  select count(*) into rows_before from public.product_catalog;

  begin
    perform public.create_personal_product('Producto válido', gen_random_uuid(), 'unidad', 1, null, false);
    assert false, 'categoría inexistente se pudo crear';
  exception
    when others then
      assert sqlerrm = 'La categoría no es válida', 'categoría inexistente: ' || sqlerrm;
  end;

  select count(*) into rows_after from public.product_catalog;
  assert rows_after = rows_before, 'categoría inválida no debió insertar ninguna fila';
end $$;

-- ----------------------------------------------------------------------------
-- 4. base_unit inválido.
-- ----------------------------------------------------------------------------
do $$
begin
  begin
    perform public.create_personal_product(
      'Producto válido', current_setting('tacha_test.lacteos_id')::uuid, 'litros', 1, null, false
    );
    assert false, 'unidad inválida se pudo crear';
  exception
    when others then
      assert sqlerrm = 'La unidad de tamaño no es válida', 'unidad inválida: ' || sqlerrm;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 5. base_quantity <= 0.
-- ----------------------------------------------------------------------------
do $$
begin
  begin
    perform public.create_personal_product(
      'Producto válido', current_setting('tacha_test.lacteos_id')::uuid, 'unidad', 0, null, false
    );
    assert false, 'cantidad 0 se pudo crear';
  exception
    when others then
      assert sqlerrm = 'La cantidad de tamaño tiene que ser mayor a 0', 'cantidad 0: ' || sqlerrm;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 6. E (sin household) crea sin marca: personal, sin household_id.
-- ----------------------------------------------------------------------------
do $$
declare
  new_id uuid;
  product_row public.product_catalog;
  variant_row public.product_catalog_variants;
  brand_count integer;
begin
  new_id := public.create_personal_product(
    'Queso casero', current_setting('tacha_test.lacteos_id')::uuid, 'g', 250, null, false
  );

  select * into product_row from public.product_catalog where id = new_id;
  assert product_row.owner_id = current_setting('tacha_test.user_e')::uuid, 'owner_id debe ser E';
  assert product_row.household_id is null, 'sin household: household_id debe quedar null';
  assert product_row.source = 'manual', 'source debe ser manual';
  assert product_row.name = 'Queso casero', 'name debe ser el dado, recortado';

  select * into variant_row from public.product_catalog_variants where product_catalog_id = new_id;
  assert variant_row.base_unit = 'g' and variant_row.base_quantity = 250, 'variante con el tamaño dado';

  select count(*) into brand_count from public.product_brands where product_catalog_variant_id = variant_row.id;
  assert brand_count = 0, 'sin marca dada, no debe crear fila en product_brands';
end $$;

-- ----------------------------------------------------------------------------
-- Desde acá, sesión real de A (con household), para los casos 7-9.
-- ----------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

-- ----------------------------------------------------------------------------
-- 7. A crea SIN marcar compartir: personal por defecto aunque tenga household.
-- ----------------------------------------------------------------------------
do $$
declare
  new_id uuid;
  product_row public.product_catalog;
begin
  new_id := public.create_personal_product(
    'Pan artesanal', current_setting('tacha_test.lacteos_id')::uuid, 'unidad', 2, null, false
  );

  select * into product_row from public.product_catalog where id = new_id;
  assert product_row.owner_id = current_setting('tacha_test.user_a')::uuid, 'owner_id debe ser A';
  assert product_row.household_id is null,
    'A tiene household pero no marcó compartir: household_id debe quedar null (CA-03)';
end $$;

-- ----------------------------------------------------------------------------
-- 8. A crea marcando compartir: household_id = su familia.
-- ----------------------------------------------------------------------------
do $$
declare
  new_id uuid;
  product_row public.product_catalog;
begin
  new_id := public.create_personal_product(
    'Salsa casera', current_setting('tacha_test.lacteos_id')::uuid, 'ml', 500, null, true
  );

  select * into product_row from public.product_catalog where id = new_id;
  assert product_row.owner_id = current_setting('tacha_test.user_a')::uuid, 'owner_id debe ser A';
  assert product_row.household_id = current_setting('tacha_test.household_1')::uuid,
    'A marcó compartir: household_id debe ser el de su familia';
end $$;

-- ----------------------------------------------------------------------------
-- 9. Con marca: product_brands recibe la fila esperada.
-- ----------------------------------------------------------------------------
do $$
declare
  new_id uuid;
  variant_row public.product_catalog_variants;
  brand_row public.product_brands;
begin
  new_id := public.create_personal_product(
    'Yogur casero', current_setting('tacha_test.lacteos_id')::uuid, 'ml', 1000, '  Finca de Ana  ', false
  );

  select * into variant_row from public.product_catalog_variants where product_catalog_id = new_id;
  select * into brand_row from public.product_brands where product_catalog_variant_id = variant_row.id;

  assert brand_row.name = 'Finca de Ana', 'la marca debe guardarse recortada, sin espacios de sobra';
end $$;

-- ----------------------------------------------------------------------------
-- 10. Reusa el nombre de un producto del catálogo global curado ("Leche"):
--     no debe chocar con idx_product_catalog_global_name.
-- ----------------------------------------------------------------------------
do $$
declare
  new_id uuid;
begin
  assert exists (
    select 1 from public.product_catalog pc
    where pc.name = 'Leche' and pc.household_id is null and pc.owner_id is null
  ), 'debe existir el producto global "Leche" (¿se aplicó la migración 020?)';

  new_id := public.create_personal_product(
    'Leche', current_setting('tacha_test.lacteos_id')::uuid, 'ml', 900, null, false
  );

  assert new_id is not null,
    'un producto personal debe poder llamarse igual que uno del catálogo global (owner_id los distingue)';
end $$;

-- ----------------------------------------------------------------------------
-- 11. Dos dueños distintos, mismo nombre de producto personal: no chocan.
-- ----------------------------------------------------------------------------
do $$
declare
  product_a uuid;
begin
  -- Todavía con la sesión de A (set_config de los casos 7-10).
  product_a := public.create_personal_product(
    'Tamal navideño', current_setting('tacha_test.lacteos_id')::uuid, 'unidad', 1, null, false
  );
  assert product_a is not null, 'A debe poder crear su "Tamal navideño"';
end $$;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  product_e uuid;
begin
  product_e := public.create_personal_product(
    'Tamal navideño', current_setting('tacha_test.lacteos_id')::uuid, 'unidad', 1, null, false
  );
  assert product_e is not null,
    'E debe poder crear su propio "Tamal navideño" (mismo nombre que el de A, dueño distinto)';
end $$;

-- ----------------------------------------------------------------------------
-- 12. search_catalog no debe devolver un producto personal.
-- ----------------------------------------------------------------------------
do $$
declare
  new_id uuid;
  found_count integer;
begin
  -- Sesión de E (vigente desde el caso 11).
  new_id := public.create_personal_product(
    'Zzqpersonaltest especial', current_setting('tacha_test.lacteos_id')::uuid, 'g', 100, null, false
  );

  select count(*) into found_count
  from public.search_catalog('zzqpersonaltest', null)
  where product_catalog_id = new_id;

  assert found_count = 0,
    'search_catalog no debe devolver un producto personal (CA-03 + fix del punto 2 de la migración 031)';
end $$;

-- ----------------------------------------------------------------------------
-- 13. list_catalog_by_category tampoco debe devolverlo.
-- ----------------------------------------------------------------------------
do $$
declare
  new_id uuid;
  found_count integer;
begin
  new_id := public.create_personal_product(
    'Zzqpersonaltest categoria', current_setting('tacha_test.lacteos_id')::uuid, 'g', 100, null, false
  );

  select count(*) into found_count
  from public.list_catalog_by_category(current_setting('tacha_test.lacteos_id')::uuid, null)
  where product_catalog_id = new_id;

  assert found_count = 0,
    'list_catalog_by_category no debe devolver un producto personal (mismo fix del punto 2)';
end $$;

rollback;
