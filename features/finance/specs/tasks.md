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
- [x] Deuda de SCRUM-69: `getPeriodSpending` puede sumar un resultado cortado por el servidor, sin avisar (plan, "Deuda de SCRUM-69"). Resuelta en SCRUM-91 (D19), y la función ya no existe desde SCRUM-72 (2026-11-24): el Dashboard lee con `getPeriodPurchases`.

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

- [x] 1.1 Token `--tacha-terracotta-text` en `app/globals.css` (tema claro, oscuro y `prefers-color-scheme`) y un tono nuevo en `CHIP_TONE` y `Chip`, sin cambiar el tono `TERRACOTTA` ni `--tacha-terracotta` (D27). Test del `Chip`. Claro `#945435`, oscuro `#e89a6c`; tono `CHIP_TONE.TERRACOTTA_STRONG`.
- [x] 1.2 `PurchaseSessionRow` con el `Chip` de tono accesible para "Sin total" (`FINANCE_TEXT.WITHOUT_TOTAL`, ya existe). ₡0 y los montos no cambian. La fila recibe `hasNoTotal` del ViewModel; no compara textos.
- [x] 1.3 Tests de componente y de pantalla: badge con texto, sin `role="alert"` ni rojo; ₡0 sin badge; contadores y filas de ajuste sin cambios. Medir el contraste en los dos temas (al menos 4,5:1). Vitest de Finanzas en verde. 2026-11-13: `Chip.test.tsx` mide el contraste con los tokens de `globals.css`: 4,98:1 en claro y 5,89:1 en oscuro, en el peor fondo. Vitest completo, 1603 en 152 archivos; E2E de Finanzas, 40 de 40. Falta medirlo en la pantalla real (SPEC §13, D27).

### Etapa 2 — Lectura de pendientes

- [x] 2.1 Constantes: el select, los estados del recordatorio y de la sección, y el umbral de 24 h en milisegundos (`..._MS`). El modelo de una compra pendiente, o `PeriodPurchase` si alcanza. Se reutilizan `FINANCE_DB.SELECT.PURCHASES`, `PeriodPurchase` y `SPENDING_STATUS` (sección); nuevos `FINANCE_DB.COLUMN.TOTAL_AMOUNT`, `PENDING_REMINDER_STATUS` y `PENDING_TOTAL_REMINDER.AFTER_MS`.
- [x] 2.2 `getPurchasesWithoutTotal` en `finance.service.ts`, con conteo exacto y sin `owner_id`, y sus tests. Comparte con `getPeriodPurchases` el mapeo (`toPeriodPurchase`) y el control del conteo (`assertCompleteResult`), sin cambiar su comportamiento.
- [x] 2.3 Función pura del corte (`closed_at ≤ ahora − 24 h`), con sus tests con el reloj fijo: 23 h 59 min no, 24 h sí. `utils/getOverduePurchases.ts`.
- [x] 2.4 `usePendingPurchases`: carga, `empty`/`ready`/`failed`, reintento, respuesta vieja, desmontaje, quitar una compra guardada y volver a leer con `P0002`, con sus tests. 2026-11-13: Vitest completo, 1629 en 154 archivos; E2E de Finanzas, 40 de 40. Volver a leer con `P0002` es `onRetry`; conectarlo al error del guardado es de la 3.2.

### Etapa 3 — Recordatorio y completar (CA-02 y CA-03)

- [x] 3.1 `useTotalEdit`: el objetivo de una compra indica su lista de origen, sin cambiar el resto del contrato, con sus tests (D21 entre las dos listas). `PURCHASE_LIST` y `onPurchaseUnavailable` para `P0002`.
- [x] 3.2 `usePurchaseHistoryViewModel`: el recordatorio, la sección "Compras sin total" y aplicar lo guardado en las dos listas, con sus tests. Con `P0002` el mensaje queda junto al campo y las pendientes se vuelven a leer al cerrarlo.
- [x] 3.3 `PendingTotalReminder`, sin botón de cerrar (D26), y la sección en `PurchaseHistory`, con Page Object y tests de componente y de pantalla. Los textos del recordatorio salen de `toPendingTotalReminder`, compartido con el Dashboard.
- [x] 3.4 `useFinanceDashboardViewModel` y `FinanceDashboard`: el recordatorio con el enlace al Historial, sin lápices (D11), con sus tests. 2026-11-14: Vitest completo, 1666 en 155 archivos; tsc, lint y `git diff --check` limpios. E2E de Finanzas: 34 pasan y 6 fallan (E2E-FIN-05, 07 y 14) porque `finance.helpers.ts` todavía responde la consulta de pendientes como la del Historial; se arregla en la 4.1.

### Etapa 4 — E2E

- [x] 4.1 `finance.helpers.ts`: la consulta de pendientes, con `[]` por defecto; confirmar que E2E-FIN-01 a 14 siguen pasando. Se reconoce por `total_amount=is.null` y se responde antes que la del Historial, que usa el mismo select; tiene sus propias opciones (`pendingRows`, `failPendingTimes`) y su registro (`pendingRequests`). Arregla E2E-FIN-05, 07 y 14. E2E-FIN-04 y 08 también comprueban que no se pidan las pendientes.
- [x] 4.2 `e2e/features/finance/pending-totals.spec.ts` (E2E-FIN-15 a 18); correr `npx playwright test e2e/features/finance` en `chromium` y `mobile-chrome`. 2026-11-14: 48 de 48 (E2E-FIN-01 a 18 en los dos proyectos); tsc, lint y `git diff --check` limpios.

### Etapa 5 — QA y cierre

- [x] 5.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` y `git diff --check`. 2026-11-14, sin commit todavía: los cinco sin errores; Vitest, 1681 en 156 archivos; E2E de Finanzas, 48 de 48 en `chromium` y `mobile-chrome`.
- [ ] 5.2 Pruebas manuales de SPEC §13 y `TC-SCRUM-92-01` a `06` (plan), contra la base, con capturas sin correos. Casos redactados por `qa-checker` (2026-11-14); sin ejecutar.
- [ ] 5.3 Marcar SPEC §13 solo con lo validado; `documento-proyecto.md` §4.6. §4.6 actualizado (2026-11-14); SPEC §13 queda sin marcar hasta ejecutar 5.2.
- [x] 5.4 `code-reviewer`, `security-reviewer` y `qa-checker` (2026-11-14), sobre `f723637..HEAD`:
  - `security-reviewer`: sin hallazgos críticos, altos ni medios. Uno bajo, fuera de alcance: la RLS de `016` deja a una sesión anónima leer sus propias compras por la API (D6 se aplica en la pantalla, como en SCRUM-90); cerrarlo es una migración nueva.
  - `code-reviewer`: sin bloqueantes. Corregido: el texto "24 horas" sale de la misma constante que el umbral, con un test. Documentado: con `P0002` solo se relee la lista de pendientes.
  - `qa-checker`: el enlace del Dashboard no llevaba a la sección, porque se dibuja después de cargar y la lista del periodo la empujaba fuera de la pantalla. Corregido en `PurchaseHistory`, con tests de pantalla y E2E-FIN-16. Agregados los tests de validación y de `TZ001` desde la sección, y corregido el caso manual 03 del plan. Decisión H7 (2026-11-14): el error de lectura del recordatorio conserva `role="alert"` y el estilo de error, como los demás errores de carga; "discreto" quedó definido en SPEC regla 67. Sin cambios de código.
- [ ] 5.5 Traer `develop`, completar la descripción del PR con la plantilla y la evidencia, `waiting qa` y Jira.

### Fuera de esta historia

- [ ] Push web, correo o avisos con la app cerrada (roadmap post-curso).
- [ ] Ver periodos anteriores en el selector del Historial (D25: D7 no cambia).
- [ ] Contador en la navegación, o descartar el recordatorio (D26).
- [ ] Contraste AA del resto de los textos y chips terracota de la app (household, recetas, catálogo): hallazgo para el equipo (D27).
- [ ] Filtros por supermercado y categoría (HU-62, SCRUM-93).
- [ ] Pedir el total al cerrar una compra en el modo compra (`shopping-list`).

## SCRUM-93: consultar frecuencia e historial de compra por producto

Cada etapa termina en un commit que compila por sí solo y se revisa y aprueba antes de seguir.

**Las etapas 1 a 6 están bloqueadas** hasta que se cumpla todo esto:

- las tareas 0.2 a 0.5 cerradas;
- la tarea 0.7 aprobada;
- SCRUM-92 en `develop`: **cumplido** (PR #100, `18c5003`). La rama lo trae desde el merge `4bf2a2a`.

### Etapa 0 — Decisiones y specs

- [x] 0.1 Decisiones de la dueña de la historia (2026-11-14): D28 a D38, SPEC §5.
  - D28 B: producto madre. **Sustituida por D39** (0.1b); queda como antecedente.
  - D29 B: cada fila cuenta.
  - D30 A: todo el historial.
  - D31 A: selector "Compras / Productos".
  - D32 A: detalle en la misma pantalla.
  - D33 A: orden y buscador.
  - D34 A: solo lectura.
  - D35 B: paginación por bloques.
  - D36 A: `security invoker`.
  - D37 A: "Producto no disponible".
  - D38 A: los filtros, como funcionalidad futura.
- [x] 0.1b Decisiones de la dueña de la historia (2026-11-16): D39 a D43, SPEC §5, reglas 97 a 101.
  - D39: juntar los productos madre con el mismo nombre normalizado. Sustituye a D28.
  - D40: el mismo nombre, sin distinguir mayúsculas, espacios de los extremos ni tildes; la búsqueda usa la misma regla.
  - D41: quitar las tildes con la extensión `unaccent`, que se activará en la migración `049`. La ñ pasa a n.
  - D42: la relación con HU-42 se decide en HU-42.
  - D43: al juntar, se muestra el nombre del catálogo global; si no hay, el de la aparición más reciente.
- [ ] 0.2 D36 y la activación de `unaccent` (D41) revisadas con `security-reviewer` antes de escribir la migración.
  - [x] **Revisión** (2026-11-16): sin hallazgos críticos y sin cambios de RLS. No hay fuga entre usuarios ni familias.
  - [x] **Los 8 hallazgos están incorporados** a la documentación (SPEC §12; plan, "Datos", "Seguridad" y "Pruebas"). Los dos de severidad alta son los permisos y la forma de llamar a `unaccent` de la función de normalización.
  - [x] **Esquema de `unaccent`** (2026-11-16): la dueña de la historia corrió en Supabase la consulta de solo lectura del plan ("Datos"). **No está instalada.** La migración `049` la activará en `extensions` y la función de normalización usará `extensions.unaccent`.
  - [x] **Número de la migración:** `049`, elegido y comunicado al equipo por la dueña de la historia el 2026-11-16 (plan, "Número de la migración"). La migración está aplicada (1.4); que ningún PR abierto use otra `049` se comprueba en la 1.2.
  - [ ] **Pendiente:** revisión y aprobación de estos cambios de documentación (junto con 0.7).
- [ ] 0.3 **Pendiente:** el equipo confirma D38. Después se actualiza documento-proyecto §4.6 (plan, "Documento del proyecto").
- [x] 0.4 (2026-11-16) Resuelta con D42: se decide en HU-42 (SCRUM-74). SCRUM-93 no recibe periodo.
- [x] 0.5 (2026-11-16) Problemas del modelo de SPEC §15:
  - **Problema 1:** resuelto con D39 y D43, que juntan por nombre y muestran el del catálogo global.
  - **Problema 3:** resuelto con D40 y D41, búsqueda sin tildes con `unaccent`.
  - **Problemas 2, 4 y 5:** quedan como límites declarados.
- [x] 0.6 `SPEC.md`, `plan.md`, `tasks.md` y `E2E.md`, sección SCRUM-93, y HU-62 en `docs/historias-usuario.md` y `docs/sprints.md` con el texto de Jira. Actualizados con D28 a D38 el 2026-11-14, y con D39 a D43, la revisión de seguridad y el número de migración `049` el 2026-11-16.
- [ ] 0.7 Revisión y aprobación de la documentación.
- [ ] 0.8 Commit de documentación, push y PR hacia `develop` con un solo label; Jira en el estado equivalente. **El PR existe** (#102, `in progress`, comprobado el 2026-11-16). No se comprobó el estado en Jira. SCRUM-92 ya está en `develop`, así que no hace falta `on hold` por esa dependencia. Igual se respeta que haya una sola PR `in progress` por persona.
- [x] 0.9 (2026-11-16) Decidido por la dueña de la historia (D43, SPEC regla 101): si varios productos del catálogo global comparten el nombre normalizado, se muestra el del menor `product_catalog.id`. Es solo el desempate del nombre; la agrupación por nombre normalizado no cambia, y se quita la elección por la aparición más reciente entre globales.
- [x] 0.10 (2026-11-16) Decidido por la dueña de la historia (D44, SPEC regla 102): `search_text` hasta 100 caracteres y `target_product_key` hasta 500. La RPC de detalle y su prueba SQL validan el 500. La medición del nombre más largo queda en la 1.2.

### Etapa 1 — Base

Empezada el 2026-11-16 por indicación de la dueña de la historia, con la 0.3 (D38) y la aprobación de la 0.2 y la 0.7 todavía abiertas. D38 no toca la base: los filtros quedan fuera de la `049`.


- [x] 1.1 Traer `develop` con SCRUM-92: hecho en el merge `4bf2a2a`. La rama ya lo incluye (comprobado el 2026-11-16 con referencias locales, sin `fetch`).
- [x] 1.2 Antes de implementar:
  - [x] verificar que la `049`, ya elegida y comunicada al equipo (0.2), sigue libre en `develop` y en los PRs abiertos. **Hecho (2026-11-16)**, con `git fetch origin` y la lista pública de PRs abiertos de GitHub (`gh` no está instalado):
    - ninguna rama de `origin`, `develop` incluida, tiene una `049`;
    - ninguno de los 8 PRs abiertos usa la `049`; SCRUM-79 (#108) agrega la `050`, sin conflicto;
    - al aplicarla, la fila `049` del historial se insertó sin conflicto: nadie la había aplicado antes en la base;
  - [x] medir el nombre original más largo del catálogo: 16 caracteres (medido por la dueña de la historia el 2026-11-16);
  - [x] medir el largo normalizado: 16 caracteres (medido por la dueña de la historia después de aplicar la `049`). Coincide con el original, y los dos quedan muy por debajo del tope de 500 (D44).
- [x] 1.3 Migración con `get_purchased_products` (búsqueda y bloques) y `get_product_purchases`, `security invoker` (SPEC §12), y su prueba SQL (plan, "Pruebas"). Incluye:
  - activar `unaccent` en `extensions` (0.2 y D41), y la función interna de normalización (D40): `security definer`, `stable`, `search_path = ''`, `unaccent` de dos argumentos y `execute` para `authenticated` (plan, "Datos");
  - rechazar la sesión anónima dentro de cada RPC y validar las entradas, con `position()` y los topes, con `search_text` hasta 100 y `target_product_key` hasta 500 (D44; plan, "Seguridad");
  - agrupar por nombre normalizado (D39, que sustituye a D28), con el nombre que se muestra según D43, con el menor `product_catalog.id` entre varios globales (0.9);
  - contar por fila;
  - buscar con la misma normalización;
  - una presentación aparte cuando el producto no está disponible (regla 96);
  - acotar los parámetros.

  Hecho el 2026-11-16: `supabase/migrations/049_product_purchase_history.sql` y `supabase/tests/049_product_purchase_history.test.sql`.
  - **Prueba local:** pasó en un PostgreSQL 17.5 local (no Supabase), con `schema.sql`, todas las migraciones reales y stubs de `auth`, como `authenticated` y con un dueño que no es superusuario. En ese entorno, `001` a `003` se aplicaron sin sus `comment on function`, que PostgreSQL rechaza.
  - **Mutaciones:** la prueba falla con siete cambios a propósito en la migración:
    - `unaccent` de un argumento;
    - D43 por la aparición más reciente;
    - una clave de 100;
    - `like` en vez de `position()`;
    - sin rechazo de la sesión anónima;
    - el largo medido después de recortar;
    - la lista `security definer`.
  - **Lo que no distingue:** quitar el `grant execute` de la normalización, porque los privilegios por defecto de Supabase (y del harness) ya lo dan. Comprueba el permiso efectivo.
  - **Topes elegidos al implementar:** `page_limit` de 1 a 50 y `page_offset` de 0 a 10 000 (SPEC §12).
- [ ] 1.4 Revisión, aprobación y aplicación:
  - [x] `security-reviewer` (2026-11-16): sin hallazgos críticos, altos ni medios, y los 8 de la revisión anterior se cumplen. Dejó dos bajos sin acción (el costo por fila de la normalización, acotado a las compras propias; `create function` sin `or replace`, que es el patrón del repo). Sobre la prueba: es segura en la base compartida si se corre completa, y bloquea las escrituras en `list_items` por unos segundos, como la `015`, así que conviene avisar al equipo y correrla fuera de horario.
  - [ ] aprobación de la dueña de la historia: no quedó registrada aparte. La aplicó ella misma, pero falta que la confirme;
  - [x] justo antes de aplicarla, repetir la consulta de `unaccent` del plan ("Datos"): la hizo la dueña de la historia. Después de aplicarla, `unaccent` está en `extensions`;
  - [x] aplicada por la dueña de la historia, con su fila `049` en `supabase_migrations.schema_migrations` (`supabase/README.md#migraciones`);
  - [x] verificada después de aplicarla: `unaccent` en `extensions`; `get_purchased_products` y `get_product_purchases` con `prosecdef = false`; `normalize_product_name` con `prosecdef = true`;
  - [x] `supabase/tests/049_product_purchase_history.test.sql` corrida completa, de una vez, en el SQL Editor: terminó sin errores;
  - [x] largo normalizado medido (1.2): 16.
- [ ] 1.5 **Omitida por decisión de la usuaria** (dueña de la historia, 2026-11-16); no está completada. Los tipos de `types/database.types.ts` están escritos según la `049`, pero **no se compararon con los tipos remotos**. No bloquea las etapas siguientes.
  - [x] escritos (2026-11-16): `get_purchased_products` devuelve `Json` (el servicio lo valida en la 2.1) y `get_product_purchases`, una fila por compra. `normalize_product_name` no se tipa: es interna, como `require_registered_user`. `npx tsc --noEmit`, `eslint`, `npm test` y `git diff --check` pasaron;
  - [x] nulos según la `049`: `target_product_key` y `target_variant_id` aceptan `null`, porque se manda exactamente uno; `store_name` y `total_amount` pueden venir en `null` (supermercado no visible y "Sin total"). `closed_at` no, porque solo hay compras cerradas;
  - [ ] comparar con los tipos que genera Supabase desde la base: **omitida por decisión de la usuaria**, no se hizo. Se intentó el 2026-11-16 y la CLI pidió un token de acceso (`AccessTokenRequiredError`); la dueña decidió no iniciar sesión en la CLI. No bloquea la historia: los tipos se mantienen como están, y si alguien regenera el archivo, el servicio de la 2.1 valida la respuesta en tiempo de ejecución.

### Etapa 2 — Lectura

- [x] 2.1 Modelos, constantes (tamaño de bloque, largo de búsqueda, espera), `getPurchasedProducts` y `getProductPurchases`, con sus tests (conteo exacto, recorte de la búsqueda).
  Hecho el 2026-11-16, por indicación de la dueña de la historia, con la 0.3 (D38) y la aprobación de la 0.2 y la 0.7 todavía abiertas. D38 no toca la lectura: no hay filtros.
  - **Modelos:** `PurchasedProduct`, `PurchasedProductsPage` (con la forma de la respuesta y la consulta), `ProductPurchase` y `ProductPurchaseTarget`, una unión: por nombre (`product_key`, tal cual) o por presentación (no disponible).
  - **Constantes:** `PRODUCT_HISTORY` (bloque de 20, `MAX_OFFSET` 10 000, búsqueda de 100 y espera de 300 ms), `PRODUCT_TARGET_KIND` y los nombres de las dos RPC en `FINANCE_DB`. Los textos y los estados se agregan con los hooks y la pantalla (2.3 y 3.x).
  - **Adapter** `utils/toPurchasedProductsPage.ts`: un bloque que no coincide con `min(PAGE_SIZE, total_count - offset)` es un error (SPEC §7); exactamente uno entre clave y presentación, y nombre solo con clave.
  - **Servicio:** la búsqueda se recorta y se corta a 100 caracteres contados como `char_length` (sin partir un emoji); un `offset` fuera de 0..10 000 es `RangeError` sin llamar a la base; el detalle se pide con `count: "exact"` (regla 30) y un supermercado en blanco llega como `null` (regla 29).
  - **Pruebas:** `toPurchasedProductsPage.test.ts` y `finance.service.test.ts`. `npx tsc --noEmit`, `npm run lint`, `npm test` (162 archivos, 1751 pruebas) y `git diff --check` pasan. Sin `code-reviewer` todavía: queda para la 6.4, o antes si se pide.
- [x] 2.2 `mergeProductPages`, con sus tests (sin repetidos).
  Hecho el 2026-11-16: `features/finance/utils/mergeProductPages.ts` y `features/finance/tests/mergeProductPages.test.ts` (11 pruebas). Función pura:
  - **Orden:** lo cargado, tal cual, y después el bloque nuevo en el orden de la base (D33).
  - **Repetidos (regla 94):** se identifican por el tipo y la clave (`product_key`, o la presentación si no está disponible), así que una clave y una presentación con el mismo texto no se confunden. Un repetido se muestra una sola vez, en el lugar donde ya estaba, aunque su conteo haya cambiado; también se descartan los repetidos dentro del mismo bloque.
  - **Conteo:** `totalCount` es el del bloque nuevo, el más reciente de la base.
  - **Casos de las pruebas:** bloque vacío, último bloque incompleto, nada cargado, los dos vacíos, un bloque solo de repetidos, y que no cambia las páginas que recibe.
  - **Para la 2.3:** con repetidos descartados, lo cargado puede quedar por debajo de `total_count`. El próximo `offset` sale de los productos que llegaron de la base, no del largo de la lista unida.
  - `npx vitest run features/finance/tests/mergeProductPages.test.ts`, `npx tsc --noEmit`, `npm run lint` y `git diff --check` pasan.
- [x] 2.3 `usePurchasedProducts` y `useProductPurchases`, con sus tests (2026-11-16). `usePurchasedProducts.test.ts` (13) y `useProductPurchases.test.ts` (7):
  - bloques y fin de la lista; el próximo `offset` cuenta las filas recibidas, repetidos incluidos, no el largo de la lista unida;
  - búsqueda que reinicia los bloques; espacios en los extremos no vuelven a pedir;
  - respuestas viejas descartadas: primer bloque, "Cargar más" y detalle de un producto anterior;
  - sin pedidos duplicados: "Cargar más" se ignora mientras otro bloque está en camino;
  - fallo de "Cargar más" que conserva lo cargado, y reintento del mismo bloque;
  - el detalle pide también la zona guardada (`getSavedTimeZone`, regla 87; servicio nuevo con sus tests); al cerrarlo se olvida la respuesta.

### Etapa 3 — Selector y lista de productos (CA-01)

Hechas el 2026-11-16, con D38 todavía sin confirmar por el equipo: no hay filtros (fuera de la historia).

- [x] 3.1 `HistoryViewSwitch` en `PurchaseHistory` y en la ruta nueva `app/(app)/finanzas/historial/productos/page.tsx`; `APP_ROUTE.FINANCE_HISTORY_PRODUCTS`. Tests: "Compras" no cambia y el selector usa `aria-current` (`PurchaseHistory.test.tsx`, `ProductPurchaseHistory.test.tsx`). El tono activo es el de los sub-tabs, no el chip `TEAL` (plan, "Riesgos").
- [x] 3.2 `useProductPurchaseHistoryViewModel` (búsqueda con espera, selección, estados y anuncios). Los textos salen de `utils/toProductHistoryTexts.ts` y `utils/formatCount.ts`, con sus tests. Se prueba a través de la pantalla (`ProductPurchaseHistory.test.tsx`), como los ViewModel de SCRUM-90 a 92.
- [x] 3.3 `ProductPurchaseHistory`, `ProductSearch`, `ProductPurchaseList` y `ProductPurchaseRow`, con Page Object (`ProductPurchaseHistory.page.ts`) y tests (18): "1 vez" y "N veces"; "Producto no disponible"; vacío y "Sin resultados"; "Cargar más" con el foco al primer producto nuevo; errores con "Reintentar"; sesión vencida al reintentar.

### Etapa 4 — Compras de un producto (CA-02)

- [x] 4.1 `ProductPurchaseDetail`, con tests: una fila por compra con presentaciones y apariciones (regla 89); "Total de la compra" y la aclaración visible (regla 85); "Sin total" y "Supermercado no disponible"; foco al título y de vuelta al producto; error dentro del detalle; vacío (regla 90); un solo detalle abierto (D32).

### Etapa 5 — E2E

- [x] 5.1 Respuestas simuladas en `finance.helpers.ts` (bloques según `page_limit`, búsqueda, detalle, `spending_time_zones` y errores por bloque). Los escenarios anteriores siguen pasando: `e2e/features/finance` completo, 60 pruebas en `chromium` y `mobile-chrome`.
- [x] 5.2 `e2e/features/finance/product-history.spec.ts` (E2E-FIN-19 a 23; E2E-FIN-22 en dos pruebas): 12 pasaron en `chromium` y `mobile-chrome`. El servidor de desarrollo necesita red para las fuentes de Google; se corrió con red.

### Etapa 6 — QA y cierre

- [x] 6.1 `npx tsc --noEmit`, `npm run lint`, `npm test` (vitest completo), `npm run build` y `git diff --check` pasan (2026-11-16).
- [x] 6.2 Pruebas manuales de SPEC §13 y `TC-SCRUM-93-01` a `07` (plan), con capturas sin correos. **Dadas por completadas por la dueña de la historia** (2026-11-16), paginación incluida. Evidencia registrada en capturas:
  - `01_historial_productos_detalle_y_frecuencia.png`: frecuencia y detalle de un producto (CA-01 y CA-02);
  - `02_busqueda_y_detalle_de_producto.png`: búsqueda y detalle del producto encontrado;
  - `03_busqueda_sin_acentos_y_coincidencia_de_producto.png`: búsqueda sin tildes (D40 y D41);
  - `04_busqueda_sin_resultados.png`: "Sin resultados" (regla 93).

  El resto de los casos (paginación, TC-SCRUM-93-04 a 07 y el detalle contra "Compras") no tiene captura. La paginación la cubren además E2E-FIN-21 y las pruebas de la 2.2, la 2.3 y la 3.3.
- [x] 6.3 SPEC §13 marcado con lo validado: las pruebas automatizadas, la prueba SQL y la QA manual de la 6.2. `documento-proyecto.md` §4.6: hecho (nota "Implementado (SCRUM-93 / HU-62)", con D38 como pendiente del equipo).
- [x] 6.4 `code-reviewer`, `security-reviewer` y `qa-checker` (2026-11-16). Resultado y correcciones: plan, "Revisiones de cierre".
- [ ] 6.5 **Pendiente (dueña de la historia):** traer `develop`, descripción del PR con la evidencia, `waiting qa` y Jira.
  - [x] número de la migración en los PRs abiertos, revisado otra vez (2026-11-16, 1.2): la `049` sigue libre;
  - [x] el PR #102 está abierto hacia `develop`, con un solo label, `in progress`;
  - [ ] traer `develop`: tiene 30 commits que la rama no tiene, entre ellos las migraciones `037`, `041` y `043`, que no tocan lo que lee la `049`. Un merge de prueba, sin escribir en la rama, no da conflictos;
  - [ ] subir los commits, actualizar la descripción del PR, pasarlo a `waiting qa` y mover Jira.

### Fuera de esta historia

- [ ] Filtros por supermercado y categoría (D38, funcionalidad futura).
- [ ] Productos más comprados y más costosos del Dashboard (HU-42).
- [ ] Precio o gasto por producto.
- [ ] Paginar el detalle de un producto y juntar los "Producto no disponible" bajo su producto madre.

## SCRUM-72: ver gastos por supermercado

Cada etapa termina en un commit que compila por sí solo y se revisa y aprueba antes de seguir.

### Etapa 0 — Decisiones y specs

- [x] 0.1 Análisis de viabilidad y propuesta técnica (2026-11-24): sin migración, RPC ni cambios de RLS; el Dashboard pasa a leer con `usePeriodPurchases` (plan, "Alternativas para la lectura").
- [x] 0.2 Decisiones de la dueña de la historia (2026-11-24, SPEC §5, reglas 103 a 106, 118 y 119), aplicadas en SPEC y plan:
  - [x] D45: los ajustes manuales en una línea aparte, fuera del desglose.
  - [x] D46: un supermercado solo con compras sin total, al final con "Sin total", nunca ₡0.
  - [x] D47: la cantidad de compras sin total en cada supermercado.
  - [x] D48: sin sección si el periodo no tiene compras.
  - [x] D49: "Supermercado no disponible" se ordena por su monto; solo en un empate va después de los que tienen nombre (revisión de la etapa 0).
  - [x] D50: "Ajuste manual" con un ajuste y "Ajustes manuales" con dos o más (revisión de la etapa 0).
- [x] 0.3 Indicaciones de la dueña de la historia (2026-11-24), aplicadas en SPEC y plan:
  - [x] quitar `usePeriodSpending` y `getPeriodSpending` en un commit aparte, después de confirmar que no tienen otros consumidores (SPEC §10; etapa 4);
  - [x] documentar el límite de agrupar por nombre (SPEC regla 108);
  - [x] conservar el redondeo, sin alterar totales (SPEC regla 114);
  - [x] sin cambios en Supabase ni migraciones.
- [x] 0.4 `SPEC.md`, `plan.md` y `tasks.md`, sección SCRUM-72 (2026-11-24), con las reglas 103 a 119. Revisión de la etapa 0 aplicada: los stubs E2E pasan a la etapa 2, la cobertura de E2E-FIN-01 a 04 y 11, D49 y D50.
- [x] 0.5 `features/finance/specs/E2E.md`, sección SCRUM-72 (E2E-FIN-24 y 25, con datos, resultados y peticiones), y notas en E2E-FIN-01, 03, 04 y 11 y en las coberturas de SCRUM-69 y SCRUM-91 (2026-11-24, skill `playwright-e2e`).
- [ ] 0.6 Revisión y aprobación de la documentación por el equipo, en el PR.
- [ ] 0.7 Antes de abrir el PR, comprobar que no haya otra PR propia en `in progress`. Commit `docs(SCRUM-72): add spending by store planning`, push y PR hacia `develop` con un solo label de estado (gitflow); SCRUM-72 a In Progress en Jira.
  - [x] commit de la planificación (`899ac97`);
  - [ ] PR con `in progress` y Jira: los hace la dueña de la historia; no hay constancia en esta rama.

### Etapa 1 — Agrupación (CA-01 y CA-02)

- [x] 1.1 Modelo `StoreSpending` y `groupSpendingByStore(purchases, adjustments)`: grupos por nombre, nombre nulo aparte, montos en centavos, compras sin total contadas aparte, el orden de la regla 113, con "Supermercado no disponible" ordenado por su monto (D49), y la suma y la cantidad de los ajustes (D50) (reglas 107 a 113, 118 y 119).
- [x] 1.2 Tests de `groupSpendingByStore`: los casos de plan, "Pruebas", incluida la suma de los supermercados más el ajuste igual al total en centavos (regla 114).

### Etapa 2 — Lectura del Dashboard

- [x] 2.1 `useFinanceDashboardViewModel` lee con `usePeriodPurchases` en vez de `usePeriodSpending`. El total, el presupuesto, el recordatorio y el anuncio de `role="status"` no cambian.
- [x] 2.2 `useFinanceDashboardViewModel.test.ts` y `FinanceDashboard.test.tsx` simulan `getPeriodFinance` y `getPeriodPurchases`; los casos de SCRUM-69, SCRUM-91 y SCRUM-92 siguen pasando sin cambiar lo que comprueban.
- [x] 2.3 Stubs E2E en el mismo commit (plan, "Pruebas", escenarios existentes), para que E2E-FIN-01 a 23 sigan en verde:
  - `finance.helpers.ts`: el Dashboard sin zona usa la ruta del Historial; los montos esperados no cambian. No hizo falta cambiar el helper: la consulta nueva lleva `stores(display_name)` y ya cae en esa ruta (2026-11-24);
  - E2E-FIN-01: la petición de la semana con el `select` del Historial, `count=exact`, sus límites y sin `owner_id`, leída de `historyRequests`;
  - E2E-FIN-03: `failHistoryTimes` en lugar de `failSpendingTimes`;
  - E2E-FIN-04, las dos pruebas: también `historyRequests` vacío (D6);
  - E2E-FIN-11: `historyRequests` vacío con zona guardada;
  - E2E-FIN-05 (no estaba en el plan): empieza en el Dashboard, que ahora también pide con la consulta del Historial, así que la petición que comprueba pasa a ser la última de `historyRequests` y no la primera;
  - correr `npx playwright test e2e/features/finance` en `chromium` y `mobile-chrome`: 60 pasaron (2026-11-24).

### Etapa 3 — Sección en el Dashboard

- [x] 3.1 Textos y el id del título en `finance.constants.ts`; las filas y la línea del ajuste, con "Ajuste manual" o el texto nuevo en plural (D50), las arma el ViewModel (reglas 103 a 106, 115, 117 y 119).
- [x] 3.2 `SpendingByStore` y `SpendingByStoreProps`, montado en `FinanceDashboard` debajo del recordatorio (SPEC §8 y §9).
- [x] 3.3 Page Object (`SpendingByStore.page.ts`) y tests de componente, del ViewModel y de la pantalla: orden con "Supermercado no disponible" por su monto (D49), "N sin total", "Sin total" al final, ajuste fuera de la lista en singular y en plural (D50), sin sección mientras carga, si falla y sin compras (D48), cambio de periodo y D6.
- [x] 3.4 Escenarios existentes en el mismo commit: E2E-FIN-11 espera una línea «Ajuste manual» en el desglose y ningún lápiz (D45, D11); los montos del total se buscan dentro de su tarjeta (₡10 000 en Día también es la fila de MaxiPali); E2E-FIN-03 comprueba que la sección no aparece con el error (regla 115). Los tests de pantalla existentes se acotan igual. E2E de Finanzas en verde: 60 pasaron en `chromium` y `mobile-chrome` (2026-11-24). En `finance.helpers.ts` solo cambió `getExactText`, que ahora acepta una parte de la página para acotar la búsqueda.

### Etapa 4 — Quitar la lectura sin uso

- [x] 4.1 Volver a buscar en `develop` y en la rama que `usePeriodSpending`, `getPeriodSpending` y `FINANCE_DB.SELECT.SPENDING` no tengan otros consumidores. Si aparece alguno, se detiene la etapa y se consulta. - [x] 4.2 Quitar `usePeriodSpending.ts`, `getPeriodSpending`, `FINANCE_DB.SELECT.SPENDING`, `usePeriodSpending.test.ts` y los casos de `getPeriodSpending` en `finance.service.test.ts`; actualizar los comentarios de `usePeriodPurchases` y de `getPeriodPurchases`. En `finance.helpers.ts`, quitar la rama del stub de gasto, `PURCHASES_BY_PERIOD_START`, `failSpendingTimes` y `spendingRequests`, y actualizar el comentario de cómo se reconoce la consulta de compras. Quitar las comprobaciones de `spendingRequests` en E2E-FIN-04 (las dos pruebas) y E2E-FIN-08 (las dos pruebas); E2E-FIN-11 ya no la tenía desde la etapa 2. Lo que protege D6 sigue: `historyRequests` y `periodFinanceRequests` vacíos. Commit aparte, con E2E de Finanzas en verde.finance.service.test.ts`; actualizar el comentario de `usePeriodPurchases`. En `finance.helpers.ts`, quitar la rama del stub de gasto, `PURCHASES_BY_PERIOD_START`, `failSpendingTimes` y `spendingRequests`, y sus comprobaciones en E2E-FIN-04 y 11. Commit aparte, con E2E de Finanzas en verde.

### Etapa 5 — E2E

La adaptación de los escenarios existentes ya está en las etapas 2, 3 y 4.

- [x] 5.1 `finance.helpers.ts`: opción `adjustments` para empezar con ajustes guardados (los de E2E-FIN-25), según [E2E.md](E2E.md), "Opción nueva del helper": exportar `SimulatedAdjustment` y empezar la lista con una copia de `options.adjustments ?? []`. Por defecto no hay ajustes, así que E2E-FIN-01 a 23 no cambian; confirmarlo corriendo `e2e/features/finance` completo. Confirmado el 2026-11-24: los 60 anteriores siguen pasando.
- [x] 5.2 `e2e/features/finance/spending-by-store.spec.ts`, según [E2E.md](E2E.md), sección SCRUM-72:
  - **E2E-FIN-24, sin zona, con los datos de E2E-FIN-05:**
    - Semana: MaxiPali ₡10 000, MasXMenos ₡5 000 y Walmart con "Sin total" al final;
    - Día: solo MaxiPali ₡10 000;
    - Mes: MaxiPali ₡30 000, MasXMenos ₡5 000 y Walmart con "Sin total";
    - sin línea de ajuste;
    - con `historyRows: []`, sin sección (D48);
    - cada periodo hace una sola petición, con el `select` del Historial, `count=exact` y sin `owner_id`.
  - **E2E-FIN-25, con zona guardada y ajustes:**
    - Semana: Walmart ₡12 000, MaxiPali ₡8 000 con "1 sin total", "Supermercado no disponible" ₡8 000 (empata con MaxiPali y va después, D49) y MasXMenos ₡3 000;
    - Semana: «Ajustes manuales −₡1 500» (un ajuste del día de +₡500 y uno de la semana de −₡2 000, D50) y total ₡29 500;
    - Día: «Ajuste manual +₡500»;
    - una lectura de `rpc/get_period_finance` por periodo, con su `target_scope`, y ninguna de `purchase_sessions` con el `select` del Historial.
  - Correr `npx playwright test e2e/features/finance` en `chromium` y `mobile-chrome`: 66 pasaron (2026-11-24), 6 de ellos de `spending-by-store.spec.ts` (E2E-FIN-24 en dos pruebas y E2E-FIN-25, en los dos navegadores).

### Etapa 6 — QA y cierre

- [x] 6.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` y `git diff --check` pasan (2026-11-24). `npm test`: 228 archivos, 2398 tests. `npx playwright test e2e/features/finance`: 66 de 66 en `chromium` y `mobile-chrome`. Se volvieron a correr después de aplicar las revisiones de la 6.2. `npm run build` falló dos veces por el entorno (`EPERM`: OneDrive bloqueaba un archivo de `.next`); con `.next` borrada, pasó.
- [x] 6.2 `code-reviewer` y `qa-checker` (2026-11-24): sin blockers; resultado y correcciones en plan, "Revisiones de cierre (2026-11-24)". `security-reviewer` no aplica (plan, "Seguridad").
- [ ] 6.3 **Pendiente (dueña de la historia):** pruebas manuales de SPEC §13 y `TC-SCRUM-72-01` a `06` (plan, "Pruebas", "Manual"), con capturas sin correos.
- [ ] 6.4 Marcar SPEC §13 solo con lo validado; `documento-proyecto.md` §4.2 con la nota "Implementado (SCRUM-72 / HU-40)".
  - [x] SPEC §13: marcado lo que validan las pruebas automatizadas; CA-01, CA-02 y "Manual" esperan la 6.3;
  - [x] `documento-proyecto.md` §4.2: nota "Implementado (SCRUM-72 / HU-40)";
  - [ ] marcar CA-01, CA-02 y "Manual" después de la 6.3.
- [ ] 6.5 **Pendiente (dueña de la historia):** descripción del PR con la evidencia manual, `waiting qa` y Jira, después de la 6.3.
- [ ] 6.6 **Pendiente (dueña de la historia):** decidir si un supermercado solo con compras sin total muestra también "1 sin total" (hoy sí, D47) o solo el badge (cambia D47).

### Fuera de esta historia

- [ ] Devolver `store_id` en la lectura para distinguir supermercados con el mismo nombre (pide una migración).
- [ ] Desgloses por categoría, persona o lista (HU-39, HU-41 y HU-38).
- [ ] Ver las compras de un supermercado o filtrar el Historial por supermercado (D38).
