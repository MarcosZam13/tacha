-- ============================================================================
-- SCRUM-134: lo que la base tiene antes de 001 y schema.sql no trae
--
-- schema.sql es la línea base del catálogo, pero en agosto se aplicó por el
-- MCP la entrada "fix_advisor_warnings_policies_and_indexes" (20260828051451)
-- y sus índices nunca pasaron al repo. Estos seis índices ya existen en la
-- base compartida; el archivo existe para que una base nueva quede igual.
--
-- Las políticas "temp insert/update/delete household_store_preferences" de
-- esa misma entrada no se copian: 009 las borra.
-- ============================================================================

-- Índices para las FK que señaló el advisor de performance (unindexed_foreign_keys)
create index if not exists idx_household_store_prefs_store
  on household_store_preferences(store_id);

create index if not exists idx_staging_matched_variant
  on product_catalog_staging(matched_variant_id);

create index if not exists idx_staging_matched_brand
  on product_catalog_staging(matched_brand_id);

create index if not exists idx_prices_brand
  on product_prices(product_brand_id);

create index if not exists idx_prices_store
  on product_prices(store_id);

create index if not exists idx_search_log_store
  on search_log(store_id);
