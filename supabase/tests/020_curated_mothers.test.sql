-- ============================================================================
-- Prueba de la migración 020 (SCRUM-131): normalizador con madres curadas.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 020. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja filas de staging ni precios de prueba en la base
-- compartida (mismo patrón que supabase/tests/017_recipe_coverage.test.sql).
-- Usa un store real (maxipali) solo para el FK — no se modifica.
--
-- Casos (los tres toman la evidencia real de SPEC §2/§3):
--   1. "Jabón Dove Leche de Coco" — keyword "leche" ambiguo, pero la
--      categoría de VTEX es jabón → debe matchear la madre "Jabón", nunca
--      "Leche" (esto es justo lo que corrige DECISION-SCRUM-126).
--   2. "Leche De Magnesia" — no tiene madre curada en este lote (a propósito,
--      ver SPEC §3) → debe quedar pending, no se fuerza ningún match.
--   3. "Leche Entera" — caso normal, para probar que correr el normalizador
--      dos veces sobre la misma fila no duplica nada (idempotencia).
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
-- ============================================================================

begin;

do $$
declare
  v_store_id uuid;
  v_staging_jabon uuid := gen_random_uuid();
  v_staging_sin_match uuid := gen_random_uuid();
  v_staging_leche uuid := gen_random_uuid();
begin
  select id into v_store_id from stores where slug = 'maxipali';

  -- Caso 1: keyword "leche" presente, pero categoría real de jabón.
  insert into product_catalog_staging (id, store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (
    v_staging_jabon, v_store_id,
    '{"product": {"categories": ["/Higiene y Belleza/Cuidado Corporal/Jabón y gel corporal/", "/Higiene y Belleza/Cuidado Corporal/", "/Higiene y Belleza/"]}, "offer": {"Price": 1200}}'::jsonb,
    'Jabón Dove Leche de Coco Prueba T20', 'Dove', '90 g', 'pending'
  );

  -- Caso 2: antiácido sin madre curada en este lote — debe quedar pending.
  insert into product_catalog_staging (id, store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (
    v_staging_sin_match, v_store_id,
    '{"product": {"categories": ["/Farmacia/Sistema Digestivo/Antiácidos/", "/Farmacia/Sistema Digestivo/", "/Farmacia/"]}, "offer": {"Price": 2500}}'::jsonb,
    'Leche De Magnesia Prueba T20', 'Phillips', '360 ml', 'pending'
  );

  -- Caso 3: leche normal, para la prueba de idempotencia.
  insert into product_catalog_staging (id, store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (
    v_staging_leche, v_store_id,
    '{"product": {"categories": ["/Lácteos/Leche/Leche Entera/", "/Lácteos/Leche/", "/Lácteos/"]}, "offer": {"Price": 900}}'::jsonb,
    'Leche Entera Prueba T20', 'Dos Pinos', '1 L', 'pending'
  );

  perform set_config('tacha_test.staging_jabon', v_staging_jabon::text, true);
  perform set_config('tacha_test.staging_sin_match', v_staging_sin_match::text, true);
  perform set_config('tacha_test.staging_leche', v_staging_leche::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Categoría de VTEX manda sobre el keyword: "Jabón" gana, no "Leche".
-- ----------------------------------------------------------------------------
do $$
declare
  v_staging_id uuid := current_setting('tacha_test.staging_jabon')::uuid;
  v_result record;
  v_mother_name text;
begin
  select * into v_result from normalize_staging_row(v_staging_id);
  assert v_result.success, 'Caso jabón: se esperaba success=true, dio ' || coalesce(v_result.error_message, 'NULL');

  select name into v_mother_name from product_catalog where id = v_result.product_catalog_id;
  assert v_mother_name = 'Jabón', 'Caso jabón: se esperaba madre "Jabón", dio ' || coalesce(v_mother_name, 'NULL');
end $$;

-- ----------------------------------------------------------------------------
-- 2. Sin madre curada que la cubra: la fila queda pending, nunca se fuerza.
-- ----------------------------------------------------------------------------
do $$
declare
  v_staging_id uuid := current_setting('tacha_test.staging_sin_match')::uuid;
  v_result record;
  v_status text;
begin
  select * into v_result from normalize_staging_row(v_staging_id);
  assert v_result.success = false, 'Caso sin match: se esperaba success=false';
  assert v_result.error_message like '%stays pending%', 'Caso sin match: mensaje inesperado: ' || coalesce(v_result.error_message, 'NULL');

  select status into v_status from product_catalog_staging where id = v_staging_id;
  assert v_status = 'pending', 'Caso sin match: se esperaba status=pending, dio ' || v_status;
end $$;

-- ----------------------------------------------------------------------------
-- 3. Idempotencia: correr la misma fila dos veces no duplica nada.
-- ----------------------------------------------------------------------------
do $$
declare
  v_staging_id uuid := current_setting('tacha_test.staging_leche')::uuid;
  v_result record;
  v_variant_id uuid;
  v_price_count_1 int;
  v_price_count_2 int;
begin
  select * into v_result from normalize_staging_row(v_staging_id);
  assert v_result.success, 'Idempotencia: primera corrida debía ser success, dio ' || coalesce(v_result.error_message, 'NULL');
  v_variant_id := v_result.product_variant_id;

  select count(*) into v_price_count_1 from product_prices where product_catalog_variant_id = v_variant_id;

  -- Segunda corrida: la fila ya no está pending (ya quedó matched arriba),
  -- normalize_staging_row debe rechazarla sin tocar nada más.
  select * into v_result from normalize_staging_row(v_staging_id);
  assert v_result.success = false, 'Idempotencia: segunda corrida debía ser success=false (fila ya procesada)';

  select count(*) into v_price_count_2 from product_prices where product_catalog_variant_id = v_variant_id;
  assert v_price_count_1 = v_price_count_2, 'Idempotencia: la segunda corrida duplicó filas de precio';
end $$;

rollback;
