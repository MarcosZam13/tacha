-- ============================================================================
-- Prueba de la migración 015 (SCRUM-66): tachar y recetas sobre lo tachado.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 015. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios, listas ni recetas en la base compartida.
-- Si una regla no se cumple, un `assert` corta con su mensaje; si termina sin
-- error, pasó. Contra la base sin 015 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes: el paso 2 apaga el trigger de 015, y
-- sin el begin/rollback quedaría apagado en la base compartida. Mientras corre
-- bloquea las escrituras en list_items (milisegundos): mejor fuera de horas de uso.
--
-- Caso principal: un producto comprado ayer (3 unidades) y una receta que
-- pide 2 unidades de ese producto. Antes de 015 la receta veía las 3 unidades
-- compradas como "ya en la lista" y no pedía nada; con 015 lo comprado no
-- cuenta, la fila vuelve a Pendientes con 1 unidad y falta 1 unidad.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño): un usuario de prueba y un producto con una sola
--    presentación usable en ml o g, así pick_recipe_variant no tiene otra que
--    elegir y la cuenta es exacta. Los ids viajan entre pasos en variables de
--    la transacción (set_config(..., true)).
-- ----------------------------------------------------------------------------

do $$
declare
  test_user_id uuid := gen_random_uuid();
  test_variant record;
begin
  select v.id, v.product_catalog_id, v.base_quantity, v.base_unit into test_variant
  from public.product_catalog_variants v
  where v.base_unit in ('ml', 'g')
    and v.base_quantity > 0
    and not exists (
      select 1 from public.product_catalog_variants other
      where other.product_catalog_id = v.product_catalog_id
        and other.id <> v.id
        and other.base_quantity > 0
    )
  limit 1;

  assert test_variant.id is not null, 'el catálogo no tiene un producto con una sola presentación usable';

  insert into auth.users (id, aud, role, email)
  values (test_user_id, 'authenticated', 'authenticated', test_user_id || '@prueba.tacha');

  perform set_config('tacha_test.user_id', test_user_id::text, true);
  perform set_config('tacha_test.variant_id', test_variant.id::text, true);
  perform set_config('tacha_test.product_id', test_variant.product_catalog_id::text, true);
  perform set_config('tacha_test.base_quantity', test_variant.base_quantity::text, true);
  perform set_config('tacha_test.base_unit', test_variant.base_unit, true);
  -- Lo que lee auth.uid() cuando la petición llega por la API.
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', test_user_id, 'role', 'authenticated')::text,
    true
  );
end $$;

-- ----------------------------------------------------------------------------
-- 1. Como el usuario: añade el producto, sube a 3 y lo tacha. El cliente no
--    puede elegir la fecha ni el autor.
-- ----------------------------------------------------------------------------

set local role authenticated;

do $$
declare
  test_item public.list_items;
begin
  test_item := public.add_item_to_general_list(current_setting('tacha_test.variant_id')::uuid);
  perform public.change_item_quantity(test_item.id, 1);
  perform public.change_item_quantity(test_item.id, 1);

  -- PATCH directo con una fecha inventada: el trigger pone la hora real.
  update public.list_items
  set checked_at = '2000-01-01'
  where id = test_item.id
  returning * into test_item;

  assert test_item.checked_at = now(), 'el trigger ignora la fecha que manda el cliente';
  assert test_item.checked_by = auth.uid(), 'el trigger pone quién tachó';
  assert test_item.quantity_requested = 3, 'tachar no cambia la cantidad';

  -- checked_by no tiene grant de update.
  begin
    update public.list_items set checked_by = gen_random_uuid() where id = test_item.id;
    assert false, 'checked_by no se puede escribir directo';
  exception
    when insufficient_privilege then null;
  end;

  perform set_config('tacha_test.item_id', test_item.id::text, true);
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 2. Rol dueño: la compra pasa a ser de ayer. Es la única forma de fabricar
--    una fecha vieja, porque el trigger no la acepta; se apaga solo para esta
--    sentencia y el rollback del final lo deshace todo igual.
-- ----------------------------------------------------------------------------

alter table public.list_items disable trigger list_items_stamp_check;

update public.list_items
set checked_at = now() - interval '1 day'
where id = current_setting('tacha_test.item_id')::uuid;

alter table public.list_items enable trigger list_items_stamp_check;

insert into public.recipes (id, owner_id, name, base_servings)
values (
  gen_random_uuid(),
  current_setting('tacha_test.user_id')::uuid,
  'Receta de prueba SCRUM-66',
  1
);

insert into public.recipe_ingredients (recipe_id, product_catalog_id, quantity_value, quantity_unit)
select r.id,
  current_setting('tacha_test.product_id')::uuid,
  2 * current_setting('tacha_test.base_quantity')::numeric,
  current_setting('tacha_test.base_unit')
from public.recipes r
where r.owner_id = current_setting('tacha_test.user_id')::uuid;

-- ----------------------------------------------------------------------------
-- 3. Como el usuario: la receta sobre el producto comprado ayer.
-- ----------------------------------------------------------------------------

set local role authenticated;

do $$
declare
  test_item_id uuid := current_setting('tacha_test.item_id')::uuid;
  base_quantity numeric := current_setting('tacha_test.base_quantity')::numeric;
  test_recipe_id uuid;
  recipe_result jsonb;
  test_item public.list_items;
begin
  -- Tachar otra vez algo tachado no mueve la fecha de compra.
  test_item := public.set_list_item_checked(test_item_id, true);
  assert test_item.checked_at < now() - interval '23 hours', 'volver a tachar conserva la fecha de compra';

  select r.id into test_recipe_id from public.recipes r where r.owner_id = auth.uid();
  recipe_result := public.add_recipe_to_general_list(test_recipe_id);

  assert exists (
    select 1 from jsonb_array_elements(recipe_result -> 'missing') as missing(item)
    where (missing.item ->> 'quantity')::numeric = base_quantity
  ), format('lo comprado no cuenta: falta 1 unidad (%s). Resultado: %s', base_quantity, recipe_result);

  select * into test_item from public.list_items where id = test_item_id;
  assert test_item.checked_at is null and test_item.checked_by is null, 'la fila vuelve a Pendientes';
  assert test_item.quantity_requested = 1, 'la cantidad es la que pide la receta, no la suma con lo comprado';

  -- Lo mismo desde el buscador: tachada → reabre con cantidad 1.
  perform public.change_item_quantity(test_item_id, 1);
  perform public.set_list_item_checked(test_item_id, true);
  test_item := public.add_item_to_general_list(current_setting('tacha_test.variant_id')::uuid);
  assert test_item.checked_at is null and test_item.quantity_requested = 1, 'añadir algo tachado lo reabre con 1';

  -- Y si está pendiente, suma como siempre.
  test_item := public.add_item_to_general_list(current_setting('tacha_test.variant_id')::uuid);
  assert test_item.quantity_requested = 2, 'añadir algo pendiente suma 1';

  -- Destachar deja las dos columnas en null.
  perform public.set_list_item_checked(test_item_id, true);
  test_item := public.set_list_item_checked(test_item_id, false);
  assert test_item.checked_at is null and test_item.checked_by is null, 'destachar limpia cuándo y quién';
end $$;

reset role;

rollback;
