# Tasks — SCRUM-130

Ver [SPEC.md](SPEC.md) y [plan.md](plan.md). Orden sugerido; cada tarea termina en un punto de validación.

- [x] **1. Leer los 3 `index.ts` completos** (`ingest-maxipali`, `ingest-walmart`, `ingest-masxmenos`) para confirmar que tienen exactamente la misma forma antes de tocar nada (criterio de aceptación: "verificado leyendo los 3 completos").
  - Validación: forma idéntica confirmada (SPEC §2) o diferencias documentadas acá si aparece alguna.
- [x] **2. Escribir `supabase/functions/_shared/requireServiceRole.ts`** (plan.md §2).
  - Validación: `npx tsc --noEmit` sin errores (Daniel lo corre, pendiente de confirmar salida).
- [x] **3. Agregar el chequeo a las 3 `index.ts`** (plan.md §2), un `import` + 2 líneas al inicio de cada `Deno.serve`, sin tocar el resto de la lógica.
  - Validación: diff mínimo en cada archivo, mismo bloque literal en los 3.
- [x] **4. Coordinar con el equipo el número de migración** — siguiente libre confirmado contra la base real (039, no el que asumiría el repo). (ver `administracion.md`) y escribir `supabase/migrations/0NN_drop_get_recent_staging.sql` (plan.md §3).
- [x] **5. Probar la migración con `begin...rollback`** contra la base real, confirmando que nada más depende de `get_recent_staging` antes de aplicarla en serio — hecha por Daniel junto con el paso 6.
- [x] **6. Aplicar la migración en serio** — autorización explícita de Daniel y aviso al grupo antes de correrla.
  - Validación: `select version, name from supabase_migrations.schema_migrations order by version;` incluye la fila nueva.
- [x] **7. Borrar `search-products` v3 del proyecto de Supabase** — autorización explícita de Daniel. Borrada por Daniel (confirmado: ya no aparece en `list_edge_functions`).
  - Validación: no aparece en `supabase functions list`.
- [x] **8. Eliminar `app/(debug)/debug/scraping-demo/` y `features/scraping-demo/`** completos (plan.md §5) — incluida la tarjeta "Spec 1" en `app/(debug)/debug/page.tsx` que enlazaba a la demo.
  - Validación: `grep -rn "scraping-demo" app/ features/ components/` sin resultados; `npx tsc --noEmit` sin errores de import roto.
- [x] **9. Actualizar `supabase/README.md`** (sección de `ingest-*` y Postman, plan.md §6).
- [x] **10. Redeploy de las 3 Edge Functions** — autorización explícita de Daniel antes de cada deploy. Las 3 quedaron en v3.
  - Validación: request con anon key → 403; request con service role key → mismo contrato de respuesta de antes, probado contra los 3 súpers.
- [x] **11. Subagentes de revisión** antes de QA: `code-reviewer` (el chequeo compartido, el diff de las 3 funciones), `security-reviewer` (obligatorio — toca Edge Functions y variables de entorno). Sin hallazgos.
- [x] **12. Completar la PR:** descripción con la plantilla del repo, Developer Notes con el aviso del equipo (SPEC §6), label `in progress` → `waiting qa` — hecho por Daniel. **Pendiente de confirmar**: si la tarjeta de Jira ya se movió a "Waiting QA" (seguía en "In Progress" en la última lectura).
