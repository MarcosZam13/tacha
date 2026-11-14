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
- [x] **10. Corregir los datos que dejó la primera corrida completa** (hallazgo de QA del 2026-11-13 en la #82: precios de ₡0, una presentación de 2838 L y productos que no son leche en "Leche").
  - **Auditoría de las 12 madres:**
    - Había productos ajenos en casi todas. Por ejemplo, en "Crema de leche" ~22 de 28 variantes eran levadura, harinas y mezclas, y en "Leche de coco" 10 de 12 eran shampoo, acondicionador y gomitas "Cocodrilo". En "Leche" entraron productos de pelo y cremas corporales.
    - Además: 43 precios de ₡0 en 8 madres, "1,8 kg" leído como 8 kg y "2838 L".
  - **Causas, en `normalize_staging_row`:**
    1. El respaldo por keyword corría aunque la fila tuviera categoría de otro departamento.
    2. Los keywords se buscaban como substring.
    3. Los prefijos de 3 segmentos no exigían keyword.
    4. Se aceptaban precio 0 y ofertas agotadas.
    5. La coma decimal se leía mal y no había tope de tamaño.
  - **Arreglo:**
    - Migración `045_harden_normalize_staging_row` (aplicada y registrada el 2026-11-13; test `supabase/tests/045_harden_normalize_staging_row.test.sql`, 7 casos, pasa). Agrega `matches_mother_keyword` y suma keywords a "Crema de leche" (+ "crema") y "Repostería" (+ "pastelería").
    - Migración `046_fix_mother_rule_prefixes` (aplicada y registrada; test `supabase/tests/046_fix_mother_rule_prefixes.test.sql`, 4 casos, pasa): el prefijo de "Repostería" tenía "tortillería" en minúscula y nunca matcheaba por categoría; la leche de coco real está en `/Cervezas, Vinos y Licores/Licores/Brandy/`.
    - Recorte de `raw_json` re-normalizable (plan.md §3).
  - **Limpieza** (backup local previo): se borraron las variantes de las madres curadas, salvo las 4 que usan listas de usuarios, y se re-ingestó con la 045.
    - Resultado: 886 matched, 59 rejected, 474 sin madre, 91 duplicados.
    - 0 precios ≤ 0, 0 variantes sin precio y 0 `list_items` huérfanos.
    - La presentación "2838 L" que usaban 2 listas se corrigió a 2838 ml.
  - **Después de aplicar la 046:** se re-normalizaron en el lugar las 476 filas `pending` que tenían el JSON completo y se recortaron al formato nuevo.
    - Resultado final: 229 variantes en las 12 madres, entre ellas "Leche de coco" (2: Goya y Roland) y "Repostería" (13).
    - Staging: 1028 matched / 90 rejected / 398 pending.
    - `raw_json`: 203 kB reales (antes ~17 MB), sin ninguna fila sin recortar.
  - **Aviso para quien corra tests viejos:** `supabase/tests/044_fix_normalize_staging_tiebreak.test.sql`, caso 5, espera que un prefijo de 3 segmentos matchee sin keyword. Desde la 045 eso ya no pasa a propósito: ese test describe la 044, no la función actual.
  - **Fuera de alcance, sin tocar** (documentado en el PR para valorarlo más adelante):
    - **Paquetes:** "6 Pack - 250 ml" se lee como 250 ml y su precio se mezcla con el de la unidad ("Leche — 250 ml": ₡460–₡2 380). La mayoría de los paquetes dicen el total y están bien, así que no se arregla multiplicando.
    - **Búsqueda del catálogo:** no llama a `ensureSession()`. Entrando directo a `/catalogo` sin sesión consulta como `anon` y, desde la 032, no ve nada. Es previo a este ticket.
    - **Madres viejas:** siguen visibles, incluida una "2838 L" vieja. Las retira SCRUM-133.
    - **Keyword `leche`:** "Dulce de Leche La Lechera" sigue en "Leche"; va en un ticket aparte.
    - **Error de tipeo de la tienda:** "Snickers 21. 5 g" quedó en 5 g.
  - **Verificación con Playwright (2026-11-13):** el chip "Lácteos" y la búsqueda "leche" muestran solo productos de cada madre, sin ningún ₡0, y "Leche — 2838 ml" a ₡3 000.
- [ ] **9. Completar la PR:** descripción con la plantilla del repo, Developer Notes con el aviso del equipo (SPEC §7), label `in progress` → `waiting qa`, mover la tarjeta de Jira.
