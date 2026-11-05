-- ============================================================================
-- Prueba de la migración 044 (SCRUM-139): desempate determinístico y prefijo
-- de categoría ancho exigiendo keyword en normalize_staging_row.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 044. Todo pasa dentro de una transacción que termina en
-- rollback, así que no deja madres, reglas, filas de staging ni precios de
-- prueba en la base compartida (mismo patrón que
-- supabase/tests/020_curated_mothers.test.sql). Usa un store real (maxipali)
-- solo para el FK — no se modifica.
--
-- Casos (ver supabase/specs/SCRUM-139/plan.md §4):
--   1. Empate en la rama de categoría: dos madres sintéticas con el mismo
--      prefijo de 3 segmentos y el mismo keyword (con las 12 reglas reales
--      este empate no se puede armar — SPEC §1). Gana la de menor
--      product_catalog_id, en dos corridas.
--   2. Empate en la rama de respaldo: nombre real "Chocolate Milka de Leche"
--      (Chocolate | Leche, 1 keyword cada una), sin categorías. Mismo
--      resultado en dos corridas, y es la de menor product_catalog_id.
--   3. Over-matching bloqueado: "/Alimentos Congelados/Pizzas/" (prefijo
--      ancho de "Helado") sin ningún keyword → queda pending.
--   4. Prefijo ancho con keyword: "Helado de Vainilla" bajo
--      "/Alimentos Congelados/Helados/" sigue matcheando "Helado".
--   5. Regresión: "/Lácteos/Leche/Condensada/" (3 segmentos) sin
--      "condensada" en el nombre sigue matcheando "Leche condensada".
--   6. El hardening de 020 (search_path, sin execute para anon/authenticated)
--      sigue después del create or replace.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
-- ============================================================================

begin;

do $$
declare
  v_store_id uuid;
  -- Madre A tiene el id menor. La regla de B se inserta primero, para que
  -- ganar por orden de inserción no se confunda con ganar por el desempate.
  v_madre_a uuid := '00000000-0000-4000-8000-000000000139';
  v_madre_b uuid := 'ffffffff-ffff-4fff-8fff-000000000139';
  v_categorias_empate jsonb := '["/Prueba T44/Sub/Hoja/", "/Prueba T44/Sub/", "/Prueba T44/"]';
  v_staging_empate_1 uuid := gen_random_uuid();
  v_staging_empate_2 uuid := gen_random_uuid();
  v_staging_respaldo_1 uuid := gen_random_uuid();
  v_staging_respaldo_2 uuid := gen_random_uuid();
  v_staging_pizza uuid := gen_random_uuid();
  v_staging_helado uuid := gen_random_uuid();
  v_staging_condensada uuid := gen_random_uuid();
begin
  select id into v_store_id from stores where slug = 'maxipali';

  insert into product_catalog (id, name) values
    (v_madre_b, 'Madre B Prueba T44'),
    (v_madre_a, 'Madre A Prueba T44');
  insert into product_mother_rules (product_catalog_id, match_keywords, exclude_keywords, vtex_category_prefix)
  values (v_madre_b, array['zzt44'], '{}', '/Prueba T44/Sub/Hoja/');
  insert into product_mother_rules (product_catalog_id, match_keywords, exclude_keywords, vtex_category_prefix)
  values (v_madre_a, array['zzt44'], '{}', '/Prueba T44/Sub/Hoja/');

  -- Caso 1: dos filas iguales, una por corrida.
  insert into product_catalog_staging (id, store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values
    (v_staging_empate_1, v_store_id,
     jsonb_build_object('product', jsonb_build_object('categories', v_categorias_empate), 'offer', '{"Price": 1000}'::jsonb),
     'Producto zzt44 Prueba T44', 'Prueba', '100 g', 'pending'),
    (v_staging_empate_2, v_store_id,
     jsonb_build_object('product', jsonb_build_object('categories', v_categorias_empate), 'offer', '{"Price": 1000}'::jsonb),
     'Producto zzt44 Prueba T44', 'Prueba', '100 g', 'pending');

  -- Caso 2: sin categorías, decide el respaldo por keyword.
  insert into product_catalog_staging (id, store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values
    (v_staging_respaldo_1, v_store_id, '{"offer": {"Price": 1500}}'::jsonb,
     'Chocolate Milka de Leche Prueba T44', 'Milka', '90 g', 'pending'),
    (v_staging_respaldo_2, v_store_id, '{"offer": {"Price": 1500}}'::jsonb,
     'Chocolate Milka de Leche Prueba T44', 'Milka', '90 g', 'pending');

  -- Caso 3: prefijo ancho de "Helado", nombre sin keyword de ninguna madre.
  insert into product_catalog_staging (id, store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (
    v_staging_pizza, v_store_id,
    '{"product": {"categories": ["/Alimentos Congelados/Pizzas/", "/Alimentos Congelados/"]}, "offer": {"Price": 3000}}'::jsonb,
    'Pizza Congelada Prueba T44', 'Prueba', '400 g', 'pending'
  );

  -- Caso 4: prefijo ancho de "Helado", con keyword.
  insert into product_catalog_staging (id, store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (
    v_staging_helado, v_store_id,
    '{"product": {"categories": ["/Alimentos Congelados/Helados/", "/Alimentos Congelados/"]}, "offer": {"Price": 2500}}'::jsonb,
    'Helado de Vainilla Prueba T44', 'Prueba', '1 L', 'pending'
  );

  -- Caso 5: prefijo de 3 segmentos, nombre sin "condensada".
  insert into product_catalog_staging (id, store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (
    v_staging_condensada, v_store_id,
    '{"product": {"categories": ["/Lácteos/Leche/Condensada/", "/Lácteos/Leche/", "/Lácteos/"]}, "offer": {"Price": 1100}}'::jsonb,
    'Nestlé Lata Prueba T44', 'Nestlé', '397 g', 'pending'
  );

  perform set_config('tacha_test.madre_a', v_madre_a::text, true);
  perform set_config('tacha_test.staging_empate_1', v_staging_empate_1::text, true);
  perform set_config('tacha_test.staging_empate_2', v_staging_empate_2::text, true);
  perform set_config('tacha_test.staging_respaldo_1', v_staging_respaldo_1::text, true);
  perform set_config('tacha_test.staging_respaldo_2', v_staging_respaldo_2::text, true);
  perform set_config('tacha_test.staging_pizza', v_staging_pizza::text, true);
  perform set_config('tacha_test.staging_helado', v_staging_helado::text, true);
  perform set_config('tacha_test.staging_condensada', v_staging_condensada::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. Empate en la rama de categoría: gana la madre de menor id, siempre.
-- ----------------------------------------------------------------------------
do $$
declare
  v_madre_a uuid := current_setting('tacha_test.madre_a')::uuid;
  v_result_1 record;
  v_result_2 record;
begin
  select * into v_result_1 from normalize_staging_row(current_setting('tacha_test.staging_empate_1')::uuid);
  select * into v_result_2 from normalize_staging_row(current_setting('tacha_test.staging_empate_2')::uuid);

  assert v_result_1.success and v_result_2.success,
    'Empate categoría: se esperaba success=true en las dos corridas';
  assert v_result_1.product_catalog_id = v_madre_a,
    'Empate categoría, corrida 1: se esperaba la madre de menor id, dio ' || v_result_1.product_catalog_id;
  assert v_result_2.product_catalog_id = v_madre_a,
    'Empate categoría, corrida 2: se esperaba la madre de menor id, dio ' || v_result_2.product_catalog_id;
end $$;

-- ----------------------------------------------------------------------------
-- 2. Empate en la rama de respaldo: mismo resultado en las dos corridas, y es
--    la de menor product_catalog_id entre "Chocolate" y "Leche".
-- ----------------------------------------------------------------------------
do $$
declare
  v_result_1 record;
  v_result_2 record;
  v_esperada uuid;
begin
  select pmr.product_catalog_id into v_esperada
  from product_mother_rules pmr
  join product_catalog pc on pc.id = pmr.product_catalog_id
  where pc.name in ('Chocolate', 'Leche')
  order by pmr.product_catalog_id
  limit 1;

  select * into v_result_1 from normalize_staging_row(current_setting('tacha_test.staging_respaldo_1')::uuid);
  select * into v_result_2 from normalize_staging_row(current_setting('tacha_test.staging_respaldo_2')::uuid);

  assert v_result_1.success and v_result_2.success,
    'Empate respaldo: se esperaba success=true en las dos corridas';
  assert v_result_1.product_catalog_id = v_result_2.product_catalog_id,
    'Empate respaldo: las dos corridas dieron madres distintas';
  assert v_result_1.product_catalog_id = v_esperada,
    'Empate respaldo: se esperaba la madre de menor id entre Chocolate y Leche';
end $$;

-- ----------------------------------------------------------------------------
-- 3. Prefijo ancho sin keyword: la fila queda pending, no va a "Helado".
-- ----------------------------------------------------------------------------
do $$
declare
  v_staging_id uuid := current_setting('tacha_test.staging_pizza')::uuid;
  v_result record;
  v_status text;
begin
  select * into v_result from normalize_staging_row(v_staging_id);
  assert v_result.success = false, 'Prefijo ancho sin keyword: se esperaba success=false';
  assert v_result.error_message like '%stays pending%',
    'Prefijo ancho sin keyword: mensaje inesperado: ' || coalesce(v_result.error_message, 'NULL');

  select status into v_status from product_catalog_staging where id = v_staging_id;
  assert v_status = 'pending', 'Prefijo ancho sin keyword: se esperaba status=pending, dio ' || v_status;
end $$;

-- ----------------------------------------------------------------------------
-- 4. Prefijo ancho con keyword: sigue entrando por categoría.
-- ----------------------------------------------------------------------------
do $$
declare
  v_result record;
  v_mother_name text;
begin
  select * into v_result from normalize_staging_row(current_setting('tacha_test.staging_helado')::uuid);
  assert v_result.success, 'Prefijo ancho con keyword: se esperaba success=true, dio ' || coalesce(v_result.error_message, 'NULL');

  select name into v_mother_name from product_catalog where id = v_result.product_catalog_id;
  assert v_mother_name = 'Helado', 'Prefijo ancho con keyword: se esperaba madre "Helado", dio ' || coalesce(v_mother_name, 'NULL');
end $$;

-- ----------------------------------------------------------------------------
-- 5. Regresión: prefijo de 3 segmentos sigue sin exigir keyword.
-- ----------------------------------------------------------------------------
do $$
declare
  v_result record;
  v_mother_name text;
begin
  select * into v_result from normalize_staging_row(current_setting('tacha_test.staging_condensada')::uuid);
  assert v_result.success, 'Prefijo de 3 segmentos: se esperaba success=true, dio ' || coalesce(v_result.error_message, 'NULL');

  select name into v_mother_name from product_catalog where id = v_result.product_catalog_id;
  assert v_mother_name = 'Leche condensada',
    'Prefijo de 3 segmentos: se esperaba madre "Leche condensada", dio ' || coalesce(v_mother_name, 'NULL');
end $$;

-- ----------------------------------------------------------------------------
-- 6. Hardening de 020 intacto después del create or replace.
-- ----------------------------------------------------------------------------
do $$
declare
  v_function oid := 'public.normalize_staging_row(uuid)'::regprocedure;
begin
  assert (select 'search_path=public' = any(proconfig) from pg_proc where oid = v_function),
    'Hardening: falta search_path=public';
  assert not has_function_privilege('anon', v_function, 'execute'),
    'Hardening: anon puede ejecutar normalize_staging_row';
  assert not has_function_privilege('authenticated', v_function, 'execute'),
    'Hardening: authenticated puede ejecutar normalize_staging_row';
end $$;

rollback;
