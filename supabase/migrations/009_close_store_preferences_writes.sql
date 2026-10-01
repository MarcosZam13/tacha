-- ============================================================================
-- SCRUM-123 (QA del entregable 1): cerrar la escritura pública de
-- household_store_preferences.
--
-- Las políticas temporales de escritura usaban using (true) / with check
-- (true) para el rol public: con la anon key, que va en el bundle del
-- frontend, cualquiera podía cambiar o borrar las preferencias de tiendas de
-- cualquier household. La deuda estaba documentada en
-- docs/catalogo-scraping/TICKET-seguridad-household-store-preferences.md como
-- "no debe llegar a producción", y main es lo que se entrega.
--
-- Todavía no existe household_members para filtrar por membresía, así que la
-- escritura queda cerrada (RLS sin política = nadie escribe desde el cliente).
-- Cuando el módulo households la cree, se agrega la política por membresía
-- que describe ese documento.
--
-- La lectura se mantiene: solo dice qué tiendas muestra un household y
-- search_catalog la usa para filtrar resultados.
--
-- En la base hay dos variantes de las políticas temporales (schema.sql creaba
-- una "temp write" para all; la base real tiene insert, update y delete por
-- separado), por eso se borran todas con if exists.
-- ============================================================================

drop policy if exists "temp write household_store_preferences" on public.household_store_preferences;
drop policy if exists "temp insert household_store_preferences" on public.household_store_preferences;
drop policy if exists "temp update household_store_preferences" on public.household_store_preferences;
drop policy if exists "temp delete household_store_preferences" on public.household_store_preferences;
