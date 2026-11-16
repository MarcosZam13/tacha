-- ============================================================================
-- Prueba de la migración 048 (SCRUM-133): reset del catálogo.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 048. Solo lee: termina en rollback igual que las otras pruebas.
-- Para ensayar la migración antes de aplicarla: begin; <contenido de 048>;
-- <los asserts de abajo>; rollback;
--
-- Casos (supabase/specs/SCRUM-133/SPEC.md §5):
--   1. No queda ninguna madre vieja (madre global sin regla curada).
--   2. No queda ninguna receta en la ventana demo original.
--   3. Las recetas del seed (marcador 2000-01-01) solo usan las 7 madres
--      curadas del seed actualizado, sin ingredientes repetidos.
--   4. Todos los ítems de lista globales están en variantes de madres curadas.
--   5. search_catalog y list_catalog_by_category solo devuelven madres
--      curadas o productos propios.
--   6. Ninguna (lista, variante) tiene dos ítems pendientes.
--
-- Ejecutarlo completo, nunca por partes.
-- ============================================================================

begin;

do $$
declare
  -- Mismo rango que la migración 048 y que el marcador del seed
  -- (supabase/seed-demo-recipes.sql).
  c_demo_window_start constant timestamptz := '2026-09-28 05:41:00+00';
  c_demo_window_end constant timestamptz := '2026-09-28 05:46:00+00';
  c_seed_marker constant timestamptz := '2000-01-01 00:00:00+00';
  c_seed_mothers constant text[] := array[
    'Leche', 'Leche condensada', 'Leche evaporada', 'Crema de leche',
    'Leche de coco', 'Chocolate', 'Cereal'
  ];
  v_count integer;
begin
  -- 1. Madres viejas.
  select count(*) into v_count
  from product_catalog pc
  where pc.owner_id is null
    and pc.household_id is null
    and not exists (select 1 from product_mother_rules r where r.product_catalog_id = pc.id);
  assert v_count = 0, format('caso 1: quedan %s madres viejas', v_count);

  -- 2. Recetas demo originales.
  select count(*) into v_count
  from recipes
  where created_at >= c_demo_window_start and created_at < c_demo_window_end;
  assert v_count = 0, format('caso 2: quedan %s recetas en la ventana demo', v_count);

  -- 3. Recetas del seed.
  select count(*) into v_count
  from recipe_ingredients ri
  join recipes r on r.id = ri.recipe_id
  join product_catalog pc on pc.id = ri.product_catalog_id
  where r.created_at >= c_seed_marker and r.created_at < c_seed_marker + interval '1 hour'
    and not (pc.name = any (c_seed_mothers) and pc.owner_id is null and pc.household_id is null);
  assert v_count = 0, format('caso 3: %s ingredientes del seed fuera de las madres curadas', v_count);

  select count(*) into v_count
  from (
    select owner_id, name
    from recipes
    where created_at >= c_seed_marker and created_at < c_seed_marker + interval '1 hour'
    group by owner_id, name
    having count(*) > 1
  ) duplicated;
  assert v_count = 0, format('caso 3: %s recetas del seed duplicadas', v_count);

  -- 4. Ítems de lista en el catálogo global.
  select count(*) into v_count
  from list_items li
  join product_catalog_variants v on v.id = li.product_catalog_variant_id
  join product_catalog pc on pc.id = v.product_catalog_id
  where pc.owner_id is null
    and pc.household_id is null
    and not exists (select 1 from product_mother_rules r where r.product_catalog_id = pc.id);
  assert v_count = 0, format('caso 4: %s ítems en variantes sin madre curada', v_count);

  -- 5. Búsqueda y filtro por categoría.
  select count(*) into v_count
  from (
    select product_catalog_id from search_catalog('leche')
    union all
    select product_catalog_id from list_catalog_by_category()
  ) result
  join product_catalog pc on pc.id = result.product_catalog_id
  where pc.owner_id is null
    and pc.household_id is null
    and not exists (select 1 from product_mother_rules r where r.product_catalog_id = pc.id);
  assert v_count = 0, format('caso 5: el catálogo devuelve %s madres viejas', v_count);

  -- 6. Un solo ítem pendiente por (lista, variante).
  select count(*) into v_count
  from (
    select list_id, product_catalog_variant_id
    from list_items
    where checked_at is null
    group by list_id, product_catalog_variant_id
    having count(*) > 1
  ) duplicated;
  assert v_count = 0, format('caso 6: %s (lista, variante) con dos ítems pendientes', v_count);

  raise notice '048: 6 casos OK';
end;
$$;

rollback;
