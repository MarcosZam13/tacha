-- ============================================================================
-- Prueba de la migración 042 (SCRUM-138): parse_size_text con gr/uds/gal y
-- el sufijo de ruido "ea" de VTEX.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las funciones),
-- después de aplicar 042. parse_size_text es una función pura (sin efectos
-- en tablas), así que begin/rollback acá es solo por consistencia con el
-- resto de supabase/tests/ — no hay nada que limpiar.
--
-- Casos: las 8 filas reales de SPEC §2 (confirmadas en product_catalog_staging,
-- 2026-11-02) + regresión (litros/ml/kg/kilogramos/unidades ya existentes) +
-- multipack (6p/5p no debe colarse como unidad).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Las 8 filas reales de SPEC §2 — todas deben parsear (antes: null).
-- ----------------------------------------------------------------------------
do $$
declare
  v_result record;
begin
  select * into v_result from parse_size_text('Arroz Precocido Tio Pelon 6p 6000gr');
  assert v_result.base_unit = 'g' and v_result.base_quantity = 6000,
    'Arroz 6p 6000gr: se esperaba (g, 6000), dio (' || coalesce(v_result.base_unit, 'NULL') || ', ' || coalesce(v_result.base_quantity::text, 'NULL') || ')';

  select * into v_result from parse_size_text('Arroz Y Frijol Tio Pelon 5p 7000gr');
  assert v_result.base_unit = 'g' and v_result.base_quantity = 7000,
    'Arroz 5p 7000gr: se esperaba (g, 7000), dio (' || coalesce(v_result.base_unit, 'NULL') || ', ' || coalesce(v_result.base_quantity::text, 'NULL') || ')';

  select * into v_result from parse_size_text('Cereal Vitalisimo Pocketini Leche 375gr');
  assert v_result.base_unit = 'g' and v_result.base_quantity = 375,
    'Cereal 375gr: se esperaba (g, 375), dio (' || coalesce(v_result.base_unit, 'NULL') || ', ' || coalesce(v_result.base_quantity::text, 'NULL') || ')';

  select * into v_result from parse_size_text('Paleta Pops Leche Galleta Choc 60 Gr');
  assert v_result.base_unit = 'g' and v_result.base_quantity = 60,
    'Paleta 60 Gr: se esperaba (g, 60), dio (' || coalesce(v_result.base_unit, 'NULL') || ', ' || coalesce(v_result.base_quantity::text, 'NULL') || ')';

  select * into v_result from parse_size_text('Empanada Marcelino Dulce De Leche - 8 uds');
  assert v_result.base_unit = 'unidad' and v_result.base_quantity = 8,
    'Empanada 8 uds: se esperaba (unidad, 8), dio (' || coalesce(v_result.base_unit, 'NULL') || ', ' || coalesce(v_result.base_quantity::text, 'NULL') || ')';

  select * into v_result from parse_size_text('Leche Semidescremada Dos Pinos Liquida - 1 gal');
  assert v_result.base_unit = 'ml' and v_result.base_quantity = 3785,
    'Leche 1 gal: se esperaba (ml, 3785), dio (' || coalesce(v_result.base_unit, 'NULL') || ', ' || coalesce(v_result.base_quantity::text, 'NULL') || ')';

  select * into v_result from parse_size_text('Helado Dulce De Leche Alaska 500grea');
  assert v_result.base_unit = 'g' and v_result.base_quantity = 500,
    'Helado 500grea: se esperaba (g, 500), dio (' || coalesce(v_result.base_unit, 'NULL') || ', ' || coalesce(v_result.base_quantity::text, 'NULL') || ')';

  select * into v_result from parse_size_text('Helado Dulce De Leche Alaska 972grea');
  assert v_result.base_unit = 'g' and v_result.base_quantity = 972,
    'Helado 972grea: se esperaba (g, 972), dio (' || coalesce(v_result.base_unit, 'NULL') || ', ' || coalesce(v_result.base_quantity::text, 'NULL') || ')';
end $$;

-- ----------------------------------------------------------------------------
-- 2. Regresión: casos que ya funcionaban antes de esta migración.
-- ----------------------------------------------------------------------------
do $$
declare
  v_result record;
begin
  select * into v_result from parse_size_text('1 Litro');
  assert v_result.base_unit = 'ml' and v_result.base_quantity = 1000,
    'Regresión "1 Litro": se esperaba (ml, 1000), dio (' || coalesce(v_result.base_unit, 'NULL') || ', ' || coalesce(v_result.base_quantity::text, 'NULL') || ')';

  select * into v_result from parse_size_text('500 ml');
  assert v_result.base_unit = 'ml' and v_result.base_quantity = 500,
    'Regresión "500 ml": se esperaba (ml, 500), dio (' || coalesce(v_result.base_unit, 'NULL') || ', ' || coalesce(v_result.base_quantity::text, 'NULL') || ')';

  select * into v_result from parse_size_text('1 kg');
  assert v_result.base_unit = 'g' and v_result.base_quantity = 1000,
    'Regresión "1 kg": se esperaba (g, 1000), dio (' || coalesce(v_result.base_unit, 'NULL') || ', ' || coalesce(v_result.base_quantity::text, 'NULL') || ')';

  select * into v_result from parse_size_text('1.5 kilogramos');
  assert v_result.base_unit = 'g' and v_result.base_quantity = 1500,
    'Regresión "1.5 kilogramos": se esperaba (g, 1500), dio (' || coalesce(v_result.base_unit, 'NULL') || ', ' || coalesce(v_result.base_quantity::text, 'NULL') || ')';

  select * into v_result from parse_size_text('6 unidades');
  assert v_result.base_unit = 'unidad' and v_result.base_quantity = 6,
    'Regresión "6 unidades": se esperaba (unidad, 6), dio (' || coalesce(v_result.base_unit, 'NULL') || ', ' || coalesce(v_result.base_quantity::text, 'NULL') || ')';

  select * into v_result from parse_size_text('paquete x6');
  assert v_result.base_unit = 'unidad' and v_result.base_quantity = 6,
    'Regresión "paquete x6": se esperaba (unidad, 6), dio (' || coalesce(v_result.base_unit, 'NULL') || ', ' || coalesce(v_result.base_quantity::text, 'NULL') || ')';
end $$;

-- ----------------------------------------------------------------------------
-- 3. Multipack (6p/5p): confirmar que no se cuela como base_quantity
--    equivocado — ya cubierto por el caso 1 (6000gr/7000gr, no 6/5), se deja
--    aparte para que quede explícito que es justo lo que valida tasks.md §5.
-- ----------------------------------------------------------------------------
do $$
declare
  v_result record;
begin
  select * into v_result from parse_size_text('Arroz Precocido Tio Pelon 6p 6000gr');
  assert v_result.base_quantity = 6000 and v_result.base_quantity != 6,
    'Multipack 6p: "6p" no debe colarse como base_quantity=6 — dio ' || coalesce(v_result.base_quantity::text, 'NULL');
end $$;

rollback;
