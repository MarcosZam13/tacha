-- ============================================================================
-- Prueba de la migración 029 (SCRUM-84): list_catalog_by_category.
--
-- Cómo se corre: completo en el SQL Editor, después de aplicar 029. Todo
-- pasa dentro de una transacción que termina en rollback (mismo patrón que
-- supabase/tests/020_curated_mothers.test.sql) — la categoría de prueba del
-- caso 3 no queda en la base compartida.
--
-- Nota sobre el conteo esperado (casos 1 y 2): la función hace, igual que
-- search_catalog, un INNER JOIN entre matching_products y product_variants.
-- Un producto de product_catalog sin ninguna fila en product_catalog_variants
-- (los "productos madre" usados solo por product_mother_rules/recipe_ingredients,
-- p. ej. "Leche", "Cereal", "Chocolate") queda fuera del resultado. Es el mismo
-- comportamiento ya establecido en search_catalog, no algo nuevo de esta
-- función, así que el conteo esperado se calcula solo sobre productos que
-- sí tienen al menos una variante.
--
-- Casos:
--   1. Sin category_id: devuelve todo el catálogo global (no solo una
--      categoría) — cuenta igual al total de product_catalog global con
--      al menos una variante.
--   2. Con category_id real ("Lácteos"): solo esa categoría, y cada fila
--      devuelta trae exactamente ese nombre de categoría.
--   3. Categoría sin ningún producto: 0 filas, nunca un error (la fila de
--      categoría se crea y se descarta con el rollback).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Sin category_id: todo el catálogo global, no solo una categoría.
-- ----------------------------------------------------------------------------
do $$
declare
  v_result_count int;
  v_expected_count int;
begin
  select count(*) into v_result_count from list_catalog_by_category(null, null);
  select count(*) into v_expected_count
  from product_catalog pc
  where pc.household_id is null
    and exists (
      select 1 from product_catalog_variants pcv
      where pcv.product_catalog_id = pc.id
    );

  assert v_result_count = v_expected_count,
    'Sin category_id: se esperaban ' || v_expected_count || ' productos (todo el catálogo global con variantes), dio ' || v_result_count;
end $$;

-- ----------------------------------------------------------------------------
-- 2. Con category_id real ("Lácteos"): solo esa categoría.
-- ----------------------------------------------------------------------------
do $$
declare
  v_lacteos_id uuid;
  v_result_count int;
  v_expected_count int;
  v_wrong_category_count int;
begin
  select id into v_lacteos_id from categories where name = 'Lácteos';
  assert v_lacteos_id is not null, 'No se encontró la categoría "Lácteos" (¿se aplicó la migración 020?)';

  select count(*) into v_result_count from list_catalog_by_category(v_lacteos_id, null);
  select count(*) into v_expected_count
  from product_catalog pc
  where pc.household_id is null
    and pc.category_id = v_lacteos_id
    and exists (
      select 1 from product_catalog_variants pcv
      where pcv.product_catalog_id = pc.id
    );

  assert v_result_count = v_expected_count,
    'Con "Lácteos": se esperaban ' || v_expected_count || ' productos (con variantes), dio ' || v_result_count;

  select count(*) into v_wrong_category_count
  from list_catalog_by_category(v_lacteos_id, null)
  where category is distinct from 'Lácteos';

  assert v_wrong_category_count = 0,
    'Con "Lácteos": ' || v_wrong_category_count || ' filas devueltas no son de esa categoría';
end $$;

-- ----------------------------------------------------------------------------
-- 3. Categoría real pero sin ningún producto: 0 filas, no error.
-- ----------------------------------------------------------------------------
do $$
declare
  v_empty_category_id uuid;
  v_result_count int;
begin
  insert into categories (name) values ('Categoría de prueba T29')
  returning id into v_empty_category_id;

  select count(*) into v_result_count from list_catalog_by_category(v_empty_category_id, null);

  assert v_result_count = 0,
    'Categoría vacía: se esperaban 0 filas, dio ' || v_result_count;
end $$;

rollback;
