-- ============================================================================
-- Prueba de la migración 052 (SCRUM-89 / HU-58): editar o eliminar un
-- producto personalizado.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 052. Todo pasa dentro de una transacción que termina en
-- rollback (mismo patrón que 031_create_personal_product.test.sql): nada de
-- esto queda en la base compartida.
--
-- Datos:
--   E: usuario registrado sin household, dueño de productos personales.
--   A: otro usuario registrado, sin relación con E.
--   Familia 1: F (admin) y M (miembro). F crea un producto compartido.
--   "Lácteos" y "Leche": categoría y producto global reales (020).
--
-- Casos:
--   1. Permisos de ejecución: anon no ejecuta ninguna; authenticated sí,
--      salvo can_manage_personal_product (interna).
--   2. Sin sesión: 42501 en las tres funciones.
--   3. E edita su producto: nombre, categoría, tamaño, nombre de la
--      variante y marca; sin marca nueva, la marca se borra.
--   4. Validaciones de editar: nombre vacío, categoría inexistente, unidad
--      inválida, cantidad <= 0 o NaN: 22023 sin cambiar nada.
--   5. A no puede editar, eliminar ni consultar el uso del producto de E.
--   6. Nadie puede editar ni eliminar un producto del catálogo global.
--   7. Producto compartido: M (que no lo creó) lo edita; A no.
--   8. Uso: cuenta listas activas y recetas, no listas completadas.
--   9. Eliminar un producto sin uso: 'deleted', la fila ya no existe.
--  10. Eliminar un producto en una lista: 'archived', archived_at con valor,
--      el ítem de la lista sigue intacto; después ya no se puede editar ni
--      eliminar otra vez.
--  11. Eliminar un producto que solo usa una receta: 'archived', el
--      ingrediente sigue intacto.
--  12. Eliminar un producto que solo usa una lista completada: 'archived'
--      (el historial de compras no se pierde).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño).
-- ----------------------------------------------------------------------------
do $$
declare
  user_a uuid := gen_random_uuid();
  user_e uuid := gen_random_uuid();
  user_f uuid := gen_random_uuid();
  user_m uuid := gen_random_uuid();
  household_1 uuid := gen_random_uuid();
  lacteos_id uuid;
  other_category_id uuid;
  global_leche_id uuid;
begin
  select id into lacteos_id from categories where name = 'Lácteos';
  assert lacteos_id is not null, 'No se encontró la categoría "Lácteos" (¿se aplicó la migración 020?)';

  select id into other_category_id from categories where id <> lacteos_id order by name limit 1;
  assert other_category_id is not null, 'Se necesita una segunda categoría';

  select id into global_leche_id
  from product_catalog
  where name = 'Leche' and household_id is null and owner_id is null;
  assert global_leche_id is not null, 'No se encontró el producto global "Leche"';

  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha', '{"name": "Ana"}'),
    (user_e, 'authenticated', 'authenticated', user_e || '@prueba.tacha', '{"name": "Eva"}'),
    (user_f, 'authenticated', 'authenticated', user_f || '@prueba.tacha', '{"name": "Fer"}'),
    (user_m, 'authenticated', 'authenticated', user_m || '@prueba.tacha', '{"name": "Mario"}');

  insert into public.households (id, name) values (household_1, 'Familia 1 SCRUM-89');
  insert into public.household_members (user_id, household_id, role)
  values (user_f, household_1, 'admin'), (user_m, household_1, 'member');

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_e', user_e::text, true);
  perform set_config('tacha_test.user_f', user_f::text, true);
  perform set_config('tacha_test.user_m', user_m::text, true);
  perform set_config('tacha_test.lacteos_id', lacteos_id::text, true);
  perform set_config('tacha_test.other_category_id', other_category_id::text, true);
  perform set_config('tacha_test.global_leche_id', global_leche_id::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Permisos de ejecución.
-- ----------------------------------------------------------------------------
do $$
begin
  assert not has_function_privilege('anon', 'public.get_personal_product_usage(uuid)', 'execute'),
    'anon no debe ejecutar get_personal_product_usage';
  assert not has_function_privilege('anon', 'public.update_personal_product(uuid, text, uuid, text, numeric, text)', 'execute'),
    'anon no debe ejecutar update_personal_product';
  assert not has_function_privilege('anon', 'public.delete_personal_product(uuid)', 'execute'),
    'anon no debe ejecutar delete_personal_product';
  assert has_function_privilege('authenticated', 'public.update_personal_product(uuid, text, uuid, text, numeric, text)', 'execute'),
    'authenticated debe ejecutar update_personal_product';
  assert has_function_privilege('authenticated', 'public.delete_personal_product(uuid)', 'execute'),
    'authenticated debe ejecutar delete_personal_product';
  assert has_function_privilege('authenticated', 'public.get_personal_product_usage(uuid)', 'execute'),
    'authenticated debe ejecutar get_personal_product_usage';
  assert not has_function_privilege('authenticated', 'public.can_manage_personal_product(uuid)', 'execute'),
    'can_manage_personal_product es interna: authenticated no la ejecuta';
end $$;

set local role authenticated;

-- ----------------------------------------------------------------------------
-- E crea sus productos de prueba (función de 031/032).
-- ----------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  perform set_config('tacha_test.edit_id', public.create_personal_product(
    'Queso casero', current_setting('tacha_test.lacteos_id')::uuid, 'g', 250, 'Finca Eva', false
  )::text, true);
  perform set_config('tacha_test.unused_id', public.create_personal_product(
    'Natilla', current_setting('tacha_test.lacteos_id')::uuid, 'ml', 250, null, false
  )::text, true);
  perform set_config('tacha_test.in_list_id', public.create_personal_product(
    'Tortillas', current_setting('tacha_test.lacteos_id')::uuid, 'unidad', 10, null, false
  )::text, true);
  perform set_config('tacha_test.in_recipe_id', public.create_personal_product(
    'Chile dulce', current_setting('tacha_test.lacteos_id')::uuid, 'unidad', 2, null, false
  )::text, true);
  perform set_config('tacha_test.in_closed_list_id', public.create_personal_product(
    'Pan casero', current_setting('tacha_test.lacteos_id')::uuid, 'unidad', 1, null, false
  )::text, true);
end $$;

-- Listas y recetas que usan esos productos (rol dueño: datos de prueba directos).
reset role;

do $$
declare
  active_list_id uuid := gen_random_uuid();
  closed_list_id uuid := gen_random_uuid();
  recipe_id uuid := gen_random_uuid();
  user_e uuid := current_setting('tacha_test.user_e')::uuid;
begin
  insert into public.lists (id, owner_id, household_id, type, status)
  values
    (active_list_id, user_e, null, 'private', 'active'),
    (closed_list_id, user_e, null, 'private', 'completed');

  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested)
  select active_list_id, pcv.id, 1
  from public.product_catalog_variants pcv
  where pcv.product_catalog_id = current_setting('tacha_test.in_list_id')::uuid;

  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested)
  select closed_list_id, pcv.id, 1
  from public.product_catalog_variants pcv
  where pcv.product_catalog_id = current_setting('tacha_test.in_closed_list_id')::uuid;

  insert into public.recipes (id, owner_id, name, base_servings)
  values (recipe_id, user_e, 'Picadillo SCRUM-89', 4);

  insert into public.recipe_ingredients (recipe_id, product_catalog_id, quantity_value, quantity_unit, position)
  values
    (recipe_id, current_setting('tacha_test.in_recipe_id')::uuid, 2, 'unidad', 0),
    (recipe_id, current_setting('tacha_test.in_list_id')::uuid, 5, 'unidad', 1);
end $$;

set local role authenticated;

-- ----------------------------------------------------------------------------
-- 2. Sin sesión.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{}', true);

do $$
begin
  begin
    perform public.update_personal_product(
      current_setting('tacha_test.edit_id')::uuid, 'X', current_setting('tacha_test.lacteos_id')::uuid, 'g', 1
    );
    assert false, 'sin sesión se pudo editar';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.delete_personal_product(current_setting('tacha_test.edit_id')::uuid);
    assert false, 'sin sesión se pudo eliminar';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.get_personal_product_usage(current_setting('tacha_test.edit_id')::uuid);
    assert false, 'sin sesión se pudo consultar el uso';
  exception
    when insufficient_privilege then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- Desde acá, sesión de E.
-- ----------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text,
  true
);

-- ----------------------------------------------------------------------------
-- 3. E edita su producto.
-- ----------------------------------------------------------------------------
do $$
declare
  product_row public.product_catalog;
  variant_row public.product_catalog_variants;
  brand_names text[];
begin
  perform public.update_personal_product(
    current_setting('tacha_test.edit_id')::uuid,
    '  Queso Turrialba  ',
    current_setting('tacha_test.other_category_id')::uuid,
    'g',
    500,
    '  Finca Nueva  '
  );

  select * into product_row from public.product_catalog where id = current_setting('tacha_test.edit_id')::uuid;
  assert product_row.name = 'Queso Turrialba', 'el nombre debe quedar recortado';
  assert product_row.category_id = current_setting('tacha_test.other_category_id')::uuid, 'la categoría debe cambiar';
  assert product_row.owner_id = current_setting('tacha_test.user_e')::uuid, 'editar no cambia el dueño';
  assert product_row.household_id is null, 'editar no comparte el producto';

  select * into variant_row from public.product_catalog_variants where product_catalog_id = product_row.id;
  assert variant_row.base_quantity = 500 and variant_row.base_unit = 'g', 'el tamaño debe cambiar';
  assert variant_row.name = 'Queso Turrialba — 500 g', 'el nombre de la variante se recalcula: ' || variant_row.name;

  select array_agg(name) into brand_names from public.product_brands where product_catalog_variant_id = variant_row.id;
  assert brand_names = array['Finca Nueva'], 'la marca se reemplaza, recortada';

  -- Sin marca nueva, la marca se borra.
  perform public.update_personal_product(
    product_row.id, 'Queso Turrialba', current_setting('tacha_test.other_category_id')::uuid, 'g', 500, null
  );
  assert not exists (
    select 1 from public.product_brands where product_catalog_variant_id = variant_row.id
  ), 'sin marca nueva, la marca anterior debe borrarse';
end $$;

-- ----------------------------------------------------------------------------
-- 4. Validaciones de editar: 22023 y nada cambia.
-- ----------------------------------------------------------------------------
do $$
declare
  target_id uuid := current_setting('tacha_test.edit_id')::uuid;
  lacteos uuid := current_setting('tacha_test.lacteos_id')::uuid;
begin
  begin
    perform public.update_personal_product(target_id, '   ', lacteos, 'g', 1);
    assert false, 'nombre vacío se pudo guardar';
  exception
    when invalid_parameter_value then
      assert sqlerrm = 'El nombre del producto es obligatorio', 'nombre vacío: ' || sqlerrm;
  end;

  begin
    perform public.update_personal_product(target_id, 'Queso', gen_random_uuid(), 'g', 1);
    assert false, 'categoría inexistente se pudo guardar';
  exception
    when invalid_parameter_value then
      assert sqlerrm = 'La categoría no es válida', 'categoría: ' || sqlerrm;
  end;

  begin
    perform public.update_personal_product(target_id, 'Queso', lacteos, 'litros', 1);
    assert false, 'unidad inválida se pudo guardar';
  exception
    when invalid_parameter_value then
      assert sqlerrm = 'La unidad de tamaño no es válida', 'unidad: ' || sqlerrm;
  end;

  begin
    perform public.update_personal_product(target_id, 'Queso', lacteos, 'g', 0);
    assert false, 'cantidad 0 se pudo guardar';
  exception
    when invalid_parameter_value then
      assert sqlerrm = 'La cantidad de tamaño tiene que ser mayor a 0', 'cantidad 0: ' || sqlerrm;
  end;

  begin
    perform public.update_personal_product(target_id, 'Queso', lacteos, 'g', 'NaN'::numeric);
    assert false, 'cantidad NaN se pudo guardar';
  exception
    when invalid_parameter_value then
      assert sqlerrm = 'La cantidad de tamaño tiene que ser mayor a 0', 'cantidad NaN: ' || sqlerrm;
  end;

  assert (select name from public.product_catalog where id = target_id) = 'Queso Turrialba',
    'una edición inválida no debe cambiar nada';
end $$;

-- ----------------------------------------------------------------------------
-- 5. A no puede tocar el producto de E.
-- ----------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  target_id uuid := current_setting('tacha_test.edit_id')::uuid;
begin
  begin
    perform public.update_personal_product(target_id, 'Robado', current_setting('tacha_test.lacteos_id')::uuid, 'g', 1);
    assert false, 'A pudo editar un producto de E';
  exception
    when insufficient_privilege then
      assert sqlerrm = 'No encontramos ese producto', 'A editar: ' || sqlerrm;
  end;

  begin
    perform public.delete_personal_product(target_id);
    assert false, 'A pudo eliminar un producto de E';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.get_personal_product_usage(target_id);
    assert false, 'A pudo consultar el uso de un producto de E';
  exception
    when insufficient_privilege then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 6. Nadie edita ni elimina un producto del catálogo global.
-- ----------------------------------------------------------------------------
do $$
declare
  global_id uuid := current_setting('tacha_test.global_leche_id')::uuid;
begin
  begin
    perform public.update_personal_product(global_id, 'Leche hackeada', current_setting('tacha_test.lacteos_id')::uuid, 'ml', 1);
    assert false, 'se pudo editar un producto global';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.delete_personal_product(global_id);
    assert false, 'se pudo eliminar un producto global';
  exception
    when insufficient_privilege then null;
  end;

  assert (select name from public.product_catalog where id = global_id) = 'Leche',
    'el producto global no debe cambiar';
end $$;

-- ----------------------------------------------------------------------------
-- 7. Producto compartido: M lo edita aunque lo creó F; A no.
-- ----------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_f'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  perform set_config('tacha_test.shared_id', public.create_personal_product(
    'Salsa casera', current_setting('tacha_test.lacteos_id')::uuid, 'ml', 500, null, true
  )::text, true);
end $$;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_m'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  perform public.update_personal_product(
    current_setting('tacha_test.shared_id')::uuid, 'Salsa de la familia',
    current_setting('tacha_test.lacteos_id')::uuid, 'ml', 750
  );
  assert (select name from public.product_catalog where id = current_setting('tacha_test.shared_id')::uuid)
    = 'Salsa de la familia', 'M, de la familia, debe poder editar el producto compartido';
end $$;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  begin
    perform public.update_personal_product(
      current_setting('tacha_test.shared_id')::uuid, 'Robada', current_setting('tacha_test.lacteos_id')::uuid, 'ml', 1
    );
    assert false, 'A, de afuera, pudo editar el producto compartido';
  exception
    when insufficient_privilege then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- Desde acá, otra vez sesión de E.
-- ----------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text,
  true
);

-- ----------------------------------------------------------------------------
-- 8. Uso: listas activas y recetas, no listas completadas.
-- ----------------------------------------------------------------------------
do $$
declare
  usage_row record;
begin
  select * into usage_row from public.get_personal_product_usage(current_setting('tacha_test.in_list_id')::uuid);
  assert usage_row.active_list_count = 1 and usage_row.recipe_count = 1,
    'Tortillas: 1 lista activa y 1 receta, salió ' || usage_row.active_list_count || '/' || usage_row.recipe_count;

  select * into usage_row from public.get_personal_product_usage(current_setting('tacha_test.in_closed_list_id')::uuid);
  assert usage_row.active_list_count = 0 and usage_row.recipe_count = 0,
    'Pan casero: solo está en una lista completada, no cuenta como activa';

  select * into usage_row from public.get_personal_product_usage(current_setting('tacha_test.unused_id')::uuid);
  assert usage_row.active_list_count = 0 and usage_row.recipe_count = 0, 'Natilla: sin uso';
end $$;

-- ----------------------------------------------------------------------------
-- 9. Eliminar sin uso: se borra.
-- ----------------------------------------------------------------------------
do $$
declare
  result text;
begin
  result := public.delete_personal_product(current_setting('tacha_test.unused_id')::uuid);
  assert result = 'deleted', 'sin uso debe borrarse, salió ' || result;
  assert not exists (
    select 1 from public.product_catalog where id = current_setting('tacha_test.unused_id')::uuid
  ), 'la fila debe haberse borrado';
end $$;

-- ----------------------------------------------------------------------------
-- 10. Eliminar en uso (lista + receta): se archiva y todo sigue intacto.
-- ----------------------------------------------------------------------------
do $$
declare
  result text;
  target_id uuid := current_setting('tacha_test.in_list_id')::uuid;
begin
  result := public.delete_personal_product(target_id);
  assert result = 'archived', 'en uso debe archivarse, salió ' || result;
  assert (select archived_at from public.product_catalog where id = target_id) is not null,
    'archived_at debe tener valor';
  assert exists (
    select 1 from public.list_items li
    join public.product_catalog_variants pcv on pcv.id = li.product_catalog_variant_id
    where pcv.product_catalog_id = target_id
  ), 'el ítem de la lista debe seguir';
  assert exists (
    select 1 from public.recipe_ingredients where product_catalog_id = target_id
  ), 'el ingrediente de la receta debe seguir';

  -- Archivado ya no se puede editar ni eliminar otra vez.
  begin
    perform public.update_personal_product(target_id, 'Otra', current_setting('tacha_test.lacteos_id')::uuid, 'unidad', 1);
    assert false, 'se pudo editar un producto archivado';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.delete_personal_product(target_id);
    assert false, 'se pudo eliminar dos veces un producto archivado';
  exception
    when insufficient_privilege then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 11. Solo en una receta: se archiva.
-- ----------------------------------------------------------------------------
do $$
begin
  assert public.delete_personal_product(current_setting('tacha_test.in_recipe_id')::uuid) = 'archived',
    'un producto que usa una receta debe archivarse';
  assert exists (
    select 1 from public.recipe_ingredients
    where product_catalog_id = current_setting('tacha_test.in_recipe_id')::uuid
  ), 'el ingrediente debe seguir';
end $$;

-- ----------------------------------------------------------------------------
-- 12. Solo en una lista completada: se archiva (no se pierde el historial).
-- ----------------------------------------------------------------------------
do $$
begin
  assert public.delete_personal_product(current_setting('tacha_test.in_closed_list_id')::uuid) = 'archived',
    'un producto de una lista completada debe archivarse';
end $$;

rollback;
