-- ============================================================================
-- Prueba de la migración 051 (SCRUM-88 / HU-57): tienda y precio de
-- referencia de un producto personalizado.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 051. Todo pasa dentro de una transacción que termina en
-- rollback (mismo patrón que 031_create_personal_product.test.sql): nada de
-- esto queda en la base compartida.
--
-- Datos:
--   E: usuario registrado sin household, dueño de los productos de prueba.
--   A: otro usuario registrado, sin relación con E.
--   "Lácteos": categoría real, sembrada por 020.
--   "maxipali": supermercado real de `stores`.
--
-- Casos:
--   1. La llamada de antes (6 parámetros, sin tienda ni precio) sigue
--      funcionando y deja las tres columnas en null.
--   2. Precio <= 0: 22023, sin insertar fila.
--   3. Supermercado y tienda escrita a la vez: 22023, sin insertar fila.
--   4. Slug de supermercado inexistente: 22023, sin insertar fila.
--   5. Tienda escrita de más de 80 caracteres: 22023, sin insertar fila.
--   6. Tienda escrita solo con espacios: se guarda null (no es un error).
--   7. Supermercado + precio: se guardan en la variante y product_prices no
--      recibe ninguna fila (CA-03).
--   8. Tienda escrita + precio: se guarda recortada.
--   9. Solo precio, sin tienda / solo tienda, sin precio: los dos valen.
--  10. El precio de un producto personal no aparece en latest_prices ni en
--      search_catalog (CA-03).
--  11. A no puede leer la variante (ni su precio) de un producto de E sin
--      compartir (RLS de 032 sigue cubriendo las columnas nuevas).
--  12. Las checks de la tabla rechazan datos inválidos aunque no se pase por
--      la función (rol dueño).
--  13. anon no puede ejecutar la función nueva; authenticated sí.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño).
-- ----------------------------------------------------------------------------
do $$
declare
  user_a uuid := gen_random_uuid();
  user_e uuid := gen_random_uuid();
  lacteos_id uuid;
  maxipali_id uuid;
begin
  select id into lacteos_id from categories where name = 'Lácteos';
  assert lacteos_id is not null, 'No se encontró la categoría "Lácteos" (¿se aplicó la migración 020?)';

  select id into maxipali_id from stores where slug = 'maxipali';
  assert maxipali_id is not null, 'No se encontró el supermercado "maxipali"';

  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha', '{"name": "Ana"}'),
    (user_e, 'authenticated', 'authenticated', user_e || '@prueba.tacha', '{"name": "Eva"}');

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_e', user_e::text, true);
  perform set_config('tacha_test.lacteos_id', lacteos_id::text, true);
  perform set_config('tacha_test.maxipali_id', maxipali_id::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 13. Permisos de ejecución (se revisa antes de cambiar de rol).
-- ----------------------------------------------------------------------------
do $$
declare
  new_signature constant text :=
    'public.create_personal_product(text, uuid, text, numeric, text, boolean, numeric, text, text)';
begin
  assert not has_function_privilege('anon', new_signature, 'execute'),
    'anon no debe poder ejecutar create_personal_product';
  assert has_function_privilege('authenticated', new_signature, 'execute'),
    'authenticated debe poder ejecutar create_personal_product';
  assert not exists (
    select 1 from pg_proc p
    where p.proname = 'create_personal_product' and p.pronargs = 6
  ), 'la firma vieja de 6 parámetros tiene que haberse borrado (no dejar sobrecargas)';
end $$;

-- ----------------------------------------------------------------------------
-- 12. Checks de la tabla, sin pasar por la función (rol dueño).
-- ----------------------------------------------------------------------------
do $$
declare
  variant_id uuid;
begin
  select id into variant_id from public.product_catalog_variants limit 1;

  begin
    update public.product_catalog_variants set reference_price = 0 where id = variant_id;
    assert false, 'la tabla aceptó un precio de referencia 0';
  exception
    when check_violation then null;
  end;

  begin
    update public.product_catalog_variants
    set reference_store_id = current_setting('tacha_test.maxipali_id')::uuid,
        reference_store_name = 'Pulpería'
    where id = variant_id;
    assert false, 'la tabla aceptó supermercado y tienda escrita a la vez';
  exception
    when check_violation then null;
  end;

  begin
    update public.product_catalog_variants set reference_store_name = '   ' where id = variant_id;
    assert false, 'la tabla aceptó una tienda escrita vacía';
  exception
    when check_violation then null;
  end;
end $$;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text,
  true
);

-- ----------------------------------------------------------------------------
-- 1. Llamada de antes: 6 parámetros, sin tienda ni precio.
-- ----------------------------------------------------------------------------
do $$
declare
  new_id uuid;
  variant_row public.product_catalog_variants;
begin
  new_id := public.create_personal_product(
    'Queso de antes', current_setting('tacha_test.lacteos_id')::uuid, 'g', 250, null, false
  );

  select * into variant_row from public.product_catalog_variants where product_catalog_id = new_id;
  assert variant_row.reference_price is null, 'sin precio dado, reference_price debe quedar null';
  assert variant_row.reference_store_id is null, 'sin tienda dada, reference_store_id debe quedar null';
  assert variant_row.reference_store_name is null, 'sin tienda dada, reference_store_name debe quedar null';
end $$;

-- ----------------------------------------------------------------------------
-- 2-5. Datos inválidos: error 22023 y ninguna fila nueva.
-- ----------------------------------------------------------------------------
do $$
declare
  rows_before integer;
  rows_after integer;
begin
  select count(*) into rows_before from public.product_catalog;

  -- 2. Precio <= 0.
  begin
    perform public.create_personal_product(
      product_name => 'Producto válido',
      category_id => current_setting('tacha_test.lacteos_id')::uuid,
      base_unit => 'unidad',
      base_quantity => 1,
      reference_price => 0
    );
    assert false, 'precio 0 se pudo crear';
  exception
    when invalid_parameter_value then
      assert sqlerrm = 'El precio de referencia tiene que ser mayor a 0', 'precio 0: ' || sqlerrm;
  end;

  -- 3. Supermercado y tienda escrita a la vez.
  begin
    perform public.create_personal_product(
      product_name => 'Producto válido',
      category_id => current_setting('tacha_test.lacteos_id')::uuid,
      base_unit => 'unidad',
      base_quantity => 1,
      reference_store_slug => 'maxipali',
      reference_store_name => 'Pulpería La Esquina'
    );
    assert false, 'supermercado + tienda escrita se pudo crear';
  exception
    when invalid_parameter_value then
      assert sqlerrm = 'Elegí un supermercado o escribí una tienda, no las dos', 'las dos tiendas: ' || sqlerrm;
  end;

  -- 4. Supermercado inexistente.
  begin
    perform public.create_personal_product(
      product_name => 'Producto válido',
      category_id => current_setting('tacha_test.lacteos_id')::uuid,
      base_unit => 'unidad',
      base_quantity => 1,
      reference_store_slug => 'pricesmart'
    );
    assert false, 'supermercado inexistente se pudo crear';
  exception
    when invalid_parameter_value then
      assert sqlerrm = 'La tienda no es válida', 'supermercado inexistente: ' || sqlerrm;
  end;

  -- 5. Tienda escrita de más de 80 caracteres.
  begin
    perform public.create_personal_product(
      product_name => 'Producto válido',
      category_id => current_setting('tacha_test.lacteos_id')::uuid,
      base_unit => 'unidad',
      base_quantity => 1,
      reference_store_name => repeat('a', 81)
    );
    assert false, 'tienda de 81 caracteres se pudo crear';
  exception
    when invalid_parameter_value then
      assert sqlerrm = 'El nombre de la tienda es demasiado largo', 'tienda larga: ' || sqlerrm;
  end;

  select count(*) into rows_after from public.product_catalog;
  assert rows_after = rows_before, 'ningún dato inválido debió insertar filas';
end $$;

-- ----------------------------------------------------------------------------
-- 6. Tienda escrita solo con espacios: se guarda null.
-- ----------------------------------------------------------------------------
do $$
declare
  new_id uuid;
  variant_row public.product_catalog_variants;
begin
  new_id := public.create_personal_product(
    product_name => 'Natilla',
    category_id => current_setting('tacha_test.lacteos_id')::uuid,
    base_unit => 'ml',
    base_quantity => 250,
    reference_store_name => '    '
  );

  select * into variant_row from public.product_catalog_variants where product_catalog_id = new_id;
  assert variant_row.reference_store_name is null, 'una tienda solo con espacios debe guardarse null';
end $$;

-- ----------------------------------------------------------------------------
-- 7. Supermercado + precio: en la variante, nunca en product_prices (CA-03).
-- ----------------------------------------------------------------------------
do $$
declare
  new_id uuid;
  variant_row public.product_catalog_variants;
begin
  new_id := public.create_personal_product(
    product_name => 'Queso Turrialba',
    category_id => current_setting('tacha_test.lacteos_id')::uuid,
    base_unit => 'g',
    base_quantity => 500,
    reference_price => 2850.5,
    reference_store_slug => 'maxipali'
  );

  select * into variant_row from public.product_catalog_variants where product_catalog_id = new_id;
  assert variant_row.reference_price = 2850.50, 'el precio debe guardarse en la variante';
  assert variant_row.reference_store_id = current_setting('tacha_test.maxipali_id')::uuid,
    'el supermercado debe guardarse en la variante';
  assert variant_row.reference_store_name is null, 'con supermercado, la tienda escrita queda null';

  assert not exists (
    select 1 from public.product_prices pp where pp.product_catalog_variant_id = variant_row.id
  ), 'CA-03: el precio manual nunca debe entrar a product_prices';
end $$;

-- ----------------------------------------------------------------------------
-- 8. Tienda escrita + precio: se guarda recortada.
-- ----------------------------------------------------------------------------
do $$
declare
  new_id uuid;
  variant_row public.product_catalog_variants;
begin
  new_id := public.create_personal_product(
    product_name => 'Chorizo artesanal',
    category_id => current_setting('tacha_test.lacteos_id')::uuid,
    base_unit => 'g',
    base_quantity => 400,
    reference_price => 3200,
    reference_store_name => '  Carnicería Los Ángeles  '
  );

  select * into variant_row from public.product_catalog_variants where product_catalog_id = new_id;
  assert variant_row.reference_store_name = 'Carnicería Los Ángeles', 'la tienda debe guardarse recortada';
  assert variant_row.reference_store_id is null, 'con tienda escrita, el supermercado queda null';
  assert variant_row.reference_price = 3200, 'el precio debe guardarse';
end $$;

-- ----------------------------------------------------------------------------
-- 9. Solo precio / solo tienda.
-- ----------------------------------------------------------------------------
do $$
declare
  only_price_id uuid;
  only_store_id uuid;
  variant_row public.product_catalog_variants;
begin
  only_price_id := public.create_personal_product(
    product_name => 'Miel de abeja',
    category_id => current_setting('tacha_test.lacteos_id')::uuid,
    base_unit => 'ml',
    base_quantity => 500,
    reference_price => 4500
  );
  select * into variant_row from public.product_catalog_variants where product_catalog_id = only_price_id;
  assert variant_row.reference_price = 4500 and variant_row.reference_store_id is null
    and variant_row.reference_store_name is null, 'solo precio: sin tienda';

  only_store_id := public.create_personal_product(
    product_name => 'Tortillas',
    category_id => current_setting('tacha_test.lacteos_id')::uuid,
    base_unit => 'unidad',
    base_quantity => 10,
    reference_store_name => 'Feria del agricultor'
  );
  select * into variant_row from public.product_catalog_variants where product_catalog_id = only_store_id;
  assert variant_row.reference_price is null and variant_row.reference_store_name = 'Feria del agricultor',
    'solo tienda: sin precio';
end $$;

-- ----------------------------------------------------------------------------
-- 10. El precio manual no aparece en latest_prices ni en search_catalog.
-- ----------------------------------------------------------------------------
do $$
declare
  new_id uuid;
  new_variant_id uuid;
  found_count integer;
begin
  new_id := public.create_personal_product(
    product_name => 'Zzqreferencetest',
    category_id => current_setting('tacha_test.lacteos_id')::uuid,
    base_unit => 'g',
    base_quantity => 100,
    reference_price => 999,
    reference_store_slug => 'maxipali'
  );
  select id into new_variant_id from public.product_catalog_variants where product_catalog_id = new_id;

  select count(*) into found_count from public.latest_prices where product_catalog_variant_id = new_variant_id;
  assert found_count = 0, 'CA-03: latest_prices no debe tener filas del producto personal';

  select count(*) into found_count from public.search_catalog('zzqreferencetest', null);
  assert found_count = 0, 'CA-03: search_catalog no debe devolver el producto personal';
end $$;

-- ----------------------------------------------------------------------------
-- 11. A no ve la variante (ni su precio) de un producto de E sin compartir.
-- ----------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.product_catalog_variants pcv
  where pcv.reference_store_name = 'Carnicería Los Ángeles';

  assert visible_count = 0, 'A no debe ver el precio de referencia de un producto personal de E';
end $$;

rollback;
