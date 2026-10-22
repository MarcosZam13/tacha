# Plan E2E: Finanzas — dashboard de gasto por periodo

Deriva de [SPEC.md](SPEC.md) (SCRUM-69 / HU-37, §13) y de [plan.md](plan.md#pruebas). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests van en `e2e/features/finance/finance.spec.ts` (escenarios `E2E-FIN-nn`), con sus helpers en `e2e/features/finance/finance.helpers.ts`. Cada `test(...)` lleva el ID del escenario en el nombre.

## Qué validan y qué no

**Estos escenarios validan solo la interfaz**, en un navegador real (desktop y Pixel 7), con una **sesión simulada** y **respuestas de Supabase simuladas**:

- **No validan la autenticación real:** login, reCAPTCHA, tokens o vencimiento de la sesión. La sesión es falsa, escrita en `localStorage`; el usuario no existe en la base.
- **No validan la seguridad de la base:** RLS, permisos, la RPC `set_spending_budget` ni los checks de `spending_budgets`. Ninguna petición llega a Supabase: todas se responden desde el test.
- **No validan los datos reales:** que la base devuelva solo las compras propias y cerradas, o que guarde el presupuesto. Las respuestas las arma el test.

Lo real lo cubren:

- **La base:** la prueba SQL `supabase/tests/027_spending_budgets.test.sql`, que cubre anónimos, aislamiento entre usuarios, permisos y validaciones.
- **El acceso con cuenta real:** las pruebas manuales de SPEC §13 («Manual (acceso real)»): cuenta registrada contra la base compartida, sesión anónima real y dos cuentas de la misma familia.

Una respuesta simulada puede alejarse de la real; el E2E pasaría con un contrato roto. Lo mitigan los tests del servicio (`features/finance/tests/finance.service.test.ts`), que fijan tabla, columnas, filtros y RPC con nombres literales.

**Nivel más bajo que alcanza:** los límites de cada periodo, la suma, la validación del monto, los formatos, el servicio y los tres hooks ya tienen tests unitarios en `features/finance/tests/`. Acá va lo que solo prueba un navegador: que la ruta y la navegación existen, que la pantalla pide lo que debe con la sesión que hay, y que muestra y anuncia lo que responde Supabase.

## Datos y entorno

- **Reloj y zona horaria fijos**, para que los límites de cada periodo sean siempre los mismos:
  - zona horaria del contexto: `timezoneId: "America/Costa_Rica"` (UTC−6, sin horario de verano);
  - reloj del navegador: `page.clock.setFixedTime` en el **domingo 18 de octubre de 2026 a las 15:00** hora de Costa Rica (`2026-10-18T21:00:00Z`).

  Con eso, los límites que tiene que pedir la pantalla (`closed_at`, inicio incluido y fin excluido, en UTC) son:

  | Periodo | `closed_at=gte.` | `closed_at=lt.` |
  |---|---|---|
  | Día | `2026-10-18T06:00:00.000Z` | `2026-10-19T06:00:00.000Z` |
  | Semana (lunes 12 a domingo 18) | `2026-10-12T06:00:00.000Z` | `2026-10-19T06:00:00.000Z` |
  | Mes | `2026-10-01T06:00:00.000Z` | `2026-11-01T06:00:00.000Z` |

- **Sesión registrada simulada:** `signInAsFakeUser` (`e2e/support/fake-session.ts`). Escribe en `localStorage` una sesión con `is_anonymous: false` desde una página pública, antes de abrir `/finanzas`.
- **Sesión anónima simulada** (E2E-FIN-04): la misma sesión falsa con `is_anonymous: true`, armada en `finance.helpers.ts`.
- **Supabase simulado por ruta** (`page.route` sobre `NEXT_PUBLIC_SUPABASE_URL`), en lugar del `stubSupabaseApi` genérico, que responde `[]` a todo:

  | Petición | Respuesta simulada |
  |---|---|
  | `GET /rest/v1/purchase_sessions?select=total_amount&closed_at=gte.…&closed_at=lt.…` | Según el periodo pedido (`gte`), los montos de la tabla de abajo |
  | `GET /rest/v1/spending_budgets?select=period,amount` | Los presupuestos que guarda el escenario (empieza sin ninguno) |
  | `POST /rest/v1/rpc/set_spending_budget` | La fila guardada `{ owner_id, period, amount }`; el helper la recuerda para la siguiente lectura |
  | Cualquier otra a Supabase | `[]` (`200`), y se registra para poder comprobar que no hubo llamadas de más |

  Compras simuladas por periodo (solo `total_amount`, como pide la consulta):

  | Periodo | Filas | Se ve |
  |---|---|---|
  | Día | `10000` | ₡10 000; Compras 1; Sin total 0 |
  | Semana | `10000`, `5000`, `null` | ₡15 000; Compras 2; Sin total 1 |
  | Mes | `10000`, `5000`, `null`, `20000` | ₡35 000; Compras 3; Sin total 1 |

- **Limpieza:** no hace falta. No se escribe nada en la base; la sesión falsa vive solo en el contexto del navegador del test.
- **Textos:** se escriben en el spec a propósito (como en `password-recovery`). Si cambia un texto aprobado de SPEC §7 u §8, falla el E2E. Los montos se comparan normalizando el espacio que pone `Intl` entre los miles.
- **Servidor en frío:** en desarrollo, Next compila cada ruta la primera vez. Si hace falta, el spec calienta `/finanzas` antes de empezar y da más tiempo por test, como `password-recovery`.
- **Cómo se corre:** `npx playwright test e2e/features/finance` (o `npm run e2e`). Necesita `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, aunque no se llame a Supabase, y Chromium instalado (`npx playwright install chromium`). No corre en CI; la evidencia va en el PR.

## Escenarios

### E2E-FIN-01: elegir el periodo y ver el gasto

- **Cubre:** CA-01 y CA-02; D2, D3 y D5.
- **Precondición:** sesión registrada simulada; reloj y zona fijos; compras simuladas de la tabla. Corre en desktop y en Pixel 7.
- **Pasos:**
  1. Abrir la app y entrar a «Finanzas» desde la navegación privada.
  2. Mirar el selector y el gasto.
  3. Tocar «Día».
  4. Tocar «Mes».
- **Resultado esperado:**
  - La URL es `/finanzas`, el título es «Finanzas» y no hay barra de sub-tabs.
  - El grupo «Periodo» tiene «Día», «Semana» y «Mes», con **Semana** elegida (`aria-pressed="true"`).
  - **Semana:**
    - la petición a `purchase_sessions` lleva `select=total_amount` y los límites de la semana (tabla de arriba), sin ningún filtro por `owner_id`;
    - se ve «Gastado esta semana», «₡15 000» y «Lunes 12 a domingo 18 de octubre»;
    - «Compras» dice 2 y «Sin total» dice 1: la compra sin total no suma ₡0.
  - **Día:** la petición lleva los límites del día; se ve «Gastado hoy», «₡10 000» y «Domingo 18 de octubre».
  - **Mes:** se ve «Gastado este mes», «₡35 000» y «Octubre de 2026».
  - Cambiar de periodo no navega ni recarga: la URL sigue igual y la zona `role="status"` anuncia el total nuevo («Gastado hoy: ₡10 000»).
  - `spending_budgets` se pidió una sola vez, aunque se cambió dos veces de periodo.

### E2E-FIN-02: definir y editar el presupuesto

- **Cubre:** CA-03; D1.
- **Precondición:** sesión registrada simulada; reloj y zona fijos; compras de la tabla; sin presupuestos guardados. Corre en desktop y en Pixel 7.
- **Pasos:**
  1. Abrir `/finanzas` (Semana).
  2. Tocar «Definir presupuesto», escribir `50 000` en «Presupuesto semanal (₡)» y tocar «Guardar».
  3. Tocar «Editar presupuesto», cambiar a `12000` y tocar «Guardar».
  4. Recargar la página.
  5. Tocar «Día» y después «Mes».
- **Resultado esperado:**
  - Al abrir: «Sin presupuesto semanal» y el botón «Definir presupuesto»; no se ve ninguna diferencia.
  - **Al guardar ₡50 000:**
    - la petición a `rpc/set_spending_budget` lleva solo `{ "budget_amount": 50000, "budget_period": "week" }`, sin dueño;
    - el campo se cierra;
    - se ve «₡50 000», «Te quedan ₡35 000» y «No incluye 1 compra sin total»;
    - la zona `role="status"` anuncia «Presupuesto guardado»;
    - el foco vuelve a «Editar presupuesto».
  - **Al editarlo:** el campo abre con `50000`; después de guardar `12000` se ve «Te pasaste por ₡3 000».
  - **Al recargar:** se ve «₡12 000», porque la pantalla vuelve a leer `spending_budgets` (la respuesta simulada recuerda lo guardado).
  - **En Día y en Mes:** «Sin presupuesto diario» y «Sin presupuesto mensual»; el semanal no cambia los otros.

### E2E-FIN-03: errores de validación, de guardado y de carga

- **Cubre:** SPEC §7 y reglas 15, 19 y 20.
- **Precondición:** sesión registrada simulada; reloj y zona fijos. Corre en desktop y en Pixel 7.
- **Pasos y resultado esperado:**
  1. **Monto inválido:**
     - con el presupuesto semanal abierto, escribir `12.5` y tocar «Guardar»;
     - se ve «Escribe el monto en colones, solo números (ej. 50000).» junto al campo (`aria-invalid="true"`);
     - no se hace ninguna petición a `rpc/set_spending_budget`;
     - lo mismo con el campo vacío.
  2. **Error al guardar:**
     - `rpc/set_spending_budget` responde `500`;
     - escribir `30000` y tocar «Guardar»;
     - se ve «No se pudo guardar tu presupuesto. Intenta de nuevo.» (`role="alert"`) y el campo conserva `30000`;
     - «Cancelar» cierra el campo y sigue «Sin presupuesto semanal».
  3. **Error al cargar el gasto:**
     - la primera petición a `purchase_sessions` responde `500` y la segunda con las compras de la semana;
     - se ve «No se pudo cargar tu gasto. Intenta de nuevo.» y «Reintentar»;
     - al tocarlo se ve «₡15 000»;
     - el presupuesto se siguió viendo durante el error.
  4. **Error al cargar el presupuesto:**
     - `spending_budgets` responde `500`;
     - se ve «No se pudo cargar tu presupuesto. Intenta de nuevo.», sin botón para editar;
     - el gasto se sigue viendo.

### E2E-FIN-04: sin cuenta registrada no se ve ni se pide nada

- **Cubre:** D6 y SPEC §13 «Acceso», **solo del lado de la interfaz**. Que la base rechace a un anónimo lo prueba la prueba SQL; con una sesión anónima real, la prueba manual.
- **Precondición:** reloj fijo; todas las peticiones a Supabase se registran. Corre en desktop y en Pixel 7. Dos variantes: (a) sin ninguna sesión; (b) con la sesión anónima simulada (`is_anonymous: true`).
- **Pasos:**
  1. Abrir `/finanzas`.
  2. Tocar «Iniciar sesión».
- **Resultado esperado:**
  - Se ve «Inicia sesión con tu cuenta para ver tus finanzas.» y el enlace «Iniciar sesión».
  - No se ve el selector, ni montos, ni el presupuesto.
  - **No hubo ninguna petición** a `purchase_sessions`, `spending_budgets` ni `rpc/set_spending_budget`.
  - El enlace lleva a `/login`.

## Cobertura

| Criterio | Escenarios E2E | Otros niveles |
|---|---|---|
| CA-01 (selector, Semana por defecto, navegación) | E2E-FIN-01 | `useFinanceDashboardViewModel.test.ts` |
| CA-02 (recalcular sin recargar, compras sin total aparte) | E2E-FIN-01 | `getPeriodBounds.test.ts`, `summarizeSpending.test.ts`, `usePeriodSpending.test.ts` |
| CA-03 (presupuesto por periodo, diferencia) | E2E-FIN-02, E2E-FIN-03 | `parseBudgetAmount.test.ts`, `useSpendingBudgets.test.ts`, prueba SQL 027 |
| D6 (solo cuentas registradas) | E2E-FIN-04 (interfaz) | `finance.service.test.ts`, `useFinanceDashboardViewModel.test.ts`, prueba SQL 027 (base), prueba manual (sesión anónima real) |
| D4 (solo el gasto propio) | — (lo decide la RLS de `purchase_sessions`) | Prueba manual con dos cuentas de la misma familia |
