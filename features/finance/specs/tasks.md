# Tasks: Finanzas — dashboard de gasto por periodo

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

- [ ] 4.1 Constantes del servicio, modelos y `finance.service.ts`, con sus tests:
  - `hasRegisteredSession`, sin crear sesiones;
  - `getPeriodSpending`;
  - `getSpendingBudgets`;
  - `setSpendingBudget`.

### Etapa 5 — ViewModel (commit `feat`)

- [ ] 5.1 Constantes del flujo, `usePeriodSpending`, `useSpendingBudgets` y `useFinanceDashboardViewModel` (con `noAccount` sin llamadas de datos), con sus tests.

### Etapa 6 — Plan E2E (commit `docs`)

- [ ] 6.1 `features/finance/specs/E2E.md` (skill `playwright-e2e`):
  - E2E-FIN-01 a E2E-FIN-04, con sus precondiciones y las respuestas simuladas de cada uno;
  - la aclaración de que validan la interfaz y no la autenticación real ni la base.

### Etapa 7 — Pantalla (commit `feat`)

- [ ] 7.1 `FinanceNoAccount`, `SpendingPeriodSelector`, `SpendingTotal`, `SpendingBudget` y sus props.
- [ ] 7.2 `FinanceDashboard`, `app/(app)/finanzas/page.tsx`, `APP_ROUTE.FINANCE` y el ítem "Finanzas" en la navegación.
- [ ] 7.3 Page Object y tests (jsdom).
- [ ] 7.4 `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build`.

### Etapa 8 — E2E (commit `test`)

- [ ] 8.1 Preparar el entorno local: `.env.local` con las dos variables de Supabase y Chromium (`npx playwright install chromium`).
- [ ] 8.2 `e2e/features/finance/finance.spec.ts` y sus helpers, con `signInAsFakeUser` y respuestas simuladas por ruta; `npx playwright test e2e/features/finance` en `chromium` y `mobile-chrome`.

### Etapa 9 — QA y cierre

- [ ] 9.1 Pruebas manuales (plan, "Pruebas"):
  - acceso real: iniciar sesión con una cuenta registrada y recorrer CA-01 a CA-03 contra la base, con los tres presupuestos;
  - D6: con una sesión anónima real, `/finanzas` muestra el aviso y no hay llamadas a `purchase_sessions` ni a `spending_budgets` en la pestaña de red;
  - D4 con dos cuentas registradas de la misma familia;
  - capturas sin correos.
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
