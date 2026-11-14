# Plan E2E: Finanzas — dashboard de gasto por periodo e historial de compras

Deriva de [SPEC.md](SPEC.md) (SCRUM-69 / HU-37 y SCRUM-90 / HU-59, §13) y de [plan.md](plan.md#pruebas). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests van en `e2e/features/finance/finance.spec.ts` (escenarios `E2E-FIN-nn`), con sus helpers en `e2e/features/finance/finance.helpers.ts`; los de SCRUM-90 van en `e2e/features/finance/purchase-history.spec.ts`. Cada `test(...)` lleva el ID del escenario en el nombre.

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
  | `GET /rest/v1/purchase_sessions?select=id,closed_at,total_amount,stores(display_name)&closed_at=gte.…&closed_at=lt.…&order=closed_at.desc,id.asc` (SCRUM-90) | Según el periodo pedido, las compras de E2E-FIN-05; el helper distingue esta petición por su `select`. Responde con el header `Content-Range` (por ejemplo, `0-2/3`, o `*/0` sin filas), porque sin él `count` llega nulo y la pantalla pasa a error. La forma exacta de la URL se confirma al escribir el test |
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
  - La URL es `/finanzas`, el título es «Finanzas» y la barra de sub-tabs tiene «Dashboard» activo (SCRUM-90; antes no existía).
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

### E2E-FIN-05: ver el historial y filtrarlo por periodo (SCRUM-90)

- **Cubre:** HU-59 CA-01 y CA-02; D7, D9 y reglas 25 a 27.
- **Precondición:** sesión registrada simulada; reloj y zona fijos; compras del Historial de la tabla de abajo. Corre en desktop y en Pixel 7.

  | Periodo | Compras, de la más reciente a la más antigua | Se ve |
  |---|---|---|
  | Día | Domingo 18, MaxiPali, `10000` | ₡10 000; Compras 1; Sin total 0 |
  | Semana | La anterior; miércoles 14, Walmart, `null`; lunes 12, MasXMenos, `5000` | ₡15 000; Compras 2; Sin total 1 |
  | Mes | Las anteriores; lunes 5, MaxiPali, `20000` | ₡35 000; Compras 3; Sin total 1 |

- **Pasos:**
  1. Abrir `/finanzas` y tocar «Historial».
  2. Mirar el selector, el total y la lista.
  3. Tocar «Día» y después «Mes».
  4. Tocar «Dashboard» y volver a «Historial».
- **Resultado esperado:**
  - La URL es `/finanzas/historial`, «Historial» tiene `aria-current="page"` y «Finanzas» sigue activa en la navegación privada.
  - **Semana** está elegida. La petición a `purchase_sessions` lleva el `select` del Historial, los límites de la semana y el orden, sin ningún filtro por `owner_id`.
  - Se ve «Gastado esta semana», «₡15 000» y tres filas, en el orden de la tabla, con su fecha, supermercado y monto.
  - «Día» y «Mes» cambian la lista y el total según la tabla, sin cambiar la URL, y `role="status"` anuncia el total nuevo.
  - El aviso «Precios estimados» aparece una sola vez.
  - Al salir en «Mes» y volver, cada tab arranca en **Semana**.

### E2E-FIN-06: «Sin total», total de ₡0 y supermercado no disponible (SCRUM-90)

- **Cubre:** D8 y regla 29.
- **Precondición:** sesión registrada simulada; en la semana, una compra con `null` y otra con `0`, esta última con `stores: null`. Corre en desktop y en Pixel 7.
- **Pasos:** abrir `/finanzas/historial`.
- **Resultado esperado:**
  - La compra con `null` dice «Sin total», sin ₡0 en su fila.
  - La compra con `0` dice «₡0» y «Supermercado no disponible», y conserva su fecha.
  - El total es «₡0», «Compras» dice 1 y «Sin total» dice 1.
  - No se muestra el mensaje de vacío.

### E2E-FIN-07: carga, vacío y error, con el aviso de precios (SCRUM-90)

- **Cubre:** SPEC §6 y §7 de SCRUM-90. En los tres pasos, el aviso «Precios estimados» aparece una sola vez.
- **Precondición:** sesión registrada simulada. Corre en desktop y en Pixel 7.
- **Pasos y resultado esperado:**
  1. **Carga:** con la respuesta demorada, se ve el selector, la carga y el aviso, sin lista.
  2. **Vacío:** `purchase_sessions` responde `[]`; se ve «₡0» y «Todavía no tienes compras cerradas en este periodo.», sin lista.
  3. **Error:**
     - la primera petición responde `500` y la segunda con las compras de la semana;
     - se ve «No se pudo cargar tu gasto. Intenta de nuevo.» y «Reintentar», sin lista;
     - al tocarlo se ven «₡15 000» y las tres filas.

### E2E-FIN-08: el historial sin cuenta registrada (SCRUM-90)

- **Cubre:** D6, **solo del lado de la interfaz**.
- **Precondición:** todas las peticiones a Supabase se registran. Corre en desktop y en Pixel 7. Dos variantes: (a) sin ninguna sesión; (b) con la sesión anónima simulada.
- **Pasos:** abrir `/finanzas/historial`.
- **Resultado esperado:**
  - Se ve «Inicia sesión con tu cuenta para ver tus finanzas.» y el enlace «Iniciar sesión», que lleva a `/login`.
  - No se ven los sub-tabs, ni el selector, ni la lista.
  - **No hubo ninguna petición** a `purchase_sessions`.

## Cobertura

| Criterio | Escenarios E2E | Otros niveles |
|---|---|---|
| CA-01 (selector, Semana por defecto, navegación) | E2E-FIN-01 | `useFinanceDashboardViewModel.test.ts` |
| CA-02 (recalcular sin recargar, compras sin total aparte) | E2E-FIN-01 | `getPeriodBounds.test.ts`, `summarizeSpending.test.ts`, `usePeriodSpending.test.ts` |
| CA-03 (presupuesto por periodo, diferencia) | E2E-FIN-02, E2E-FIN-03 | `parseColonesAmount.test.ts`, `useSpendingBudgets.test.ts`, prueba SQL 027 |
| D6 (solo cuentas registradas) | E2E-FIN-04 (interfaz) | `finance.service.test.ts`, `useFinanceDashboardViewModel.test.ts`, prueba SQL 027 (base), prueba manual (sesión anónima real) |
| D4 (solo el gasto propio) | — (lo decide la RLS de `purchase_sessions`) | Prueba manual con dos cuentas de la misma familia |
| HU-59 CA-01 (sub-tab y lista) | E2E-FIN-05 | `finance.service.test.ts`, `usePurchaseHistoryViewModel.test.ts`, `PurchaseHistory.test.tsx`, prueba manual (`stores` real) |
| HU-59 CA-02 (selector y total) | E2E-FIN-05 | `usePeriodPurchases.test.ts`, `getPeriodBounds.test.ts`, `summarizeSpending.test.ts` |
| D7 y D9 (periodo en curso, Semana al abrir cada tab) | E2E-FIN-05 | `usePurchaseHistoryViewModel.test.ts` |
| D8 («Sin total» y ₡0) | E2E-FIN-06 | `summarizeSpending.test.ts`, `usePurchaseHistoryViewModel.test.ts` |
| Regla 29 (supermercado no disponible) | E2E-FIN-06 | `finance.service.test.ts`, `usePurchaseHistoryViewModel.test.ts` |
| Regla 30 (resultado incompleto) | — (se simula mejor en el servicio) | `finance.service.test.ts` |
| Carga, vacío, error y aviso del Historial | E2E-FIN-07 | `usePeriodPurchases.test.ts`, `PurchaseHistory.test.tsx` |
| D6 en el Historial | E2E-FIN-08 (interfaz) | `useFinanceAccess.test.ts`, prueba manual (sesión anónima real) |
| D4 en el Historial | — (lo decide la RLS de `purchase_sessions`) | Prueba manual con dos cuentas de la misma familia |

## SCRUM-91: editar el total de una sesión o periodo

Los tests van en `e2e/features/finance/edit-totals.spec.ts`. Igual que los anteriores, usan una **sesión registrada simulada** y **respuestas de Supabase simuladas**, y validan **solo la interfaz**: ni la autenticación real, ni la RLS, ni las RPC, ni el trigger. Lo real lo cubren la prueba SQL `supabase/tests/040_edit_purchase_totals.test.sql` y el QA manual de SPEC §13.

Las combinaciones de validación, de niveles de ajuste y de códigos de error se prueban en niveles más bajos (plan, "Pruebas"). Acá van casos representativos.

### Datos y entorno

Mismos reloj, zona horaria y compras del Historial de E2E-FIN-05, con estos cambios en `finance.helpers.ts`:

| Petición | Respuesta simulada |
|---|---|
| `GET /rest/v1/purchase_sessions?select=total_amount…` | Las compras del periodo, ahora con `Content-Range`, por D19. También cambia lo que necesitan E2E-FIN-01 a 04 |
| `POST /rest/v1/rpc/get_period_finance` | La zona `America/Costa_Rica`, los límites de la tabla de arriba, las compras, los ajustes que recuerda el escenario (empieza sin ninguno) y el total del periodo; con `time_zone: null` en E2E-FIN-14 hasta confirmar |
| `POST /rest/v1/rpc/set_spending_time_zone` | La fila guardada; el helper la recuerda |
| `POST /rest/v1/rpc/set_purchase_session_total` | La compra con el total nuevo; el helper la recuerda para la siguiente lectura |
| `POST /rest/v1/rpc/set_period_total` | El ajuste calculado por el helper, o ninguna fila si se quitó |

Cualquier escenario anterior sin ajustes recibe `[]`, así que sus resultados esperados no cambian. Sin `savedTimeZone`, `rpc/get_period_finance` responde sin zona y la pantalla lee como antes; con ella, el helper responde desde un estado en memoria que comparten las tres RPC de escritura. Sin zona guardada, las dos RPC de edición responden `TZ001`. Los errores (`500`, `23514`) se encolan por RPC con `purchaseTotalErrors` y `periodTotalErrors`.

**Última corrida:** 2026-11-05, `npx playwright test e2e/features/finance`: 40 de 40 (E2E-FIN-01 a 14, en `chromium` y `mobile-chrome`). Sin commit todavía.

### E2E-FIN-09: editar el total de una compra (SCRUM-91)

- **Cubre:** CA-01; D12, D21 y reglas 47 y 48.
- **Precondición:** sesión registrada simulada; compras de la semana de E2E-FIN-05. Corre en desktop y en Pixel 7.
- **Pasos:**
  1. Abrir `/finanzas/historial`.
  2. Tocar el lápiz de MaxiPali, escribir `12000` y tocar «Guardar».
  3. Tocar el lápiz de Walmart («Sin total»), escribir `0` y tocar «Guardar».
  4. Abrir un lápiz y, sin guardar, abrir otro.
- **Resultado esperado:**
  - La petición a `rpc/set_purchase_session_total` lleva la compra y el total, sin dueño ni zona.
  - **MaxiPali:** ₡12 000, el total del periodo pasa a ₡17 000 y conserva su fecha, sin recargar. `role="status"` anuncia «Total guardado».
  - **Walmart:** ₡0; «Compras» pasa de 2 a 3 y «Sin total» de 1 a 0.
  - **Dos lápices:** solo queda abierto el último y el primero no se guardó.

### E2E-FIN-10: editar el total del periodo (SCRUM-91)

- **Cubre:** CA-02; D10, D16 y regla 50.
- **Precondición:** la misma. Corre en desktop y en Pixel 7.
- **Pasos:**
  1. Abrir `/finanzas/historial` (₡15 000).
  2. Tocar «Editar total de esta semana», escribir `20000` y tocar «Guardar».
  3. Editar otra vez a `18000`.
  4. Editar otra vez a `15000`.
- **Resultado esperado:**
  - La petición a `rpc/set_period_total` lleva el periodo y el total deseado, sin dueño, diferencia ni zona.
  - **₡20 000:** aparece «Ajuste manual» con «+₡5 000», el nivel «Total de la semana» y sin lápiz. Las compras conservan sus montos; «Compras» sigue en 2 y «Sin total» en 1.
  - **₡18 000:** una sola fila de ajuste, con «+₡3 000».
  - **₡15 000:** la fila de ajuste desaparece.

### E2E-FIN-11: el Dashboard refleja el cambio (SCRUM-91)

- **Cubre:** CA-03; D11 y D19.
- **Precondición:** la misma, con presupuesto semanal de ₡30 000. Corre en desktop y en Pixel 7.
- **Pasos:**
  1. En el Historial, editar la semana a `20000`.
  2. Tocar «Dashboard», sin recargar.
- **Resultado esperado:**
  - El Dashboard dice ₡20 000, «Incluye ajustes manuales» y «Te quedan ₡10 000»; «Compras» sigue en 2.
  - Con la zona guardada, el gasto sale de `rpc/get_period_finance` (compras, ajustes y total en una sola lectura) y no hay consulta separada a `purchase_sessions`. Sin zona, la consulta de gasto lleva `count=exact` (E2E-FIN-01).
  - No hay ningún lápiz de total ni fila «Ajuste manual».

### E2E-FIN-12: validación y errores al guardar (SCRUM-91)

- **Cubre:** D13, D14, D18 y SPEC §7 de SCRUM-91.
- **Precondición:** la misma. Corre en desktop y en Pixel 7.
- **Pasos y resultado esperado:**
  1. **Inválido:** en una compra, dejar vacío y tocar «Guardar», y después `12.5`: se ve «Escribe el monto en colones, solo números (ej. 50000).», sin petición a la RPC.
  2. **Error al guardar:** la RPC responde `500`; se ve «No se pudo guardar el total. Intenta de nuevo.» (`role="alert"`), el campo conserva lo escrito y el monto no cambia.
  3. **Reintento:** la segunda respuesta sale bien y el campo se cierra.
  4. **Negativo:** `rpc/set_period_total` responde con código `23514`; se ve «Ese monto dejaría un periodo en negativo. Revisa el total del día, la semana y el mes.» y no aparece ningún ajuste.
  5. **Cancelar:** Escape cierra el campo, sin petición, y el foco vuelve al lápiz.

### E2E-FIN-13: editar un periodo sin compras (SCRUM-91)

- **Cubre:** D17 y reglas 47 y 49.
- **Precondición:** sin compras en el periodo. Corre en desktop y en Pixel 7.
- **Pasos:**
  1. Abrir `/finanzas/historial`: ₡0, mensaje de vacío y lápiz del total.
  2. Editar a `5000`.
- **Resultado esperado:**
  - Se ve ₡5 000 y «Ajuste manual» con «+₡5 000», sin el mensaje de vacío.
  - «Compras» y «Sin total» siguen en 0.

### E2E-FIN-14: confirmar la zona y que el navegador no cambie los periodos (SCRUM-91)

- **Cubre:** reglas 58 y 59.
- **Precondición:** sesión registrada simulada, sin zona guardada. Corre en desktop y en Pixel 7.
- **Pasos y resultado esperado:**
  1. **Sin zona:** en una compra, escribir `12000` y tocar «Guardar»; `rpc/set_purchase_session_total` responde con código `TZ001`. Se ve «Confirma tu zona horaria para guardar este total.», la zona del navegador y «Confirmar», y el campo conserva `12000`. No hubo ninguna petición a `rpc/set_spending_time_zone`.
  2. **Confirmar:** al tocar «Confirmar», `rpc/set_spending_time_zone` recibe la zona del navegador, se repite la edición y se ve ₡12 000.
  3. **Otro navegador:** con zona guardada `America/Costa_Rica` y `timezoneId` `Asia/Tokyo`, la pantalla usa los límites de `rpc/get_period_finance`, y sus peticiones de compras y sus fechas son las de la zona guardada. No se pide confirmar nada.

### Cobertura de SCRUM-91

| Criterio | Escenarios E2E | Otros niveles |
|---|---|---|
| HU-60 CA-01 | E2E-FIN-09 | `useTotalEdit.test.ts`, `PurchaseHistory.test.tsx`, prueba SQL 040, manual |
| HU-60 CA-02 | E2E-FIN-10 | `usePeriodPurchases.test.ts`, `summarizeSpending.test.ts`, prueba SQL 040, manual |
| HU-60 CA-03 y D19 | E2E-FIN-11 | `finance.service.test.ts`, `usePeriodSpending.test.ts`, `FinanceDashboard.test.tsx`, manual |
| D12, totales nulos y ₡0 | E2E-FIN-09 | `summarizeSpending.test.ts`, `usePurchaseHistoryViewModel.test.ts` |
| D13 y D14 | E2E-FIN-12 | `parseColonesAmount.test.ts`, prueba SQL 040 |
| D17 | E2E-FIN-13 | `usePeriodPurchases.test.ts`, prueba SQL 040 |
| D18 y regla 54 | E2E-FIN-12 (solo el mensaje del código `23514`) | `finance.service.test.ts` (reconoce el código), prueba SQL 040 (el rechazo real, la transacción y las compras históricas) |
| Regla 48 (compras históricas) | — (el Historial solo muestra el periodo en curso) | Prueba SQL 040 |
| Regla 58 (zona guardada) | E2E-FIN-14 | `finance.service.test.ts`, `getPeriodBounds.test.ts`, prueba SQL 040 |
| Reglas 54, 59 y 60 (D18, confirmar y cambiar la zona) | E2E-FIN-12 (mensaje de `23514`), E2E-FIN-14 (confirmar) | `finance.service.test.ts` (reconoce el código), `useTotalEdit.test.ts`, prueba SQL 040 (el rechazo real, el cambio de zona y la zona no reconocida) |
| Indicación de ajustes en el Dashboard | E2E-FIN-11 | `FinanceDashboard.test.tsx` |
| D21 | E2E-FIN-09 | `useTotalEdit.test.ts` |
| D22 | — | `usePurchaseHistoryViewModel.test.ts`, `useTotalEdit.test.ts` |
| Regla 52 (dónde cuenta) | — | `finance.service.test.ts`, prueba SQL 040 |
| Trigger, permisos y RLS | — (no llegan a la base) | Prueba SQL 040, manual |
| D20 (otra pestaña) | — (fuera de alcance) | Límite declarado |

## SCRUM-92: ver sesiones sin total ingresado

Los tests van en `e2e/features/finance/pending-totals.spec.ts`. Igual que los anteriores, usan una **sesión registrada simulada** y **respuestas de Supabase simuladas**, y validan **solo la interfaz**: ni la RLS, ni la RPC real, ni el contraste medido (SPEC D27, manual). Lo real lo cubren la prueba SQL `040` y el QA manual de SPEC §13.

Los bordes del umbral (23 h 59 min y 24 h exactas) se prueban en la función pura del corte (plan, "Pruebas"). Acá van casos representativos.

### Datos y entorno

Mismo reloj, zona horaria y compras del Historial de E2E-FIN-05: domingo 18 de octubre de 2026, 15:00 en Costa Rica (`2026-10-18T21:00:00Z`). Cambios en `finance.helpers.ts`:

| Petición | Respuesta simulada |
|---|---|
| `GET /rest/v1/purchase_sessions?…total_amount=is.null…` | Las compras cerradas sin total del escenario, de cualquier fecha, con `Content-Range`; `[]` por defecto, así que E2E-FIN-01 a 14 no cambian |
| `POST /rest/v1/rpc/set_purchase_session_total` | La compra con el total nuevo, como en SCRUM-91; el helper la quita de las pendientes |

Compras sin total que usan los escenarios:

| Compra | Cierre | Hace | Cuenta para el recordatorio (24 h) |
|---|---|---|---|
| Walmart | miércoles 14 de octubre, 10:00 (`2026-10-14T16:00:00Z`) | 4 días | Sí |
| MaxiPali | domingo 18 de octubre, 04:00 (`2026-10-18T10:00:00Z`) | 11 horas | No |
| Walmart | domingo 20 de septiembre, 10:00 (`2026-09-20T16:00:00Z`) | 28 días, fuera del mes | Sí |

### E2E-FIN-15: badge «Sin total» (SCRUM-92)

- **Cubre:** CA-01; D8 y reglas 61 y 62.
- **Precondición:** sesión registrada simulada; compras de la semana de E2E-FIN-05 más una de ₡0. Corre en desktop y en Pixel 7.
- **Pasos:** abrir `/finanzas/historial`.
- **Resultado esperado:**
  - La fila de Walmart muestra el badge «Sin total», sin `role="alert"`.
  - MaxiPali muestra ₡10 000 y la de ₡0 muestra «₡0», las dos sin badge.
  - Los contadores no cambian: «Compras» y «Sin total» siguen como en E2E-FIN-05, con la de ₡0 en «Compras».
  - El lápiz de Walmart sigue disponible (D12).

### E2E-FIN-16: recordatorio después de 24 horas (SCRUM-92)

- **Cubre:** CA-02; D23, D24, D26 y reglas 63, 64 y 66.
- **Precondición:** sesión registrada simulada; pendientes: Walmart del 14 de octubre (4 días) y MaxiPali del 18 de octubre (11 horas). Corre en desktop y en Pixel 7.
- **Pasos:**
  1. Abrir `/finanzas/historial`.
  2. Tocar «Completarlas».
  3. Tocar «Dashboard».
- **Resultado esperado:**
  - **Historial:** se ve «Tienes 1 compra sin total desde hace más de 24 horas», sin `role="alert"` y sin botón para cerrarlo. La compra de 11 horas no cuenta.
  - **Sección «Compras sin total»:** lista las dos, de la más reciente a la más antigua, cada una con su badge y su lápiz. «Completarlas» lleva a esta sección.
  - **Dashboard:** la misma línea, con un enlace al Historial y sin ningún lápiz (D11).
  - **La petición** de pendientes filtra `total_amount=is.null` y `closed_at=not.is.null`, lleva `count=exact` y no filtra por dueño ni por fecha.

### E2E-FIN-17: completar una compra de un periodo anterior (SCRUM-92)

- **Cubre:** CA-03; D21, D25 y reglas 68 y 69.
- **Precondición:** sesión registrada simulada, con la zona guardada; pendientes: Walmart del 14 de octubre y Walmart del 20 de septiembre. Corre en desktop y en Pixel 7.
- **Pasos:**
  1. Abrir `/finanzas/historial` (₡15 000; la compra de septiembre no está en el periodo).
  2. En «Compras sin total», tocar «Editar total del domingo 20 de septiembre, Walmart», escribir `8000` y tocar «Guardar».
  3. Tocar el lápiz de Walmart del 14 de octubre en la sección, escribir `0` y tocar «Guardar».
- **Resultado esperado:**
  - **Septiembre:** `rpc/set_purchase_session_total` lleva la compra y `8000`, sin dueño ni zona. La compra sale de la sección sin recargar y el total de la semana sigue en ₡15 000. El recordatorio sigue en 1.
  - **Un solo campo** abierto en toda la pantalla mientras se edita (D21).
  - **14 de octubre:** sale de la sección y, en la lista de la semana, pasa a ₡0. «Compras» pasa de 2 a 3 y «Sin total» de 1 a 0. El recordatorio y la sección desaparecen.
  - No se volvieron a pedir las pendientes.

### E2E-FIN-18: error al leer las pendientes y reintento (SCRUM-92)

- **Cubre:** regla 67 y D6.
- **Precondición:** sesión registrada simulada; la primera lectura de pendientes responde `500`. Corre en desktop y en Pixel 7.
- **Pasos:**
  1. Abrir `/finanzas/historial`.
  2. Tocar «Reintentar» del recordatorio.
- **Resultado esperado:**
  - Se ve «No se pudo revisar si tienes compras sin total. Intenta de nuevo.» y «Reintentar», en el lugar del recordatorio, mientras el total de la semana (₡15 000) y su lista siguen visibles.
  - Al reintentar, aparece el recordatorio.
  - **Sin cuenta registrada:** E2E-FIN-04 y 08 también comprueban que no se pidan las pendientes.

### Cobertura de SCRUM-92

| Criterio | Escenarios E2E | Otros niveles |
|---|---|---|
| HU-61 CA-01 | E2E-FIN-15 | `FinanceComponents.test.tsx`, `PurchaseHistory.test.tsx`, manual |
| HU-61 CA-02 y D23 | E2E-FIN-16 | Función del corte (23 h 59 min y 24 h), `usePendingPurchases.test.ts`, ViewModels, manual |
| HU-61 CA-03 y D25 | E2E-FIN-17 | `usePurchaseHistoryViewModel.test.ts`, `PurchaseHistory.test.tsx`, manual contra la base |
| D21 entre las dos listas | E2E-FIN-17 | `useTotalEdit.test.ts` |
| D26 (solo Finanzas, sin descartar) | E2E-FIN-16 | Componentes y ViewModels |
| D27 (contraste) | — (no se mide en E2E) | Test del `Chip` y medición manual en los dos temas |
| Regla 67 (error) | E2E-FIN-18 | `usePendingPurchases.test.ts` |
| D6 | E2E-FIN-04 y 08 | `usePendingPurchases.test.ts` |
