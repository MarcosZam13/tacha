-- ============================================================================
-- Prueba de la migración 017 (SCRUM-98): qué falta de una receta.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 017. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja usuarios, productos, listas ni recetas en la base
-- compartida. Si una regla no se cumple, un `assert` corta con su mensaje; si
-- termina sin error, pasó. Contra la base sin 017 falla en el paso 1.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
--
-- Usa productos de prueba propios (nombres "P98 ...") en vez del catálogo
-- real, que casi no tiene conteos: así los casos son exactos.
--
-- Receta de prueba, en este orden (position 1 a 5):
--   leche   800 ml   en la lista, tachada, registro sin faltante  → covered
--   cebolla 3 unidad en la lista, tachada (conteo, sin registro)  → covered
--   sal     100 g    no está en la lista                          → notInList
--   aceite  200 ml   en la lista, sin tachar                      → notChecked
--   azúcar  1800 g   en la lista, tachada, faltan 800 g           → short (800)
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño): dos usuarios, cinco productos con una presentación
--    cada uno y una receta del usuario A con los cinco ingredientes. Los ids
--    viajan entre pasos en variables de la transacción (set_config(..., true)).
-- ----------------------------------------------------------------------------

do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  recipe_id uuid := gen_random_uuid();
  product_id uuid;
  variant_id uuid;
  spec record;
begin
  insert into auth.users (id, aud, role, email)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha'),
    (user_b, 'authenticated', 'authenticated', user_b || '@prueba.tacha');

  insert into public.recipes (id, owner_id, name, base_servings)
  values (recipe_id, user_a, 'Receta de prueba SCRUM-98', 1);

  -- key, nombre, unidad base, cantidad de la presentación, cantidad de la receta, position
  for spec in
    select * from (values
      ('leche',   'P98 leche',   'ml',     1000, 800,  1),
      ('cebolla', 'P98 cebolla', 'unidad', 1,    3,    2),
      ('sal',     'P98 sal',     'g',      500,  100,  3),
      ('aceite',  'P98 aceite',  'ml',     1000, 200,  4),
      ('azucar',  'P98 azúcar',  'g',      1000, 1800, 5)
    ) as t(key, product_name, unit, base_quantity, needed, pos)
  loop
    product_id := gen_random_uuid();
    variant_id := gen_random_uuid();

    insert into public.product_catalog (id, name, source)
    values (product_id, spec.product_name, 'manual');

    insert into public.product_catalog_variants (id, product_catalog_id, name, base_unit, base_quantity)
    values (variant_id, product_id, spec.product_name || ' ' || spec.base_quantity, spec.unit, spec.base_quantity);

    insert into public.recipe_ingredients (recipe_id, product_catalog_id, quantity_value, quantity_unit, position)
    values (recipe_id, product_id, spec.needed, spec.unit, spec.pos);

    perform set_config('tacha_test.variant_' || spec.key, variant_id::text, true);
  end loop;

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_b', user_b::text, true);
  perform set_config('tacha_test.recipe_id', recipe_id::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Usuario A: sin lista general todavía, todo es notInList y la RPC no crea
--    la lista. Después agrega cuatro productos (no la sal) y revisa que, sin
--    tachar nada, ninguno de los cuatro esté cubierto.
-- ----------------------------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  result jsonb;
  ingredient jsonb;
  list_item public.list_items;
begin
  result := public.get_recipe_coverage(current_setting('tacha_test.recipe_id')::uuid);

  assert jsonb_array_length(result) = 5, 'devuelve los 5 ingredientes';
  assert not exists (
    select 1 from jsonb_array_elements(result) e where e ->> 'reason' <> 'notInList'
  ), 'sin lista general todo es notInList';
  assert not exists (
    select 1 from public.lists l where l.owner_id = auth.uid()
  ), 'la RPC es de solo lectura: no crea la lista general';

  list_item := public.add_item_to_general_list(current_setting('tacha_test.variant_leche')::uuid);
  perform set_config('tacha_test.item_leche', list_item.id::text, true);
  list_item := public.add_item_to_general_list(current_setting('tacha_test.variant_cebolla')::uuid);
  perform set_config('tacha_test.item_cebolla', list_item.id::text, true);
  list_item := public.add_item_to_general_list(current_setting('tacha_test.variant_aceite')::uuid);
  perform set_config('tacha_test.item_aceite', list_item.id::text, true);
  list_item := public.add_item_to_general_list(current_setting('tacha_test.variant_azucar')::uuid);
  perform set_config('tacha_test.item_azucar', list_item.id::text, true);

  result := public.get_recipe_coverage(current_setting('tacha_test.recipe_id')::uuid);

  ingredient := jsonb_path_query_first(result, '$[*] ? (@.product_name == "P98 leche")');
  assert ingredient ->> 'status' = 'missing' and ingredient ->> 'reason' = 'notChecked',
    format('en la lista sin tachar: notChecked. Resultado: %s', ingredient);
  ingredient := jsonb_path_query_first(result, '$[*] ? (@.product_name == "P98 sal")');
  assert ingredient ->> 'reason' = 'notInList',
    format('la sal no está en la lista: notInList. Resultado: %s', ingredient);
end $$;

-- Tacha leche, cebolla y azúcar. El aceite queda pendiente.
do $$
begin
  perform public.set_list_item_checked(current_setting('tacha_test.item_leche')::uuid, true);
  perform public.set_list_item_checked(current_setting('tacha_test.item_cebolla')::uuid, true);
  perform public.set_list_item_checked(current_setting('tacha_test.item_azucar')::uuid, true);
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 2. Rol dueño: registros de faltante (lo que deja add_recipe_to_general_list,
--    escrito a mano para controlar cada caso).
--    - leche: la receta pidió 800 ml y no falta nada;
--    - azúcar: pidió 1800 g y faltan 800 g;
--    - aceite: faltan 100 ml (pero sigue sin tachar);
--    - leche, otra receta (R2): faltan 500 ml → NO debe contar para esta receta;
--    - leche, unidad distinta (g): faltan 50 g → NO debe contar (otra unidad).
-- ----------------------------------------------------------------------------

do $$
declare
  recipe2_id uuid := gen_random_uuid();
begin
  insert into public.recipes (id, owner_id, name, base_servings)
  values (recipe2_id, current_setting('tacha_test.user_a')::uuid, 'Otra receta de prueba SCRUM-98', 1);

  insert into public.list_item_recipe_requirements
    (list_item_id, recipe_id, quantity_needed, quantity_missing, quantity_unit)
  values
    (current_setting('tacha_test.item_leche')::uuid,  current_setting('tacha_test.recipe_id')::uuid, 800,  0,   'ml'),
    (current_setting('tacha_test.item_azucar')::uuid, current_setting('tacha_test.recipe_id')::uuid, 1800, 800, 'g'),
    (current_setting('tacha_test.item_aceite')::uuid, current_setting('tacha_test.recipe_id')::uuid, 200,  100, 'ml'),
    (current_setting('tacha_test.item_leche')::uuid,  recipe2_id,                                    800,  500, 'ml'),
    (current_setting('tacha_test.item_leche')::uuid,  current_setting('tacha_test.recipe_id')::uuid, 100,  50,  'g');

  perform set_config('tacha_test.recipe2_id', recipe2_id::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 3. Usuario A: el estado completo de la receta.
-- ----------------------------------------------------------------------------

set local role authenticated;

do $$
declare
  result jsonb;
  ingredient jsonb;
begin
  result := public.get_recipe_coverage(current_setting('tacha_test.recipe_id')::uuid);

  -- Orden de position.
  assert (select array_agg(e ->> 'product_name' order by idx)
          from jsonb_array_elements(result) with ordinality as t(e, idx))
         = array['P98 leche', 'P98 cebolla', 'P98 sal', 'P98 aceite', 'P98 azúcar'],
    format('los ingredientes vienen en el orden de position. Resultado: %s', result);

  -- Funcional: cubierto. Tachada, con registro sin faltante; el faltante de
  -- otra receta y el de otra unidad no cuentan.
  ingredient := jsonb_path_query_first(result, '$[*] ? (@.product_name == "P98 leche")');
  assert ingredient ->> 'status' = 'covered' and ingredient ->> 'reason' is null,
    format('leche tachada sin faltante propio: covered. Resultado: %s', ingredient);
  assert ingredient ->> 'missing_quantity' is null, 'covered no trae missing_quantity';

  -- Conteo tachado: no deja registro y basta con que esté tachado.
  ingredient := jsonb_path_query_first(result, '$[*] ? (@.product_name == "P98 cebolla")');
  assert ingredient ->> 'status' = 'covered', format('conteo tachado: covered. Resultado: %s', ingredient);

  ingredient := jsonb_path_query_first(result, '$[*] ? (@.product_name == "P98 sal")');
  assert ingredient ->> 'status' = 'missing' and ingredient ->> 'reason' = 'notInList',
    format('producto fuera de la lista: notInList. Resultado: %s', ingredient);
  assert ingredient ->> 'missing_quantity' is null, 'notInList no trae missing_quantity';

  -- Sin tachar gana sobre el faltante registrado (regla 30).
  ingredient := jsonb_path_query_first(result, '$[*] ? (@.product_name == "P98 aceite")');
  assert ingredient ->> 'reason' = 'notChecked',
    format('sin tachar y con faltante registrado: gana notChecked. Resultado: %s', ingredient);
  assert ingredient ->> 'missing_quantity' is null, 'notChecked no trae missing_quantity';

  -- Tachada con faltante: short, con la cantidad.
  ingredient := jsonb_path_query_first(result, '$[*] ? (@.product_name == "P98 azúcar")');
  assert ingredient ->> 'status' = 'missing' and ingredient ->> 'reason' = 'short',
    format('tachada con faltante registrado: short. Resultado: %s', ingredient);
  assert (ingredient ->> 'missing_quantity')::numeric = 800,
    format('short trae el faltante de la receta (800 g). Resultado: %s', ingredient);

  -- Destachar la leche la saca de cubierto; volver a tacharla la devuelve.
  perform public.set_list_item_checked(current_setting('tacha_test.item_leche')::uuid, false);
  result := public.get_recipe_coverage(current_setting('tacha_test.recipe_id')::uuid);
  ingredient := jsonb_path_query_first(result, '$[*] ? (@.product_name == "P98 leche")');
  assert ingredient ->> 'reason' = 'notChecked',
    format('destachar la leche: notChecked. Resultado: %s', ingredient);

  perform public.set_list_item_checked(current_setting('tacha_test.item_leche')::uuid, true);
  result := public.get_recipe_coverage(current_setting('tacha_test.recipe_id')::uuid);
  ingredient := jsonb_path_query_first(result, '$[*] ? (@.product_name == "P98 leche")');
  assert ingredient ->> 'status' = 'covered', 'volver a tachar la leche: covered';
end $$;

-- ----------------------------------------------------------------------------
-- 4. Usuario A: completa la receta. Agrega la sal y tacha sal y aceite. El
--    aceite pasa de notChecked a short (tachado, faltan 100 ml). Después se
--    resuelven los faltantes (rol dueño) y todo queda cubierto.
-- ----------------------------------------------------------------------------

do $$
declare
  result jsonb;
  ingredient jsonb;
  list_item public.list_items;
begin
  list_item := public.add_item_to_general_list(current_setting('tacha_test.variant_sal')::uuid);
  perform set_config('tacha_test.item_sal', list_item.id::text, true);
  perform public.set_list_item_checked(list_item.id, true);
  perform public.set_list_item_checked(current_setting('tacha_test.item_aceite')::uuid, true);

  result := public.get_recipe_coverage(current_setting('tacha_test.recipe_id')::uuid);

  ingredient := jsonb_path_query_first(result, '$[*] ? (@.product_name == "P98 sal")');
  assert ingredient ->> 'status' = 'covered',
    format('sal agregada y tachada, sin registro: covered. Resultado: %s', ingredient);

  ingredient := jsonb_path_query_first(result, '$[*] ? (@.product_name == "P98 aceite")');
  assert ingredient ->> 'reason' = 'short' and (ingredient ->> 'missing_quantity')::numeric = 100,
    format('aceite tachado con faltante de 100 ml: short. Resultado: %s', ingredient);
end $$;

reset role;

-- Se resuelven los faltantes.
update public.list_item_recipe_requirements
set quantity_missing = 0
where recipe_id = current_setting('tacha_test.recipe_id')::uuid;

set local role authenticated;

do $$
declare
  result jsonb;
begin
  result := public.get_recipe_coverage(current_setting('tacha_test.recipe_id')::uuid);

  assert jsonb_array_length(result) = 5, 'siguen los 5 ingredientes';
  assert not exists (
    select 1 from jsonb_array_elements(result) e where e ->> 'status' <> 'covered'
  ), format('sin faltantes y todo tachado: los 5 covered. Resultado: %s', result);
end $$;

-- ----------------------------------------------------------------------------
-- 5. Límite: una receta sin ingredientes devuelve un arreglo vacío, no null.
-- ----------------------------------------------------------------------------

reset role;

insert into public.recipes (id, owner_id, name, base_servings)
values (gen_random_uuid(), current_setting('tacha_test.user_a')::uuid, 'Receta vacía SCRUM-98', 1);

set local role authenticated;

do $$
declare
  empty_recipe_id uuid;
  result jsonb;
begin
  select r.id into empty_recipe_id from public.recipes r where r.name = 'Receta vacía SCRUM-98';
  result := public.get_recipe_coverage(empty_recipe_id);

  assert result = '[]'::jsonb, format('receta sin ingredientes: []. Resultado: %s', result);
end $$;

-- ----------------------------------------------------------------------------
-- 6. Negativo: el usuario B no ve la receta de A (P0002, igual que una que no
--    existe), y en su propia receta no ve nada de la lista de A: B tiene una
--    lista propia con el mismo producto SIN tachar mientras A lo tiene tachado.
--    Si saliera covered, la función estaría leyendo la fila de A.
-- ----------------------------------------------------------------------------

reset role;

insert into public.recipes (id, owner_id, name, base_servings)
values (gen_random_uuid(), current_setting('tacha_test.user_b')::uuid, 'Receta de B SCRUM-98', 1);

insert into public.recipe_ingredients (recipe_id, product_catalog_id, quantity_value, quantity_unit, position)
select r.id, ri.product_catalog_id, 100, 'ml', 1
from public.recipes r
join public.recipe_ingredients ri on ri.recipe_id = current_setting('tacha_test.recipe_id')::uuid and ri.position = 1
where r.name = 'Receta de B SCRUM-98';

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_b'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  b_recipe_id uuid;
  result jsonb;
begin
  begin
    perform public.get_recipe_coverage(current_setting('tacha_test.recipe_id')::uuid);
    assert false, 'B no puede revisar la receta de A';
  exception
    when no_data_found then null; -- P0002
  end;

  begin
    perform public.get_recipe_coverage(gen_random_uuid());
    assert false, 'una receta que no existe da el mismo error';
  exception
    when no_data_found then null;
  end;

  -- B agrega a su propia lista el producto que A tiene tachado: la fila de B
  -- queda sin tachar. Con la RLS y el filtro por dueño, B solo ve la suya.
  perform public.add_item_to_general_list(current_setting('tacha_test.variant_leche')::uuid);

  select r.id into b_recipe_id from public.recipes r where r.name = 'Receta de B SCRUM-98';
  result := public.get_recipe_coverage(b_recipe_id);

  assert jsonb_array_length(result) = 1
    and result -> 0 ->> 'reason' = 'notChecked',
    format('B ve solo su lista (sin tachar), no la de A (tachada): notChecked. Resultado: %s', result);
end $$;

-- ----------------------------------------------------------------------------
-- 7. Negativo: sin sesión (42501) y como anon (sin permiso de ejecución).
-- ----------------------------------------------------------------------------

select set_config('request.jwt.claims', '{}', true);

do $$
begin
  perform public.get_recipe_coverage(current_setting('tacha_test.recipe_id')::uuid);
  assert false, 'sin sesión no se puede revisar una receta';
exception
  when insufficient_privilege then null; -- 42501
end $$;

reset role;
set local role anon;

do $$
begin
  perform public.get_recipe_coverage(current_setting('tacha_test.recipe_id')::uuid);
  assert false, 'anon no tiene permiso de ejecución';
exception
  when insufficient_privilege then null;
end $$;

reset role;

-- Los permisos, sin depender del mensaje de error.
do $$
begin
  assert not has_function_privilege('anon', 'public.get_recipe_coverage(uuid)', 'execute'),
    'anon no puede ejecutar get_recipe_coverage';
  assert has_function_privilege('authenticated', 'public.get_recipe_coverage(uuid)', 'execute'),
    'authenticated sí puede ejecutar get_recipe_coverage';
end $$;

-- ----------------------------------------------------------------------------
-- 8. Realtime: list_items está en la publicación (y sigue estando si la
--    migración se corre otra vez, porque el bloque es idempotente).
-- ----------------------------------------------------------------------------

do $$
begin
  assert exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'list_items'
  ), 'list_items está en la publicación supabase_realtime';
end $$;

rollback;
