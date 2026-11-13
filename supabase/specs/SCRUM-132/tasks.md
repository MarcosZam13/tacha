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
- [x] **4. Implementar el dedupe por `itemId`** (plan.md §4) y confirmarlo con un caso real o sintético.
  - Confirmado 2026-11-13 con un caso real: la corrida `--limit=2` (Leche, Leche condensada) borró 9 `itemId` repetidos entre términos y no quedó ningún duplicado. El dedupe vale dentro de una corrida: dos corridas separadas agregan una fila de precio cada una (historial), y `latest_prices` muestra solo la más reciente.
- [x] **5. Documentar el script en `supabase/README.md`**: ubicación, variable de entorno requerida, qué escribe, cómo correrlo.
  - Hecho en la sección «Ingesta mensual del catálogo» de `supabase/README.md`.
- [ ] **6. Corrida de prueba completa en modo lectura/rollback** si es posible aislar el batch de esa forma, o con un subconjunto chico de madres primero — nunca la corrida completa como primera prueba contra la base compartida.
  - 2026-11-13, `--limit=2`: 198 filas nuevas → 188 matched, 5 rejected (accesorios y alfajores), 5 sin madre. Destapó un bug: el loop sobre `normalize_pending_staging` no terminaba mientras hubiera filas sin madre, y con 50 o más acumuladas las filas nuevas no se hubieran normalizado nunca. Arreglado normalizando fila por fila los IDs recién staged (plan.md §1).
  - 2026-11-13, `--limit=3` con el arreglo: Leche evaporada dio 25 filas → 25 matched, en 35 s, sin loop.
- [x] **7. Primera corrida real** — autorización explícita de Daniel, aviso al grupo (SPEC §7). Pendiente además: SCRUM-139 (desempate de categoría ancha en `normalize_staging_row`) resuelto primero — la corrida de prueba `--limit=1` del 2026-11-02 ya mostró en "Lista general" variantes de otras madres mezcladas en una búsqueda, consistente con ese bug (ver [SCRUM-139/SPEC.md](../SCRUM-139/SPEC.md)).
  - SCRUM-139 mergeado a `develop` (PR #96, 2026-11-07); su migración `044` ya corre en la base. Dependencia resuelta.
  - Corrida completa 2026-11-13 (12 madres × 3 tiendas; Leche, Leche condensada y Leche evaporada salieron de la caché de las pruebas): 1158 matched, 29 rejected, 76 sin madre (quedan `pending`) y 15 duplicados borrados. Variantes 134 → 407, marcas 161 → 536, precios 432 → 1590.
  - "Arroz": `search_catalog('arroz')` devuelve 1 producto, "Arroz" (Abarrotes), con 25 variantes.
  - `raw_json`: 1736 filas en staging, ~3.10 MB aproximados como texto (1119 kB reales con `pg_column_size`). Las 1187 filas procesadas quedaron recortadas; lo que pesa son las 83 `pending`, que conservan el JSON completo a propósito. Sin recorte, a ~3.57 MB cada 100 filas, serían ~62 MB.
  - El reporte de storage leía una sola página (tope de 1000 filas de PostgREST). Arreglado leyendo por páginas; confirmado con 1736 filas.
  - Validación: búsqueda de "Arroz" devuelve resultado correcto (único término con madre curada hoy — criterio de Jira queda parcial, 1 de 8, hasta el PR de datos aparte); reporte de `raw_json` antes/después. Cumplida el 2026-11-13 (ver abajo). El criterio de Jira sigue parcial (1 de 8) hasta que un PR de datos aparte agregue las 7 madres faltantes.
- [x] **8. Subagentes de revisión** antes de QA: `code-reviewer`, `security-reviewer` (obligatorio — maneja la service role key en un script cliente).
  - 2026-11-13: ninguno encontró algo bloqueante. Aplicado: el recorte quedó acotado a los ids del término; la key se valida como `sb_secret_` y la URL como `https://*.supabase.co`; la respuesta de `ingest-*` se valida con zod; el cuerpo de error se trunca; constantes para la tabla y los estados; `.env.example` y README actualizados ("una sola corrida a la vez").
  - Queda como deuda: que `ingest-*` devuelva los ids insertados (el dedupe dejaría de depender de "las últimas N pending") y un reporte de storage con `pg_column_size` en la base.
- [ ] **9. Completar la PR:** descripción con la plantilla del repo, Developer Notes con el aviso del equipo (SPEC §7), label `in progress` → `waiting qa`, mover la tarjeta de Jira.
