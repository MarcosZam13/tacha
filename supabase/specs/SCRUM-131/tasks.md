# Tasks — SCRUM-131

Ver [SPEC.md](SPEC.md) y [plan.md](plan.md). Orden sugerido; cada tarea termina en un punto de validación.

- [x] **1. Escribir `supabase/data/madres.json`** con las 12 madres de SPEC §3 (todas con evidencia real — ninguna especulativa).
  - Validación: cada madre tiene al menos 1 fila de staging real o 1 ingrediente de receta/lista que la justifica (ya verificado en SPEC §3); "Leche De Magnesia Phillips" no matchea ninguna y queda `pending`, a propósito. Confirmado tras aplicar: sigue `pending`.
- [x] **2. Escribir `scripts/generate-madres-migration.ts`** (lee JSON, valida con Zod, imprime el bloque SQL de seed).
  - Validación: `npx tsc --noEmit` sin errores; correrlo imprime SQL válido. Se corrigió un bug de resolución de ruta en Windows (`.pathname` duplicaba la unidad `C:\`) usando `fileURLToPath` de `node:url`.
- [x] **3. Escribir `supabase/migrations/020_curated_mothers.sql`** completo: DDL de `product_mother_rules`, seed (pegado del script), `normalize_staging_row` reescrita con el orden de señales de SPEC §6, hardening de `search_path`/`revoke` (plan.md §4).
  - Validación: el archivo es SQL válido de punta a punta. Se corrigió un error de sintaxis real (`comment on function ... is '...' || '...'` — `COMMENT ON FUNCTION` solo acepta un literal, no concatenación) antes de aplicar en serio.
- [x] **4. Probar con `begin...rollback`** contra la base real (plan.md §5), ajustando `madres.json` hasta que el reporte de matched/pending se vea razonable y no haya asignaciones obviamente mal hechas.
  - Validación: reporte pegado en el PR; Daniel revisó la muestra de asignaciones antes de aplicar la migración en serio.
- [x] **5. Escribir `supabase/tests/020_curated_mothers.test.sql`** (mismo patrón que `015`/`017`): casos — una fila con keyword ambiguo pero categoría clara matchea la madre correcta; una fila sin ninguna regla queda `pending`; correr el normalizador dos veces no duplica nada.
- [x] **6. Aplicar la migración en serio** (con autorización explícita y aviso al grupo — ya enviado): `begin`, contenido del archivo, `insert` en `supabase_migrations.schema_migrations`, `commit`.
  - Validación: `select version, name from supabase_migrations.schema_migrations order by version;` incluye `020` y `021` (ver nota abajo).
  - **Nota (021):** al revisar el alcance del hardening (plan.md §4) contra la base real se encontró que `search_cache`/`search_log` quedaron fuera del `revoke` de la 020 por un error de alcance en la consulta de verificación. Como la 020 ya estaba aplicada y registrada, no se edita (regla de `supabase/README.md` §Migraciones) — se corrigió con `supabase/migrations/021_harden_search_cache_log.sql`, probada con `begin...rollback` y aplicada en serio el 2026-10-10.
  - **Batch real sobre las 50 filas `pending`:** `normalize_pending_staging(100)` → 48 matched, 2 rejected (no por la lógica de madres curadas — por tamaños que `parse_size_text` no reconoce: `gr`, `uds`, `gal`, ruido de scraping `grea`). Documentado y fuera de alcance de este ticket — ver SCRUM-138.
- [x] **7. Actualizar la PR:** descripción completa (ya no parcial), Developer Notes con el aviso del equipo (SPEC §9), label `in progress` → `waiting qa` cuando todo lo anterior esté hecho.
- [ ] **8. Subagentes de revisión** antes de QA: `code-reviewer` (la función plpgsql y el script), `security-reviewer` (RLS de la tabla nueva, los `revoke`, `search_path`).
  - **Omitido en este PR por decisión explícita de Daniel** (2026-10-10) — se salta directo a QA humano.
