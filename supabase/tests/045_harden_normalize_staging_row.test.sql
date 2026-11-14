-- ============================================================================
-- Prueba de la migración 045 (SCRUM-132): normalize_staging_row más estricto.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 045. Todo pasa dentro de una transacción que termina en
-- rollback: no deja filas de staging, variantes, marcas ni precios de prueba
-- en la base compartida (mismo patrón que
-- supabase/tests/044_fix_normalize_staging_tiebreak.test.sql). Usa las 12
-- reglas reales de madres.json y un store real (maxipali) solo para el FK.
--
-- Casos (nombres tomados de la corrida real del 2026-11-13):
--   1. Respaldo bloqueado: "Acondicionador kids Leche Pal Pelo" con categoría
--      de cabello → pending (antes iba a "Leche").
--   2. Respaldo permitido: fila sin categorías con "Leche Entera" → "Leche".
--   3. Palabra completa: "Gomitas Grissly Cocodrilo" bajo "/Lácteos/Leche/"
--      → pending (antes "coco" lo mandaba a "Leche de coco").
--   4. Keyword obligatorio con prefijo de 3 segmentos: "Levadura Parapan"
--      bajo Repostería → pending; "Crema dulce Dos Pinos" → "Crema de leche".
--   5. Precio ₡0 → rejected; IsAvailable = false → rejected.
--   6. Tamaño: "2838 L" → rejected; "1,8 kg" → variante de 1800 g.
--   7. Hardening: search_path fijo y sin execute para anon/authenticated en
--      normalize_staging_row y matches_mother_keyword.
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
-- ============================================================================

begin;

do $$
declare
  v_store_id uuid;
  v_leche uuid;
  v_crema uuid;
  v_arroz uuid;
  v_id uuid;
  v_result record;
  v_status text;
  v_quantity numeric;
  c_cat_leche constant jsonb := '["/Lácteos/Leche/Leche Entera/", "/Lácteos/Leche/", "/Lácteos/"]';
  c_cat_reposteria constant jsonb := '["/Abarrotes/Harinas y Repostería/Repostería/", "/Abarrotes/Harinas y Repostería/", "/Abarrotes/"]';
  c_cat_arroz constant jsonb := '["/Abarrotes/Arroz, Frijol y Semillas/", "/Abarrotes/"]';
  c_cat_cabello constant jsonb := '["/Higiene y Belleza/Cuidado del Cabello/Acondicionador/", "/Higiene y Belleza/"]';
begin
  select id into v_store_id from stores where slug = 'maxipali';
  select pc.id into v_leche from product_catalog pc join product_mother_rules r on r.product_catalog_id = pc.id where pc.name = 'Leche';
  select pc.id into v_crema from product_catalog pc join product_mother_rules r on r.product_catalog_id = pc.id where pc.name = 'Crema de leche';
  select pc.id into v_arroz from product_catalog pc join product_mother_rules r on r.product_catalog_id = pc.id where pc.name = 'Arroz';

  -- 1. Respaldo bloqueado: con categorías que ninguna regla cubre.
  insert into product_catalog_staging (store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (v_store_id, jsonb_build_object('product', jsonb_build_object('categories', c_cat_cabello), 'offer', '{"Price": 9540, "IsAvailable": true}'::jsonb),
          'Acondicionador kids Leche Pal Pelo T45', 'Leche Pal Pelo', '440ml', 'pending')
  returning id into v_id;
  select * into v_result from normalize_staging_row(v_id);
  select status into v_status from product_catalog_staging where id = v_id;
  assert v_status = 'pending', format('caso 1: esperaba pending, quedó %s', v_status);

  -- 2. Respaldo permitido: sin categorías.
  insert into product_catalog_staging (store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (v_store_id, '{"offer": {"Price": 1200, "IsAvailable": true}}'::jsonb,
          'Leche Entera Prueba T45', 'Prueba', '1 L', 'pending')
  returning id into v_id;
  select * into v_result from normalize_staging_row(v_id);
  assert v_result.success and v_result.product_catalog_id = v_leche, 'caso 2: esperaba "Leche" por el respaldo';

  -- 3. Palabra completa: "coco" no matchea dentro de "Cocodrilo".
  insert into product_catalog_staging (store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (v_store_id, jsonb_build_object('product', jsonb_build_object('categories', c_cat_leche), 'offer', '{"Price": 500, "IsAvailable": true}'::jsonb),
          'Gomitas Grissly Cocodrilo T45', 'Grissly', '50 g', 'pending')
  returning id into v_id;
  select * into v_result from normalize_staging_row(v_id);
  select status into v_status from product_catalog_staging where id = v_id;
  assert v_status = 'pending', format('caso 3: esperaba pending, quedó %s', v_status);

  -- 4a. Prefijo de 3 segmentos sin keyword → pending.
  insert into product_catalog_staging (store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (v_store_id, jsonb_build_object('product', jsonb_build_object('categories', c_cat_reposteria), 'offer', '{"Price": 1300, "IsAvailable": true}'::jsonb),
          'Levadura Parapan Seca Instantánea T45', 'Parapan', '80 g', 'pending')
  returning id into v_id;
  select * into v_result from normalize_staging_row(v_id);
  select status into v_status from product_catalog_staging where id = v_id;
  assert v_status = 'pending', format('caso 4a: esperaba pending, quedó %s', v_status);

  -- 4b. Mismo prefijo con keyword "crema" → "Crema de leche".
  insert into product_catalog_staging (store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (v_store_id, jsonb_build_object('product', jsonb_build_object('categories', c_cat_reposteria), 'offer', '{"Price": 2100, "IsAvailable": true}'::jsonb),
          'Crema dulce Dos Pinos para batir T45', 'Dos Pinos', '1 L', 'pending')
  returning id into v_id;
  select * into v_result from normalize_staging_row(v_id);
  assert v_result.success and v_result.product_catalog_id = v_crema, 'caso 4b: esperaba "Crema de leche"';

  -- 5a. Precio ₡0.
  insert into product_catalog_staging (store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (v_store_id, jsonb_build_object('product', jsonb_build_object('categories', c_cat_leche), 'offer', '{"Price": 0, "IsAvailable": true}'::jsonb),
          'Leche Semidescremada Prueba T45', 'Prueba', '1 L', 'pending')
  returning id into v_id;
  select * into v_result from normalize_staging_row(v_id);
  select status into v_status from product_catalog_staging where id = v_id;
  assert v_status = 'rejected', format('caso 5a: esperaba rejected, quedó %s', v_status);

  -- 5b. Oferta agotada, aunque traiga precio.
  insert into product_catalog_staging (store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (v_store_id, jsonb_build_object('product', jsonb_build_object('categories', c_cat_leche), 'offer', '{"Price": 1100, "IsAvailable": false}'::jsonb),
          'Leche Semidescremada Prueba T45', 'Prueba', '1 L', 'pending')
  returning id into v_id;
  select * into v_result from normalize_staging_row(v_id);
  select status into v_status from product_catalog_staging where id = v_id;
  assert v_status = 'rejected', format('caso 5b: esperaba rejected, quedó %s', v_status);

  -- 6a. Tamaño imposible.
  insert into product_catalog_staging (store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (v_store_id, jsonb_build_object('product', jsonb_build_object('categories', c_cat_leche), 'offer', '{"Price": 4000, "IsAvailable": true}'::jsonb),
          'Leche Dos Pinos proteína T45', 'Dos Pinos', 'Leche Dos Pinos proteína - 2838 L', 'pending')
  returning id into v_id;
  select * into v_result from normalize_staging_row(v_id);
  select status into v_status from product_catalog_staging where id = v_id;
  assert v_status = 'rejected', format('caso 6a: esperaba rejected, quedó %s', v_status);

  -- 6b. Coma decimal.
  insert into product_catalog_staging (store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (v_store_id, jsonb_build_object('product', jsonb_build_object('categories', c_cat_arroz), 'offer', '{"Price": 2500, "IsAvailable": true}'::jsonb),
          'Arroz Tío Pelón Bio 95% grano entero T45', 'Tío Pelón', 'Arroz Tío Pelón Bio 95% grano entero - 1,8 kg', 'pending')
  returning id into v_id;
  select * into v_result from normalize_staging_row(v_id);
  assert v_result.success and v_result.product_catalog_id = v_arroz, 'caso 6b: esperaba "Arroz"';
  select base_quantity into v_quantity from product_catalog_variants where id = v_result.product_variant_id;
  assert v_quantity = 1800, format('caso 6b: esperaba 1800 g, quedó %s', v_quantity);

  -- 7. Hardening.
  assert (select 'search_path=public' = any(proconfig) from pg_proc where oid = 'normalize_staging_row(uuid)'::regprocedure),
    'caso 7: normalize_staging_row sin search_path fijo';
  assert (select 'search_path=public' = any(proconfig) from pg_proc where oid = 'matches_mother_keyword(text, text)'::regprocedure),
    'caso 7: matches_mother_keyword sin search_path fijo';
  assert not has_function_privilege('anon', 'normalize_staging_row(uuid)', 'execute'), 'caso 7: anon puede ejecutar normalize_staging_row';
  assert not has_function_privilege('authenticated', 'normalize_staging_row(uuid)', 'execute'), 'caso 7: authenticated puede ejecutar normalize_staging_row';
  assert not has_function_privilege('anon', 'matches_mother_keyword(text, text)', 'execute'), 'caso 7: anon puede ejecutar matches_mother_keyword';
  assert not has_function_privilege('authenticated', 'matches_mother_keyword(text, text)', 'execute'), 'caso 7: authenticated puede ejecutar matches_mother_keyword';

  raise notice '045: todos los casos pasaron';
end $$;

rollback;
