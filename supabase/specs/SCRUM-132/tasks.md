# Tasks — SCRUM-132

Ver [SPEC.md](SPEC.md) y [plan.md](plan.md). Orden sugerido; cada tarea termina en un punto de validación.

- [x] **0. Confirmar que SCRUM-130 ya está desplegado** (prerequisito duro) antes de escribir una sola línea — sin esto el script no puede ni probarse contra la base real.
  - Confirmado 2026-11-01/02: las 3 `ingest-*` ya exigen `Authorization: Bearer <service_role_key>` desde el redeploy de SCRUM-130 (403 sin esa key), aunque su PR siga en `waiting qa` sin mergear — no bloquea empezar.
- [x] **1. Resolver el gap de datos de SPEC §2.3** (madres faltantes: Huevo, Pan, Frijol, Azúcar, Aceite, Café, Pollo) — como PR de datos aparte, mismo criterio de evidencia real que SCRUM-131 §3, o confirmar explícitamente con Daniel que la primera corrida se hace solo con las 12 madres actuales y el criterio de Jira se actualiza.
  - Decidido con Daniel 2026-11-02: la primera corrida real de este ticket se hace solo con las 12 madres actuales (incluye Arroz). El criterio de aceptación de Jira queda parcial (1 de 8 términos con resultado) hasta que un PR de datos aparte agregue las 7 madres faltantes — documentar esto explícitamente en el PR antes de pasar a QA.
- [x] **2. Escribir `scripts/monthly-ingestion.ts`** (plan.md §2), probando primero contra 1-2 términos sueltos, no el batch completo.
  - Validación: `npx tsc --noEmit` sin errores; corrida de prueba con 1-2 términos produce filas de staging correctas.
  - Confirmado 2026-11-02: `tsc --noEmit` limpio; corrida real `--limit=1` contra la base compartida terminó el ciclo completo (ingesta → normalización → recorte) sin errores.
- [x] **3. Implementar el recorte de `raw_json`** (plan.md §3) y confirmar que nunca toca filas `pending`.
  - Confirmado 2026-11-02: corrida `--limit=1` recortó 248 filas (matched/rejected) y el storage de `raw_json` bajó de ~3.57 MB/100 filas a ~0.08 MB/250 filas; las `pending` no se tocaron.
- [ ] **4. Implementar el dedupe por `itemId`** (plan.md §4) y confirmarlo con un caso real o sintético.
  - Implementado y corrido 2026-11-02 (0 duplicados en la corrida `--limit=1`, consistente con pedir solo 1 término) — falta un caso real con duplicado efectivo antes de marcarla hecha.
- [ ] **5. Documentar el script en `supabase/README.md`**: ubicación, variable de entorno requerida, qué escribe, cómo correrlo.
- [ ] **6. Corrida de prueba completa en modo lectura/rollback** si es posible aislar el batch de esa forma, o con un subconjunto chico de madres primero — nunca la corrida completa como primera prueba contra la base compartida.
- [ ] **7. Primera corrida real** — autorización explícita de Daniel, aviso al grupo el día antes (SPEC §7). Pendiente además: SCRUM-139 (desempate de categoría ancha en `normalize_staging_row`) resuelto primero — la corrida de prueba `--limit=1` del 2026-11-02 ya mostró en "Lista general" variantes de otras madres mezcladas en una búsqueda, consistente con ese bug (ver `to-do.md`).
  - Validación: búsqueda de "Arroz" devuelve resultado correcto (único término con madre curada hoy — criterio de Jira queda parcial, 1 de 8, hasta el PR de datos aparte); reporte de `raw_json` antes/después.
- [ ] **8. Subagentes de revisión** antes de QA: `code-reviewer`, `security-reviewer` (obligatorio — maneja la service role key en un script cliente).
- [ ] **9. Completar la PR:** descripción con la plantilla del repo, Developer Notes con el aviso del equipo (SPEC §7), label `in progress` → `waiting qa`, mover la tarjeta de Jira.
