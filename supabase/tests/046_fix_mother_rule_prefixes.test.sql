-- ============================================================================
-- Prueba de la migración 046 (SCRUM-132): prefijos de categoría de
-- "Repostería" y "Leche de coco" alineados con las categorías reales de VTEX.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas), después
-- de aplicar 046. Todo pasa dentro de una transacción que termina en
-- rollback: no deja filas de staging, variantes, marcas ni precios de prueba
-- en la base compartida (mismo patrón que
-- supabase/tests/045_harden_normalize_staging_row.test.sql). Usa las reglas
-- reales y un store real (maxipali) solo para el FK.
--
-- Casos (categorías tomadas de la corrida real del 2026-11-13):
--   1. Las dos reglas tienen el prefijo nuevo.
--   2. "Leche De Coco Goya Lata" bajo ".../Licores/Brandy/" → "Leche de coco".
--   3. Un licor sin "coco" bajo el mismo prefijo → pending (el keyword sigue
--      siendo obligatorio, migración 045).
--   4. "Repostería Jomar orejitas" bajo "/Panadería y Tortillería/..."
--      (T mayúscula, como la manda VTEX) → "Repostería".
--
-- Ejecutarlo completo, nunca por partes: sin el begin/rollback quedarían los
-- datos de prueba en la base compartida.
-- ============================================================================

begin;

do $$
declare
  v_store_id uuid;
  v_coco uuid;
  v_reposteria uuid;
  v_id uuid;
  v_result record;
  v_status text;
  c_cat_brandy constant jsonb := '["/Cervezas, Vinos y Licores/Licores/Brandy/", "/Cervezas, Vinos y Licores/Licores/", "/Cervezas, Vinos y Licores/"]';
  c_cat_pasteleria constant jsonb := '["/Panadería y Tortillería/Repostería y Pastelería/Pasteles, Tartas y Pays/", "/Panadería y Tortillería/Repostería y Pastelería/", "/Panadería y Tortillería/"]';
begin
  select id into v_store_id from stores where slug = 'maxipali';
  select pc.id into v_coco from product_catalog pc join product_mother_rules r on r.product_catalog_id = pc.id where pc.name = 'Leche de coco';
  select pc.id into v_reposteria from product_catalog pc join product_mother_rules r on r.product_catalog_id = pc.id where pc.name = 'Repostería';

  -- 1. Prefijos nuevos.
  assert (select vtex_category_prefix from product_mother_rules where product_catalog_id = v_coco) = '/Cervezas, Vinos y Licores/Licores/Brandy/',
    'caso 1: prefijo de "Leche de coco" sin actualizar';
  assert (select vtex_category_prefix from product_mother_rules where product_catalog_id = v_reposteria) = '/Panadería y Tortillería/Repostería y Pastelería/',
    'caso 1: prefijo de "Repostería" sin actualizar';

  -- 2. Leche de coco real.
  insert into product_catalog_staging (store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (v_store_id, jsonb_build_object('product', jsonb_build_object('categories', c_cat_brandy), 'offer', '{"Price": 1500, "IsAvailable": true}'::jsonb),
          'Leche De Coco Goya Lata T46', 'Goya', '400ml', 'pending')
  returning id into v_id;
  select * into v_result from normalize_staging_row(v_id);
  assert v_result.success and v_result.product_catalog_id = v_coco, 'caso 2: esperaba "Leche de coco"';

  -- 3. Licor sin keyword bajo el mismo prefijo.
  insert into product_catalog_staging (store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (v_store_id, jsonb_build_object('product', jsonb_build_object('categories', c_cat_brandy), 'offer', '{"Price": 9000, "IsAvailable": true}'::jsonb),
          'Brandy Prueba T46', 'Prueba', '750ml', 'pending')
  returning id into v_id;
  select * into v_result from normalize_staging_row(v_id);
  select status into v_status from product_catalog_staging where id = v_id;
  assert v_status = 'pending', format('caso 3: esperaba pending, quedó %s', v_status);

  -- 4. Repostería con la T mayúscula de VTEX.
  insert into product_catalog_staging (store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status)
  values (v_store_id, jsonb_build_object('product', jsonb_build_object('categories', c_cat_pasteleria), 'offer', '{"Price": 1200, "IsAvailable": true}'::jsonb),
          'Repostería Jomar orejitas T46', 'Jomar', '135 g', 'pending')
  returning id into v_id;
  select * into v_result from normalize_staging_row(v_id);
  assert v_result.success and v_result.product_catalog_id = v_reposteria, 'caso 4: esperaba "Repostería"';

  raise notice '046: todos los casos pasaron';
end $$;

rollback;
