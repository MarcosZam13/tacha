-- ============================================================================
-- SCRUM-131: hardening de seguridad, continuación de la migración 020.
--
-- La 020 revocó insert/update/delete/truncate de anon/authenticated en las
-- tablas de catálogo (categories, stores, product_catalog,
-- product_catalog_variants, product_brands, product_catalog_staging,
-- product_prices), pero se quedaron afuera search_cache y search_log por un
-- error de alcance al verificar los permisos reales (la consulta de
-- verificación de SPEC §2 no las incluyó). Como la 020 ya está aplicada y
-- registrada en supabase_migrations.schema_migrations, no se edita (regla de
-- supabase/README.md §Migraciones, punto 4) — se corrige con esta migración
-- nueva.
--
-- Mismo hallazgo que motivó la 020: anon y authenticated tenían hoy
-- insert/update/delete/truncate por defecto (grant de Supabase en tablas
-- nuevas) en search_cache y search_log. RLS ya bloqueaba select/insert/
-- update/delete porque ninguna de las dos tiene ninguna política (ver
-- schema.sql, línea ~223: "search_cache y search_log NO son de lectura/
-- escritura pública... solo la Edge Function (con service_role) los toca.
-- Sin políticas -> bloqueados por RLS. Esto es intencional, no un bug") —
-- pero TRUNCATE no lo cubre RLS, igual que en las otras 7 tablas.
--
-- Verificado antes de escribir esta migración (consulta de solo lectura,
-- 2026-10-10): ninguna Edge Function ni RPC del repo escribe a estas tablas
-- como anon/authenticated — solo las toca el pipeline de scraping con
-- service_role, que no pasa por estos grants. Revocar no rompe nada.
-- ============================================================================

revoke insert, update, delete, truncate on search_cache, search_log
  from anon, authenticated;
