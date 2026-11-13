# Tasks: Finanzas — dashboard de gasto por periodo e historial de compras

El qué está en [SPEC.md](SPEC.md) y el cómo en [plan.md](plan.md).

## SCRUM-69: ver gasto total por periodo

Cada etapa termina en un commit que compila por sí solo y se revisa y aprueba antes de seguir. El PR se abre con el commit de la etapa 1 y queda en `in progress` hasta el final.

### Etapa 0 — Decisiones

- [x] 0.1 Decisiones de la dueña de la historia (2026-10-18):
  - D1, opción A: presupuestos diario, semanal y mensual guardados en la base;
  - D2: periodo en curso, Semana por defecto, semana de lunes a domingo;
  - D3: solo compras cerradas, con las sin total aparte;
  - D4: solo el gasto propio;
  - D5: sin sub-tabs hasta Historial;
  - D6: solo cuentas registradas y autenticadas;
  - sin cambios en `shopping-list`;
  - E2E si la infraestructura lo permite.

  Ver SPEC §5 y plan, "Pruebas".
- [x] 0.2 Alcance del E2E (2026-10-19): sesión de cuenta registrada simulada y respuestas de Supabase simuladas.
  - Validan la interfaz, **no** la autenticación real ni la seguridad de la base.
  - Lo real lo cubren la prueba SQL (anónimos y aislamiento entre usuarios) y las pruebas manuales (acceso con cuenta registrada y sesión anónima).
  - El E2E con autenticación real queda como mejora futura (plan, "Pruebas").

### Etapa 1 — Specs (commit `docs`)

- [x] 1.1 Crear `features/finance/specs/SPEC.md` (15 secciones), `plan.md` y `tasks.md`, y la línea de §4.2.1 en `docs/documento-proyecto.md`.
- [ ] 1.2 Revisión y aprobación de la documentación.
- [ ] 1.3 Commit `docs(SCRUM-69): add spending by period planning`, push y abrir el PR hacia `develop` con label `in progress`.

### Etapa 2 — Presupuestos en la base (commits `feat`)

- [x] 2.1 Verificar que `027` siga libre en `develop` y en los PRs abiertos; si no, usar el siguiente libre. Verificado el 2026-10-19 en `develop`, en todas las ramas remotas y en los PRs abiertos (#65, #66, #68, #69).
- [x] 2.2 Escribir la migración de presupuestos (tabla, RLS de dueño registrado, permisos por columna y `set_spending_budget`) y su prueba SQL, con los casos de anónimos y de otro usuario: `supabase/migrations/027_spending_budgets.sql` y `supabase/tests/027_spending_budgets.test.sql`.
- [x] 2.3 Revisión con `security-reviewer`; aprobación; commit.
  - `security-reviewer` (2026-10-19): sin hallazgos críticos, altos ni medios. El bajo 1 se corrigió: `amount` es `numeric` sin precisión, para no redondear en silencio. Los casos que señaló se agregaron a la prueba.
  - Commits `fd74fdf` (migración y prueba) y `572ab1b` (tipos y §6).
- [x] 2.4 La dueña de la historia:
  - la aplica en una transacción con su fila del historial;
  - corre la prueba SQL;
  - comprueba los permisos efectivos;
  - comprueba que una sesión anónima real lleva `is_anonymous: true` en el JWT.

  Hecho (2026-10-19):
  - aplicada en Supabase con su fila del historial;
  - la prueba SQL completa terminó en `ok` (su paso 1 comprueba los permisos efectivos de la tabla, de las columnas y de la RPC);
  - el JWT de una sesión anónima real trae `role: "authenticated"` e `is_anonymous: true`, y el usuario de la sesión `is_anonymous: true`.
- [x] 2.5 `spending_budgets` y `set_spending_budget` en `types/database.types.ts`, comparados con la base; `documento-proyecto.md` §6. Comparados el 2026-10-19 con la base real, y coinciden:
  - tabla: `amount numeric not null`, `owner_id uuid not null default auth.uid()`, `period text not null`;
  - función: `set_spending_budget(budget_period text, budget_amount numeric)`, que devuelve `spending_budgets`.

### Etapa 3 — Funciones puras (commit `feat`)

- [x] 3.1 `getPeriodBounds`, `summarizeSpending`, `parseBudgetAmount`, `formatPeriodRange` y `formatColones` en `features/finance/utils/`, con sus tests (casos de plan, "Pruebas"). Con ellos: `constants/finance.constants.ts` (periodos, semana, monto y formato de fechas) y los modelos `PeriodBounds` y `PeriodSpending`.

### Etapa 4 — Servicio (commit `feat`)

- [x] 4.1 Constantes del servicio (`FINANCE_DB`), el modelo `SpendingBudgets` y `finance.service.ts`, con sus tests (`tests/finance.service.test.ts`):
  - `hasRegisteredSession`, sin crear sesiones;
  - `getPeriodSpending`;
  - `getSpendingBudgets`;
  - `setSpendingBudget`.

### Etapa 5 — ViewModel (commit `feat`)

- [x] 5.1 Constantes del flujo, `usePeriodSpending`, `useSpendingBudgets` y `useFinanceDashboardViewModel` (con `noAccount` sin llamadas de datos), con sus tests. Constantes: `FINANCE_ACCESS_STATUS`, `SPENDING_STATUS`, `BUDGET_STATUS`, `FINANCE_TEXT` y los textos por periodo.

### Etapa 6 — Plan E2E (commit `docs`)

- [x] 6.1 `features/finance/specs/E2E.md` (skill `playwright-e2e`):
  - E2E-FIN-01 a E2E-FIN-04, con sus precondiciones y las respuestas simuladas de cada uno;
  - la aclaración de que validan la interfaz y no la autenticación real ni la base.

### Etapa 7 — Pantalla (commit `feat`)

- [x] 7.1 `FinanceNoAccount`, `SpendingPeriodSelector`, `SpendingTotal`, `SpendingBudget` y sus props, con sus tests de componente (`tests/FinanceComponents.test.tsx` y el Page Object `tests/FinanceDashboard.page.ts`).
- [x] 7.2 `FinanceDashboard`, `app/(app)/finanzas/page.tsx`, `APP_ROUTE.FINANCE` y el ítem "Finanzas" en la navegación, con los tests de la pantalla completa (`tests/FinanceDashboard.test.tsx`).
- [x] 7.3 Page Object y tests (jsdom): `tests/FinanceDashboard.page.ts`, `tests/FinanceComponents.test.tsx` y `tests/FinanceDashboard.test.tsx`. Cubren la fila «Pantalla» de plan, «Pruebas»: sin cuenta, CA-01, CA-02, CA-03 (definir, editar y la diferencia en palabras), vacío, errores separados, foco y `aria-*`.
- [x] 7.4 `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` (2026-10-19): los cuatro sin errores; Vitest completo, 883 tests en 94 archivos; el build genera `/finanzas`.

### Etapa 8 — E2E (commit `test`)

- [x] 8.1 Preparar el entorno local: `.env.local` con las dos variables de Supabase y Chromium (`npx playwright install chromium`). Hecho el 2026-10-19: `.env.local` con las dos variables; Chromium y ffmpeg de Playwright instalados.
- [x] 8.2 `e2e/features/finance/finance.spec.ts` y sus helpers, con `signInAsFakeUser` y respuestas simuladas por ruta; `npx playwright test e2e/features/finance` en `chromium` y `mobile-chrome`.
  - E2E-FIN-01 a 04: 6 tests, cada uno en `chromium` y `mobile-chrome`.
  - Con la configuración del repo y el Chromium de Playwright (2026-10-19): **12 de 12** en 15,9 s. Antes también pasaron 12 de 12 dos veces en Edge, mientras faltaba Chromium.
  - Se confirmó que supabase-js manda `select=period,amount` (borra los espacios del `select`).
  - Validan la interfaz con sesión y respuestas simuladas, no la autenticación real ni la base (`E2E.md`).

### Etapa 9 — QA y cierre

- [ ] 9.1 Pruebas manuales (plan, "Pruebas"):
  - acceso real: iniciar sesión con una cuenta registrada y recorrer CA-01 a CA-03 contra la base, con los tres presupuestos;
  - D6: con una sesión anónima real, `/finanzas` muestra el aviso y no hay llamadas a `purchase_sessions` ni a `spending_budgets` en la pestaña de red;
  - D4 con dos cuentas registradas de la misma familia;
  - capturas sin correos.

  Revisado por la dueña de la historia, con cinco capturas de `/finanzas` con una cuenta registrada (2026-10-19):

  | Captura | Periodo | Gasto | Compras | Sin total | Presupuesto | Diferencia |
  |---|---|---|---|---|---|---|
  | 1 | Día, sin gasto | ₡0 | 0 | 0 | — | — |
  | 2 | Semana, sin gasto | ₡0 | 0 | 0 | — | — |
  | 3 | Mes, sin gasto | ₡0 | 0 | 0 | — | — |
  | 4 | Semana | — | — | — | Semanal ₡10 000 | Te quedan ₡10 000 |
  | 5 | Día, con gasto | ₡2 210 | — | — | Diario ₡5 000 | Te quedan ₡2 790 |
- [ ] 9.2 `docs/documento-proyecto.md` §4.2 y marcar SPEC §13 solo con lo validado.
- [ ] 9.3 `code-reviewer`, `security-reviewer` y `qa-checker`.
- [ ] 9.4 Descripción del PR con la evidencia (Vitest, SQL, E2E y manual), `waiting qa` y Jira.

### Fuera de esta historia

- [ ] Desgloses (HU-38 a HU-42), historial (HU-59 a HU-62) y aviso de precios (HU-43).
- [ ] Presupuesto calculado desde los precios de la lista (documento-proyecto §4.2.1).
- [ ] Unificar la validación de montos con la de "Total gastado" del modo compra.
- [ ] E2E en CI (decisión del equipo sobre una base de pruebas).
- [ ] Mejora futura: E2E con autenticación real (cuentas de prueba, credenciales solo en `.env.local`, verificar la protección con captcha de Auth y un helper de sesión en `e2e/support/`).
- [ ] Cualquier refactor de `features/shopping-list/`.

## SCRUM-90: ver historial de sesiones de compra

Cada etapa termina en un commit que compila por sí solo y se revisa y aprueba antes de seguir.

### Etapa 0 — Decisiones y specs

- [x] 0.1 Decisiones de la dueña de la historia (2026-10-31): D7, solo el periodo en curso; D8, "Sin total" y ₡0 distintos; D9, cada tab arranca en Semana. SPEC §5.
- [x] 0.2 `SPEC.md`, `plan.md`, `tasks.md` y `E2E.md`, sección SCRUM-90.
- [x] 0.3 Revisión y aprobación de la documentación: aprobada por la dueña de la historia (2026-10-31).
- [ ] 0.4 Commit `docs(SCRUM-90): add purchase history planning`, push y abrir el PR hacia `develop` con label `in progress`; SCRUM-90 a In Progress en Jira. Hecho: commit `cab8019` y PR #87 con `in progress`. Falta confirmar la tarjeta en Jira.

### Etapa 1 — Datos

- [x] 1.1 `PeriodPurchase`, constantes (`FINANCE_DB`, textos) y `getPeriodPurchases`, con sus tests.

### Etapa 2 — Lógica

- [x] 2.1 Extraer `useFinanceAccess` de `useFinanceDashboardViewModel`, sin cambiar su comportamiento, con sus tests.
- [x] 2.2 `formatDay`, `usePeriodPurchases` y `usePurchaseHistoryViewModel`, con sus tests.

### Etapa 3 — Pantalla

- [x] 3.1 `FinanceTabs` y `APP_ROUTE.FINANCE_HISTORY`; la barra en `FinanceDashboard`.
- [x] 3.2 `PurchaseSessionRow`, `PurchaseHistory` (con `PriceDisclaimer`) y `app/(app)/finanzas/historial/page.tsx`, con Page Object y tests.

### Etapa 4 — E2E

- [x] 4.1 `e2e/features/finance/purchase-history.spec.ts` y helpers (E2E-FIN-05 a 08), y ajustar E2E-FIN-01; correr `npx playwright test e2e/features/finance` en `chromium` y `mobile-chrome`.

### Etapa 5 — QA y cierre

- [x] 5.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` y `git diff --check`. Sobre `206df86` (2026-11-01):
  - `tsc` y lint sin errores; Vitest, 1290 tests en 137 archivos;
  - E2E de Finanzas, 26 de 26 en `chromium` y `mobile-chrome`;
  - el build pasó en el check `lint-and-build` del CI.
- [ ] 5.2 Pruebas manuales de SPEC §13, con capturas sin correos. Parcial.
  - Informado por la dueña de la historia: CA-01 (fecha, supermercado y monto), orden, CA-02 (Día, Semana y Mes filtran y actualizan el total) y el total coincide con los montos.
  - No ejecutado: total nulo y ₡0 con datos reales, carga, vacío, error y reintento, sin sesión, sesión anónima real, D4 con dos cuentas, mobile, teclado, diseño en desktop y capturas.
- [x] 5.3 Marcar SPEC §13 solo con lo validado; `documento-proyecto.md` §4.6.
- [x] 5.4 `code-reviewer`, `security-reviewer` y `qa-checker` (2026-11-01), sobre `206df86`: sin defectos de código ni hallazgos críticos, altos o medios de seguridad. `qa-checker` señala como pendientes de evidencia manual D4 (alta), la sesión anónima real (media), y teclado y mobile (media).
- [ ] 5.5 Descripción del PR con la evidencia, `waiting qa` y Jira.

### Fuera de esta historia

- [ ] El aviso de precios en el Dashboard (tarea 4.1 de SCRUM-75).
- [ ] Periodos anteriores.
- [ ] Productos de cada compra.
- [ ] Editar totales (HU-60), badge y recordatorio (HU-61) y filtros (HU-62).
- [ ] Deuda de SCRUM-69: `getPeriodSpending` puede sumar un resultado cortado por el servidor, sin avisar (plan, "Deuda de SCRUM-69").

## SCRUM-91: editar el total de una sesión o periodo

Cada etapa termina en un commit que compila por sí solo y se revisa y aprueba antes de seguir.

### Etapa 0 — Decisiones y specs

- [x] 0.1 Decisiones de la dueña de la historia (2026-11-02): D10 a D22, SPEC §5.
- [x] 0.2 `SPEC.md`, `plan.md`, `tasks.md` y `E2E.md`, sección SCRUM-91.
- [ ] 0.3 Revisión y aprobación de la documentación.
- [ ] 0.4 Commit `docs(SCRUM-91): add total editing planning`, push y abrir el PR hacia `develop` con label `in progress`; SCRUM-91 a In Progress en Jira.

### Etapa 1 — Base

- [x] 1.1 Verificar el número libre en `develop` y en los PRs abiertos. Verificado el 2026-11-03: `040`, el reservado para esta historia, no choca con ningún archivo (`develop` tiene `039` y `042`; las ramas abiertas `037`, `038` y `041`).
- [x] 1.2 Migración (trigger, tablas, índice, RLS, funciones internas y cinco RPC, con `get_period_finance`) y sus pruebas SQL: `supabase/migrations/040_edit_purchase_totals.sql`, `supabase/tests/040_edit_purchase_totals.test.sql` y `supabase/tests/040_time_zone_sweep.test.sql`. Pasaron en un PostgreSQL 17.5 local con `016`, `018` y `040` reales. El barrido no se corrió contra la base: tarda unos 2 minutos.
- [x] 1.3 Revisión con `security-reviewer`; aprobación; commit `b101369`.
- [x] 1.4 Aplicada el 2026-11-03 por la dueña de la historia, con su fila `040` en el historial; las tablas, el índice y las cinco RPC existen. La prueba SQL corrió completa en el SQL Editor y terminó en `set_config = ok`, su última sentencia antes del `rollback`: no la alcanza si algún `assert` falla.
- [ ] 1.5 Tipos en `types/database.types.ts`, comparados con la base; `documento-proyecto.md` §6. Tipos escritos según la migración (commit `b101369`) y §6 actualizada; falta compararlos con los que genera Supabase desde la base.

### Etapa 2 — Lectura y consistencia

- [x] 2.1 Renombrar `parseBudgetAmount` y `BUDGET_AMOUNT` a `parseColonesAmount` y `COLONES_AMOUNT`, sin cambiar su comportamiento.
- [x] 2.2 `PeriodAdjustment`, constantes, el mapeo de los ajustes de `get_period_finance` y `summarizeSpending`, con sus tests. El adapter es `toPeriodFinance`; el servicio todavía no llama a la RPC (2.3).
- [x] 2.3 Lectura con `get_period_finance` (SPEC §12, ya en la `040`): `usePeriodSpending` y `usePeriodPurchases` toman de ahí límites, compras, ajustes y total si hay zona guardada, con fechas en esa zona; sin zona, siguen como hoy; con `TZ002`, piden confirmar. Corrige también D19. Con sus tests. Obligatorio antes de ofrecer la edición (plan, "Riesgos"). Con `TZ002`, los hooks quedan en `failed` sin totales y exponen `needsTimeZoneConfirmation`; el aviso con "Confirmar" es de la 3.2.
- [x] 2.4 `get_period_finance` entra en la `040` (decisión de la dueña de la historia, 2026-11-03).

### Etapa 3 — Lógica de edición

- [x] 3.1 Payload, Response y error tipado; `setPurchaseTotal` y `setPeriodTotal`, con sus tests. `TotalSaveError` lleva el motivo según `error.code` (`TOTAL_SAVE_ERROR_CODE`); un monto inválido es `RangeError` sin llamar a la base.
- [x] 3.2 `useTotalEdit` y `usePurchaseHistoryViewModel`, con sus tests, incluida la confirmación de la zona (SPEC regla 59). También `setSpendingTimeZone` en el servicio; `usePeriodPurchases` aplica lo guardado sin recargar; el ViewModel arma lápices, campo y aviso de `TZ002` con `EditTotalButtonProps` e `InlineTotalEditorProps`, que dibujan los componentes de la 4.1. Las filas de ajuste son de la 5.1.

### Etapa 4 — Compra (CA-01)

- [x] 4.1 `EditTotalButton`, `InlineTotalEditor` y `PurchaseSessionRow`, con Page Object y tests. Se adelantó de la 5.1 el lápiz y el campo del periodo en `SpendingTotal` y `PurchaseHistory`.

### Etapa 5 — Periodo y Dashboard (CA-02 y CA-03)

- [x] 5.1 `SpendingTotal`, `formatSignedColones`, `PeriodAdjustmentRow` y `PurchaseHistory`, con tests. La lista junta compras y ajustes por fecha; cada ajuste dice su nivel ("Total de la semana") y no tiene lápiz. El Historial también muestra el aviso de `TZ002` con "Confirmar" (`TimeZoneConfirmation`).
- [x] 5.2 Test de totales iguales entre pantallas (D19), Dashboard sin lápices (D11) e indicación "Incluye ajustes manuales", sin cambiar "Compras". `FinanceDashboard.test.tsx` y `useFinanceDashboardViewModel.test.ts`; con `TZ002` el Dashboard dice por qué no hay total.

### Etapa 6 — E2E

- [x] 6.1 Ajustar `finance.helpers.ts` (conteo del gasto, ajustes y RPC); confirmar que E2E-FIN-01 a 08 siguen pasando. Sin `get_period_finance` simulada fallaban 8 de los 13; con el helper nuevo pasan los 13 en `chromium` y `mobile-chrome` (2026-11-05).
- [x] 6.2 `e2e/features/finance/edit-totals.spec.ts` (E2E-FIN-09 a 14); correr `npx playwright test e2e/features/finance` en `chromium` y `mobile-chrome`. 2026-11-05: 40 de 40 (20 escenarios en los dos proyectos).

### Etapa 7 — QA y cierre

- [x] 7.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` y `git diff --check`. 2026-11-05, sin commit todavía: los cinco sin errores; Vitest, 1575 tests en 149 archivos. La suite E2E completa dio 122 pasan y 2 fallan, los dos de `shopping-list` en `mobile-chrome`: usan la base compartida real y no tocan Finanzas.
- [ ] 7.2 Pruebas manuales de SPEC §13 y `TC-SCRUM-91-01` a `08` (plan), con capturas sin correos.
- [ ] 7.3 Marcar SPEC §13 solo con lo validado; `documento-proyecto.md` §4.6.
- [ ] 7.4 `code-reviewer`, `security-reviewer` y `qa-checker`.
- [ ] 7.5 Revisar otra vez el número de la migración, traer `develop`, descripción del PR con la evidencia, `waiting qa` y Jira.

### Fuera de esta historia

- [ ] Actualizar otra pestaña abierta (D20).
- [ ] Editar desde el Dashboard (D11) o periodos anteriores (D15).
- [ ] Volver una compra a "Sin total" (D13).
- [ ] Badge y recordatorio (HU-61), y filtros (HU-62).

## SCRUM-92: ver sesiones sin total ingresado

Cada etapa termina en un commit que compila por sí solo y se revisa y aprueba antes de seguir.

### Etapa 0 — Decisiones y specs

- [x] 0.1 Borrador de `SPEC.md`, `plan.md` y `tasks.md`, sección SCRUM-92 (2026-11-13).
- [x] 0.2 Decisiones de la dueña de la historia (2026-11-13, SPEC §5), aplicadas en SPEC y plan:
  - [x] D23: recordatorio desde las 24 horas del cierre sin total.
  - [x] D24: indicador persistente dentro de Finanzas, sin push ni correo.
  - [x] D25: sección "Compras sin total" con las pendientes de cualquier fecha.
  - [x] D26: solo en Finanzas (Dashboard e Historial) y sin opción de descartarlo.
  - [x] D27: badge en WCAG AA (4,5:1). Medido: el tema claro no cumple (2,58:1 a 2,76:1); se resuelve con un token y un tono nuevos.
- [x] 0.3 `features/finance/specs/E2E.md`, sección SCRUM-92 (E2E-FIN-15 a 18), con el umbral de 24 horas (skill `playwright-e2e`).
- [ ] 0.4 Revisión y aprobación de la documentación por el equipo, en el PR.
- [ ] 0.5 Antes de abrir el PR, `gh pr list --author "@me" --label "in progress" --state open`. Commit `docs(SCRUM-92): add sessions without total planning`, push y PR hacia `develop` con un solo label de estado (gitflow); SCRUM-92 a In Progress en Jira.

### Etapa 1 — Badge (CA-01)

- [ ] 1.1 Token `--tacha-terracotta-text` en `app/globals.css` (tema claro, oscuro y `prefers-color-scheme`) y un tono nuevo en `CHIP_TONE` y `Chip`, sin cambiar el tono `TERRACOTTA` ni `--tacha-terracotta` (D27). Test del `Chip`.
- [ ] 1.2 `PurchaseSessionRow` con el `Chip` de tono accesible para "Sin total" (`FINANCE_TEXT.WITHOUT_TOTAL`, ya existe). ₡0 y los montos no cambian.
- [ ] 1.3 Tests de componente y de pantalla: badge con texto, sin `role="alert"` ni rojo; ₡0 sin badge; contadores y filas de ajuste sin cambios. Medir el contraste en los dos temas (al menos 4,5:1). Vitest de Finanzas en verde.

### Etapa 2 — Lectura de pendientes

- [ ] 2.1 Constantes: el select, los estados del recordatorio y de la sección, y el umbral de 24 h en milisegundos (`..._MS`). El modelo de una compra pendiente, o `PeriodPurchase` si alcanza.
- [ ] 2.2 `getPurchasesWithoutTotal` en `finance.service.ts`, con conteo exacto y sin `owner_id`, y sus tests.
- [ ] 2.3 Función pura del corte (`closed_at ≤ ahora − 24 h`), con sus tests con el reloj fijo: 23 h 59 min no, 24 h sí.
- [ ] 2.4 `usePendingPurchases`: carga, `empty`/`ready`/`failed`, reintento, respuesta vieja, desmontaje, quitar una compra guardada y volver a leer con `P0002`, con sus tests.

### Etapa 3 — Recordatorio y completar (CA-02 y CA-03)

- [ ] 3.1 `useTotalEdit`: el objetivo de una compra indica su lista de origen, sin cambiar el resto del contrato, con sus tests (D21 entre las dos listas).
- [ ] 3.2 `usePurchaseHistoryViewModel`: el recordatorio, la sección "Compras sin total" y aplicar lo guardado en las dos listas, con sus tests.
- [ ] 3.3 `PendingTotalReminder`, sin botón de cerrar (D26), y la sección en `PurchaseHistory`, con Page Object y tests de componente y de pantalla.
- [ ] 3.4 `useFinanceDashboardViewModel` y `FinanceDashboard`: el recordatorio con el enlace al Historial, sin lápices (D11), con sus tests.

### Etapa 4 — E2E

- [ ] 4.1 `finance.helpers.ts`: la consulta de pendientes, con `[]` por defecto; confirmar que E2E-FIN-01 a 14 siguen pasando.
- [ ] 4.2 `e2e/features/finance/pending-totals.spec.ts` (E2E-FIN-15 a 18); correr `npx playwright test e2e/features/finance` en `chromium` y `mobile-chrome`.

### Etapa 5 — QA y cierre

- [ ] 5.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` y `git diff --check`.
- [ ] 5.2 Pruebas manuales de SPEC §13 y `TC-SCRUM-92-01` a `06` (plan), contra la base, con capturas sin correos.
- [ ] 5.3 Marcar SPEC §13 solo con lo validado; `documento-proyecto.md` §4.6.
- [ ] 5.4 `code-reviewer`, `security-reviewer` y `qa-checker`.
- [ ] 5.5 Traer `develop`, completar la descripción del PR con la plantilla y la evidencia, `waiting qa` y Jira.

### Fuera de esta historia

- [ ] Push web, correo o avisos con la app cerrada (roadmap post-curso).
- [ ] Ver periodos anteriores en el selector del Historial (D25: D7 no cambia).
- [ ] Contador en la navegación, o descartar el recordatorio (D26).
- [ ] Contraste AA del resto de los textos y chips terracota de la app (household, recetas, catálogo): hallazgo para el equipo (D27).
- [ ] Filtros por supermercado y categoría (HU-62, SCRUM-93).
- [ ] Pedir el total al cerrar una compra en el modo compra (`shopping-list`).
