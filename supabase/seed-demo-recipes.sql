-- ============================================================================
-- SCRUM-94 (HU-63): recetas de ejemplo para probar /recetas
--
-- Todavía no se pueden crear recetas desde la app (SCRUM-95), así que esto
-- le da 4 recetas de ejemplo a CADA usuario que ya existe, con ingredientes
-- que están en el catálogo actual (que por ahora es solo lácteos).
--
-- Cómo usarlo (SQL editor de Supabase, que corre sin RLS):
--   1. Abrir /recetas al menos una vez, para que tu usuario exista.
--   2. Correr este script.
--   3. Recargar /recetas.
--
-- Un usuario creado después de correrlo no tiene las recetas: basta con
-- volver a correrlo. Es idempotente: borra y vuelve a crear las recetas de
-- ejemplo, sin duplicar.
--
-- Cómo sabe cuáles son "de ejemplo": todas llevan created_at dentro de la
-- primera hora del 2000-01-01 (demo_marker), una fecha que ninguna receta
-- real puede tener (created_at es now() al crearla). El delete y el join
-- solo tocan esas filas, así que correrlo después de SCRUM-95 no borra
-- recetas reales aunque se llamen igual.
--
-- No es una migración: son datos de prueba y no van a producción.
-- ============================================================================

do $$
declare
  demo_marker constant timestamptz := '2000-01-01 00:00:00+00';
  user_count integer;
  expected_ingredients integer;
  inserted_ingredients integer;
begin
  select count(*) into user_count from auth.users;
  if user_count = 0 then
    raise exception 'No hay usuarios: abre /recetas una vez antes de correr el seed';
  end if;

  -- Los ingredientes se borran en cascada con su receta.
  delete from public.recipes
  where created_at >= demo_marker and created_at < demo_marker + interval '1 hour';

  -- created_offset: más offset = más nueva, para que el orden "más nuevas
  -- primero" de la pantalla sea estable.
  create temporary table demo_recipes (
    name text, base_servings integer, created_offset interval
  ) on commit drop;
  insert into demo_recipes values
    ('Tres leches',         12, interval '3 minutes'),
    ('Arroz con leche',      6, interval '2 minutes'),
    ('Batido de chocolate',  2, interval '1 minute'),
    ('Cereal con leche',     1, interval '0 minutes');

  -- product_name tiene que coincidir exacto con product_catalog.name.
  create temporary table demo_ingredients (
    recipe_name text, product_name text, quantity_value numeric, quantity_unit text, position integer
  ) on commit drop;
  insert into demo_ingredients values
    ('Tres leches',         'Leche entera Sabemas - 1 L',                   500, 'ml', 0),
    ('Tres leches',         'Leche Condensada La Lechera Original -335g',  335, 'g',  1),
    ('Tres leches',         'Leche Evaporada Ideal Nestlé lata -360g',     360, 'g',  2),
    ('Tres leches',         'Crema de Leche Nestlé - 236g',                236, 'g',  3),
    ('Arroz con leche',     'Leche entera Sabemas - 1 L',                  1000, 'ml', 0),
    ('Arroz con leche',     'Leche condensada El Ángel doypack - 385 g',   200, 'g',  1),
    ('Arroz con leche',     'Leche De Coco Goya Lata - 400ml',             400, 'ml', 2),
    ('Batido de chocolate', 'Leche Dos Pinos Pinito - 1000 ml',            500, 'ml', 0),
    ('Batido de chocolate', 'Chocolate Milka de Leche - 90 g',              45, 'g',  1),
    ('Cereal con leche',    'Froot Loops Mas Leche Pinito 520 g',           40, 'g',  0),
    ('Cereal con leche',    'Leche Semidescremada Dos Pinos -1 L',         250, 'ml', 1);

  -- Una copia de cada receta por usuario, marcada con demo_marker.
  insert into public.recipes (owner_id, name, base_servings, created_at)
  select u.id, d.name, d.base_servings, demo_marker + d.created_offset
  from auth.users u
  cross join demo_recipes d;

  insert into public.recipe_ingredients
    (recipe_id, product_catalog_id, quantity_value, quantity_unit, position)
  select r.id, p.id, i.quantity_value, i.quantity_unit, i.position
  from demo_ingredients i
  join public.recipes r
    on r.name = i.recipe_name
   and r.created_at >= demo_marker and r.created_at < demo_marker + interval '1 hour'
  join public.product_catalog p on p.name = i.product_name;

  get diagnostics inserted_ingredients = row_count;
  select count(*) * user_count into expected_ingredients from demo_ingredients;
  if inserted_ingredients <> expected_ingredients then
    raise exception 'Se insertaron % de % ingredientes: algún producto de demo_ingredients no está en el catálogo',
      inserted_ingredients, expected_ingredients;
  end if;

  raise notice 'Recetas de ejemplo creadas para % usuarios', user_count;
end $$;
