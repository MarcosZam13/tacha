-- ============================================================================
-- Prueba de la migración 055 (SCRUM-89 / HU-58, tarea 22.3): editar la tienda
-- y el precio de referencia de un producto personalizado.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 051 a 055. Todo pasa dentro de una transacción que termina en
-- rollback (mismo patrón que 052_edit_delete_personal_products.test.sql):
-- nada de esto queda en la base compartida.
--
-- Datos:
--   E: usuario registrado sin household, dueño de un producto creado con
--      MaxiPali y precio 2850 (create_personal_product de 051).
--   "Lácteos": categoría real (020).
--
-- Casos:
--   1. Permisos: anon no ejecuta la firma nueva, authenticated sí; la firma
--      de 6 parámetros ya no existe.
--   2. Cambiar a otro supermercado y otro precio.
--   3. Cambiar a una tienda escrita (recortada): el supermercado se borra.
--   4. Sin tienda ni precio: se borran los tres datos.
--   5. Validaciones (22023 y nada cambia): precio 0, negativo, NaN o >= 10^10;
--      supermercado y tienda escrita a la vez; supermercado inexistente;
--      tienda de más de 80 caracteres.
--   6. Una tienda escrita en blanco se guarda como "sin tienda".
--   7. Editar la tienda y el precio no toca el resto: nombre, tamaño y marca
--      se guardan como siempre (052/053).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño).
-- ----------------------------------------------------------------------------
do $$
declare
  user_e uuid := gen_random_uuid();
  lacteos_id uuid;
begin
  select id into lacteos_id from categories where name = 'Lácteos';
  assert lacteos_id is not null, 'No se encontró la categoría "Lácteos" (¿se aplicó la migración 020?)';

  assert exists (select 1 from stores where slug = 'maxipali'), 'Falta el supermercado maxipali';
  assert exists (select 1 from stores where slug = 'walmart'), 'Falta el supermercado walmart';

  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values (user_e, 'authenticated', 'authenticated', user_e || '@prueba.tacha', '{"name": "Eva"}');

  perform set_config('tacha_test.user_e', user_e::text, true);
  perform set_config('tacha_test.lacteos_id', lacteos_id::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos de ejecución.
-- ----------------------------------------------------------------------------
do $$
declare
  new_signature constant text :=
    'public.update_personal_product(uuid, text, uuid, text, numeric, text, numeric, text, text)';
begin
  assert not has_function_privilege('anon', new_signature, 'execute'),
    'anon no debe ejecutar update_personal_product';
  assert has_function_privilege('authenticated', new_signature, 'execute'),
    'authenticated debe ejecutar update_personal_product';
  assert to_regprocedure('public.update_personal_product(uuid, text, uuid, text, numeric, text)') is null,
    'la firma de 6 parámetros debe haberse borrado (sin sobrecargas)';
end $$;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  perform set_config('tacha_test.product_id', public.create_personal_product(
    product_name => 'Queso Turrialba',
    category_id => current_setting('tacha_test.lacteos_id')::uuid,
    base_unit => 'g',
    base_quantity => 500,
    brand_name => 'Finca Eva',
    reference_price => 2850,
    reference_store_slug => 'maxipali'
  )::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 2. Otro supermercado y otro precio.
-- ----------------------------------------------------------------------------
do $$
declare
  reference record;
begin
  perform public.update_personal_product(
    target_product_id => current_setting('tacha_test.product_id')::uuid,
    new_product_name => 'Queso Turrialba',
    new_category_id => current_setting('tacha_test.lacteos_id')::uuid,
    new_base_unit => 'g',
    new_base_quantity => 500,
    new_brand_name => 'Finca Eva',
    new_reference_price => 3100.5,
    new_reference_store_slug => 'walmart'
  );

  select pcv.reference_price, pcv.reference_store_name, s.slug as store_slug, pcv.name as variant_name
  into reference
  from public.product_catalog_variants pcv
  left join public.stores s on s.id = pcv.reference_store_id
  where pcv.product_catalog_id = current_setting('tacha_test.product_id')::uuid;
  assert reference.reference_price = 3100.50, 'el precio debe cambiar: ' || reference.reference_price;
  assert reference.store_slug = 'walmart', 'el supermercado debe cambiar';
  assert reference.reference_store_name is null, 'sin tienda escrita';
end $$;

-- ----------------------------------------------------------------------------
-- 3. Tienda escrita: el supermercado se borra.
-- ----------------------------------------------------------------------------
do $$
declare
  reference record;
begin
  perform public.update_personal_product(
    target_product_id => current_setting('tacha_test.product_id')::uuid,
    new_product_name => 'Queso Turrialba',
    new_category_id => current_setting('tacha_test.lacteos_id')::uuid,
    new_base_unit => 'g',
    new_base_quantity => 500,
    new_brand_name => 'Finca Eva',
    new_reference_price => 2900,
    new_reference_store_name => '  Feria de Zapote  '
  );

  select pcv.reference_price, pcv.reference_store_name, s.slug as store_slug, pcv.name as variant_name
  into reference
  from public.product_catalog_variants pcv
  left join public.stores s on s.id = pcv.reference_store_id
  where pcv.product_catalog_id = current_setting('tacha_test.product_id')::uuid;
  assert reference.reference_store_name = 'Feria de Zapote', 'la tienda escrita se guarda recortada';
  assert reference.store_slug is null, 'el supermercado anterior debe borrarse';
  assert reference.reference_price = 2900, 'el precio debe cambiar';
end $$;

-- ----------------------------------------------------------------------------
-- 4. Sin tienda ni precio: se borran.
-- ----------------------------------------------------------------------------
do $$
declare
  reference record;
begin
  perform public.update_personal_product(
    current_setting('tacha_test.product_id')::uuid, 'Queso Turrialba',
    current_setting('tacha_test.lacteos_id')::uuid, 'g', 500, 'Finca Eva'
  );

  select pcv.reference_price, pcv.reference_store_name, s.slug as store_slug, pcv.name as variant_name
  into reference
  from public.product_catalog_variants pcv
  left join public.stores s on s.id = pcv.reference_store_id
  where pcv.product_catalog_id = current_setting('tacha_test.product_id')::uuid;
  assert reference.reference_price is null, 'sin precio, el precio debe borrarse';
  assert reference.reference_store_name is null and reference.store_slug is null, 'sin tienda, la tienda debe borrarse';
end $$;

-- Punto de partida para las validaciones: MaxiPali y 2850.
do $$
begin
  perform public.update_personal_product(
    target_product_id => current_setting('tacha_test.product_id')::uuid,
    new_product_name => 'Queso Turrialba',
    new_category_id => current_setting('tacha_test.lacteos_id')::uuid,
    new_base_unit => 'g',
    new_base_quantity => 500,
    new_brand_name => 'Finca Eva',
    new_reference_price => 2850,
    new_reference_store_slug => 'maxipali'
  );
end $$;

-- ----------------------------------------------------------------------------
-- 5. Validaciones: 22023 y nada cambia.
-- ----------------------------------------------------------------------------
do $$
declare
  target_id uuid := current_setting('tacha_test.product_id')::uuid;
  lacteos uuid := current_setting('tacha_test.lacteos_id')::uuid;
  invalid_price numeric;
  reference record;
begin
  foreach invalid_price in array array[0, -1, 'NaN'::numeric] loop
    begin
      perform public.update_personal_product(
        target_id, 'Queso Turrialba', lacteos, 'g', 500, null, invalid_price
      );
      assert false, 'precio ' || invalid_price || ' se pudo guardar';
    exception
      when invalid_parameter_value then
        assert sqlerrm = 'El precio de referencia tiene que ser mayor a 0', 'precio ' || invalid_price || ': ' || sqlerrm;
    end;
  end loop;

  begin
    perform public.update_personal_product(target_id, 'Queso Turrialba', lacteos, 'g', 500, null, 10000000000);
    assert false, 'precio de 10^10 se pudo guardar';
  exception
    when invalid_parameter_value then
      assert sqlerrm = 'El precio de referencia es demasiado alto', 'precio alto: ' || sqlerrm;
  end;

  begin
    perform public.update_personal_product(
      target_id, 'Queso Turrialba', lacteos, 'g', 500, null, null, 'maxipali', 'Feria'
    );
    assert false, 'supermercado y tienda escrita a la vez se pudieron guardar';
  exception
    when invalid_parameter_value then
      assert sqlerrm = 'Elegí un supermercado o escribí una tienda, no las dos', 'las dos tiendas: ' || sqlerrm;
  end;

  begin
    perform public.update_personal_product(
      target_id, 'Queso Turrialba', lacteos, 'g', 500, null, null, 'pricesmart'
    );
    assert false, 'un supermercado inexistente se pudo guardar';
  exception
    when invalid_parameter_value then
      assert sqlerrm = 'La tienda no es válida', 'supermercado inexistente: ' || sqlerrm;
  end;

  begin
    perform public.update_personal_product(
      target_id, 'Queso Turrialba', lacteos, 'g', 500, null, null, null, repeat('a', 81)
    );
    assert false, 'una tienda de 81 caracteres se pudo guardar';
  exception
    when invalid_parameter_value then
      assert sqlerrm = 'El nombre de la tienda es demasiado largo', 'tienda larga: ' || sqlerrm;
  end;

  select pcv.reference_price, pcv.reference_store_name, s.slug as store_slug, pcv.name as variant_name
  into reference
  from public.product_catalog_variants pcv
  left join public.stores s on s.id = pcv.reference_store_id
  where pcv.product_catalog_id = current_setting('tacha_test.product_id')::uuid;
  assert reference.reference_price = 2850 and reference.store_slug = 'maxipali',
    'un error de validación no debe cambiar nada';
end $$;

-- ----------------------------------------------------------------------------
-- 6. Tienda escrita en blanco = sin tienda (no es un error).
-- ----------------------------------------------------------------------------
do $$
declare
  reference record;
begin
  perform public.update_personal_product(
    current_setting('tacha_test.product_id')::uuid, 'Queso Turrialba',
    current_setting('tacha_test.lacteos_id')::uuid, 'g', 500, null, 2850, null, '   '
  );

  select pcv.reference_price, pcv.reference_store_name, s.slug as store_slug, pcv.name as variant_name
  into reference
  from public.product_catalog_variants pcv
  left join public.stores s on s.id = pcv.reference_store_id
  where pcv.product_catalog_id = current_setting('tacha_test.product_id')::uuid;
  assert reference.reference_store_name is null and reference.store_slug is null,
    'una tienda en blanco debe quedar como sin tienda';
end $$;

-- ----------------------------------------------------------------------------
-- 7. El resto se edita igual que en 052/053.
-- ----------------------------------------------------------------------------
do $$
declare
  reference record;
  brand_names text[];
begin
  perform public.update_personal_product(
    target_product_id => current_setting('tacha_test.product_id')::uuid,
    new_product_name => 'Queso Palmito',
    new_category_id => current_setting('tacha_test.lacteos_id')::uuid,
    new_base_unit => 'g',
    new_base_quantity => 1.234,
    new_brand_name => '  Finca Nueva  ',
    new_reference_price => 1500,
    new_reference_store_slug => 'walmart'
  );

  select pcv.reference_price, pcv.reference_store_name, s.slug as store_slug, pcv.name as variant_name
  into reference
  from public.product_catalog_variants pcv
  left join public.stores s on s.id = pcv.reference_store_id
  where pcv.product_catalog_id = current_setting('tacha_test.product_id')::uuid;
  assert reference.variant_name = 'Queso Palmito — 1.23 g', 'nombre de la variante: ' || reference.variant_name;
  assert reference.reference_price = 1500 and reference.store_slug = 'walmart', 'tienda y precio nuevos';

  select array_agg(pb.name) into brand_names
  from public.product_brands pb
  join public.product_catalog_variants pcv on pcv.id = pb.product_catalog_variant_id
  where pcv.product_catalog_id = current_setting('tacha_test.product_id')::uuid;
  assert brand_names = array['Finca Nueva'], 'la marca se reemplaza, recortada';
end $$;

rollback;
