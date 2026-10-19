# Plan: Finanzas — dashboard de gasto por periodo

El qué está en [SPEC.md](SPEC.md) y los pasos en [tasks.md](tasks.md).

## SCRUM-69: ver gasto total por periodo

> **Verificado el 2026-10-18** contra `develop` en `449b5a4`:
>
> - No existe nada de Finanzas: ni ruta, ni feature, ni ítem de navegación (`APP_NAV_ITEMS` lo deja para cuando tenga pantalla).
> - El gasto real vive en `purchase_sessions.total_amount` (`016`, `018`). Su RLS deja leer solo las compras propias, también a sesiones anónimas.
> - No hay presupuesto guardado en ningún lado.
> - Patrones a seguir:
>   - tabla del dueño con permisos por columna y RLS, más una RPC `security invoker` para escribir: `meal_plans` (`019`);
>   - rechazo de sesiones anónimas: las RPC de household (`011` a `024`), con `coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)`;
>   - en la pantalla: `getSessionStatus` (`utils/getSessionStatus.ts`).
> - La migración más alta en `develop` es la `024`; la `025` está en la rama de SCRUM-60 y ninguna rama tiene una `026` ni una `027`.

### Qué se reutiliza

| Pieza | Dónde está | Uso en SCRUM-69 |
|---|---|---|
| `purchase_sessions` y su RLS | `016`, `018` | Fuente del gasto, sin cambios |
| `getSupabaseClient()` y `auth.getSession()` | `services/supabase.client` | Leer la sesión guardada sin crear una anónima (nunca `ensureSession()`) |
| `getSessionStatus` y `SESSION_STATUS` | `utils/getSessionStatus.ts`, `constants/session.constants.ts` | Decidir si la sesión es de una cuenta registrada |
| `AUTH_ROUTE.LOGIN` | `constants/routes.constants.ts` | Enlace "Iniciar sesión" |
| `PRICE_FORMAT` | `constants/catalog.constants.ts` | Formato de un monto (`₡`, sin decimales), con un `Intl.NumberFormat` creado una sola vez como en `utils/formatPriceRange.ts` |
| `StatCard`, `Spinner`, `Button`, `Input` | `components/ui` | Datos de apoyo, carga, botones y campo del presupuesto |
| `APP_ROUTE`, `APP_NAV_ITEMS` | `constants/routes.constants.ts`, `components/app-shell/constants/` | `/finanzas` y el ítem "Finanzas" |
| Respuesta guardada con la clave de quien la pidió | `useProductSearch`, `useHouseholdMembers` | Descartar respuestas viejas al cambiar de periodo |
| Patrón de tabla del dueño + RPC `security invoker` | `019_meal_plans.sql` (`assign_meal_slot`) | Diseño de `spending_budgets` y `set_spending_budget` |
| Sesión registrada simulada (`signInAsFakeUser`) | `e2e/support/fake-session.ts` | E2E de la interfaz con una cuenta registrada, con respuestas de Supabase simuladas (ver "Pruebas") |

**No se toca `features/shopping-list/`.** Las reglas de monto ("Total gastado": dígitos, miles en grupos de 3, tope 9 999 999 999) y la medianoche local se implementan dentro de `features/finance/`, con sus propias constantes y tests. Es una repetición consciente (SPEC §15).

### Archivos

```
supabase/migrations/027_spending_budgets.sql      nueva (número provisional): tabla, RLS, permisos y set_spending_budget
supabase/tests/027_spending_budgets.test.sql       nueva: prueba SQL (transacción con assert y rollback)
types/database.types.ts                            + Tables.spending_budgets, Functions.set_spending_budget

constants/routes.constants.ts                      + APP_ROUTE.FINANCE ("/finanzas")
components/app-shell/constants/app-shell.constants.ts   + { href: APP_ROUTE.FINANCE, label: "Finanzas" }
app/(app)/finanzas/page.tsx                        nuevo: solo compone <FinanceDashboard />

features/finance/
  FinanceDashboard.tsx                             nuevo: "use client"; sin cuenta → aviso; con cuenta → dashboard
  components/
    FinanceNoAccount.tsx                           nuevo: aviso y enlace a /login
    SpendingPeriodSelector.tsx                     nuevo: Día / Semana / Mes (aria-pressed)
    SpendingTotal.tsx                              nuevo: gasto, fechas, StatCards, vacío y error
    SpendingBudget.tsx                             nuevo: monto, diferencia, editar, errores
    models/*Props.interface.ts                     nuevos
  constants/finance.constants.ts                   nuevo: SPENDING_PERIOD (+ tipo), FINANCE_ACCESS_STATUS, SPENDING_STATUS,
                                                   BUDGET_STATUS, BUDGET_AMOUNT (patrón, tope, separador), FINANCE_DB
                                                   (tabla, columnas, RPC), FINANCE_TEXT
  hooks/
    useFinanceDashboardViewModel.ts                nuevo: Facade; acceso, compone los dos hooks y arma las props
    usePeriodSpending.ts                           nuevo: carga por periodo, respuesta vieja, reintento
    useSpendingBudgets.ts                          nuevo: carga de los tres, edición, guardado, doble clic
  models/
    PeriodBounds.interface.ts                      nuevo: { start: Date; end: Date }
    PeriodSpending.interface.ts                    nuevo: { total, closedCount, withoutTotalCount }
  services/finance.service.ts                      nuevo: hasRegisteredSession, getPeriodSpending, getSpendingBudgets,
                                                   setSpendingBudget
  utils/
    getPeriodBounds.ts                             nuevo: (period, now) → PeriodBounds
    summarizeSpending.ts                           nuevo: filas → PeriodSpending
    parseBudgetAmount.ts                           nuevo: texto → monto | inválido (vacío es inválido)
    formatPeriodRange.ts                           nuevo: PeriodBounds → "Lunes 12 a domingo 18 de octubre"
    formatColones.ts                               nuevo
  tests/
    getPeriodBounds.test.ts, summarizeSpending.test.ts, parseBudgetAmount.test.ts, formatPeriodRange.test.ts,
    finance.service.test.ts, usePeriodSpending.test.ts, useSpendingBudgets.test.ts,
    FinanceDashboard.page.ts, FinanceDashboard.test.tsx
  specs/E2E.md                                     nuevo (antes de la pantalla): escenarios E2E-FIN-nn

e2e/features/finance/
  finance.spec.ts, finance.helpers.ts              nuevos: sesión registrada y respuestas de Supabase simuladas

docs/documento-proyecto.md                         §4.2.1 (este PR, planificación) y §6 (al implementar la tabla)
```

### Datos

**Acceso** (`finance.service.ts`):

- `hasRegisteredSession()`: `getSupabaseClient().auth.getSession()` y `getSessionStatus(session) === SESSION_STATUS.AUTHENTICATED`.
- No crea sesiones. Es la misma idea que `hasRegisteredSession` de household, escrita en Finanzas para no importar de otra feature.

**Gasto** (sin cambios en la base; solo se llama con sesión registrada):

```ts
getSupabaseClient()
  .from("purchase_sessions")
  .select("total_amount")
  .gte("closed_at", bounds.start.toISOString())
  .lt("closed_at", bounds.end.toISOString())
```

- La RLS deja solo las compras propias (D4). El filtro por `closed_at` deja fuera las abiertas (D3), porque `closed_at` nulo no cumple `>=`.
- `summarizeSpending`:
  - `total`: la suma de los `total_amount` no nulos;
  - `closedCount`: cuántos sumaron;
  - `withoutTotalCount`: cuántos son nulos.
- Un mes de compras de una persona son pocas filas, así que se suman en el cliente. Si alguna vez pesa, se pasa a una RPC de agregación (deuda).
- Índice: `purchase_sessions` tiene (`owner_id`, `store_id`, `started_at`), no `closed_at`. Con el volumen actual no hace falta otro.
- **Lo que esta consulta no cambia:** la RLS de `purchase_sessions` no distingue sesiones anónimas (SPEC regla 7). Finanzas no la llama sin cuenta, pero una sesión anónima puede leer **sus propias** compras por la API, como ya pasa hoy por el modo compra. Cambiarlo está fuera de esta historia (rompería el modo compra anónimo).

**Presupuesto** (`027_spending_budgets.sql`, número provisional):

```sql
create table public.spending_budgets (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  period text not null check (period in ('day', 'week', 'month')),
  amount numeric(12, 2) not null check (amount <> 'NaN' and amount >= 0 and amount = trunc(amount)),
  primary key (owner_id, period)
);
```

- `amount = trunc(amount)` deja solo colones enteros. `NaN` necesita su propia condición: en Postgres `NaN` es igual a sí mismo y mayor que cualquier número, así que ni `>= 0` ni `= trunc(amount)` lo rechazan (mismo motivo que el check de la `018`). El tope (9 999 999 999) sale de `numeric(12, 2)` con colones enteros.
- Permisos (mismo esquema que `019`):
  - `alter table … enable row level security`;
  - `revoke all on public.spending_budgets from public, anon, authenticated`;
  - `grant select, delete`, `grant insert (period, amount)` y `grant update (amount)` a `authenticated`. `owner_id` sale de su default y no se puede escribir.
- Políticas, todas `to authenticated`, con la misma condición de dueño registrado:

  ```sql
  owner_id = (select auth.uid())
  and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  ```

  - `"registered owner reads own budgets"` (select, `using`);
  - `"registered owner creates own budgets"` (insert, `with check`);
  - `"registered owner updates own budgets"` (update, `using` y `with check`);
  - `"registered owner removes own budgets"` (delete, `using`).

  La condición del JWT es la misma que usan las RPC de household (`011` a `024`); acá va en las políticas porque la tabla se lee directo. `(select …)` evita que se evalúe por fila, como en `019`.
- `set_spending_budget(budget_period text, budget_amount numeric) returns public.spending_budgets`:
  1. sin `auth.uid()` o con `is_anonymous` → `42501` (mismo bloque que `leave_household`);
  2. periodo fuera de `day` / `week` / `month`, o monto nulo, negativo, con decimales, `NaN` o mayor que 9 999 999 999 → `22023` (antes que el check, para un error claro);
  3. `insert into public.spending_budgets (period, amount) values (…) on conflict (owner_id, period) do update set amount = excluded.amount returning *`.
- `security invoker`, `set search_path = ''`, nombres calificados, `revoke execute … from public, anon`, `grant execute … to authenticated`. Como en `assign_meal_slot`, la RLS y los permisos por columna aplican igual dentro de la función: aunque el paso 1 faltara, las políticas rechazarían a un anónimo.
- Lectura en el cliente: `from("spending_budgets").select("period, amount")` → `Record<SpendingPeriodType, number | null>`. Un periodo desconocido en una fila hace fallar la carga (como el rol desconocido en household); no se ignora.
- **Sin trigger ni columna de fechas:** la pantalla no muestra cuándo se cambió (YAGNI).

**Verificaciones necesarias** (no se dan por hechas):

- **Antes de crear la migración:** que `027` siga libre en `develop` y en los PRs abiertos.
- **Antes de aplicarla:** `security-reviewer`; y en la base, que las sesiones anónimas lleven `is_anonymous: true` en el JWT. Así lo suponen las RPC de household y sus pruebas SQL (`019`, `023`, `024`), pero se confirma con una sesión anónima real.
- **Después de aplicarla:** la prueba SQL (abajo) y una comprobación de los permisos efectivos (`information_schema.role_table_grants` / `role_column_grants` para `spending_budgets` y `pg_proc.proacl` para la RPC), como en SCRUM-60.
- **En la pantalla:** que una sesión anónima no dispare ninguna llamada a `purchase_sessions` ni a `spending_budgets` (test del ViewModel y de la pantalla con el servicio simulado).

### Periodos

`getPeriodBounds(period, now)` con `new Date(año, mes, día)` en hora local:

| Periodo | `start` | `end` |
|---|---|---|
| `day` | `new Date(y, m, d)` | `new Date(y, m, d + 1)` |
| `week` | `new Date(y, m, d - ((now.getDay() + 6) % 7))` (lunes) | `start` + 7 días por calendario |
| `month` | `new Date(y, m, 1)` | `new Date(y, m + 1, 1)` |

- `Date` normaliza los desbordes: `new Date(2026, 11, 32)` es el 1 de enero de 2027, y `new Date(2026, 12, 1)` también. Por eso los cruces de mes y de año salen sin casos especiales.
- Se suman días por calendario, no 86 400 000 ms, para no depender de horarios de verano (Costa Rica no tiene, pero el cálculo no lo supone).
- Los tests fijan `now` con fechas construidas en hora local (`new Date(2026, 9, 18, 15, 0)`), así no dependen de la zona horaria de la máquina.

### Flujo

1. `/finanzas` monta `FinanceDashboard`. El Facade lee la sesión (`checking`):
   - sin cuenta registrada → `noAccount`, y no se llama a nada más;
   - con cuenta → `registered`.
2. Con cuenta, arranca en `week`; `usePeriodSpending` y `useSpendingBudgets` cargan en paralelo.
3. **Gasto:** con los límites del periodo pide `getPeriodSpending` → `ready`, `empty` o `failed`. Cada respuesta se guarda con la clave `periodo + inicio` y solo se muestra si coincide con la elegida.
4. **Cambio de periodo:** cambia el estado local y vuelve al paso 3, sin navegar (CA-02). Si había una edición abierta, se descarta. El presupuesto no se vuelve a pedir.
5. **Presupuesto:** `getSpendingBudgets` → `viewing` con los tres montos, o `loadFailed`.
6. **Editar:** "Editar/Definir presupuesto" → `editing` (campo con el monto actual) → "Guardar":
   - valida con `parseBudgetAmount`; si no pasa, el error queda en `editing` sin llamar a la base;
   - si pasa → `saving` (guarda `useRef` contra doble clic) → `setSpendingBudget(period, amount)`;
   - si sale bien → `viewing` con la fila devuelta y el aviso "Presupuesto guardado";
   - si falla → `saveFailed`, conservando lo escrito.
7. "Reintentar" del gasto vuelve a pedir el mismo periodo (con límites recalculados); el del presupuesto vuelve a pedir los tres. Si una llamada falla y al volver a leer la sesión ya no es registrada, la pantalla pasa a `noAccount`.

### Seguridad

- **Acceso:** la pantalla no consulta ni escribe sin cuenta registrada, y la base lo exige para los presupuestos (políticas y RPC). Ver "Verificaciones necesarias".
- **Gasto:** solo lectura, con la RLS existente de `purchase_sessions`. No se agregan permisos. Sigue la limitación conocida de anónimos sobre sus propias compras (arriba).
- **Presupuesto:**
  - el cliente nunca manda `owner_id`: lo pone el default y lo exigen las políticas;
  - permisos por columna, para que no se pueda escribir el dueño ni cambiar el periodo de una fila;
  - un usuario no puede leer ni modificar presupuestos ajenos;
  - la RPC es `security invoker`: no amplía permisos;
  - montos y periodos inválidos se rechazan en la función y en los checks.
- `security-reviewer` sobre la migración antes de aplicarla.

### Pruebas

**Vitest** (CI las corre con `npm test`):

| Unidad | Casos |
|---|---|
| `getPeriodBounds` | Día, semana y mes con `now` fijo; domingo y lunes; semana que cruza de mes (lun 29 sep – dom 5 oct 2025) y de año (lun 28 dic 2026 – dom 3 ene 2027); 31 de diciembre; febrero de 2027 (28 días) y de 2028 (29); `now` a las 00:00 exactas y a las 23:59 |
| `summarizeSpending` | Vacío; solo con total; con y sin total (los nulos se cuentan aparte, no como 0); decimales |
| `parseBudgetAmount` | Vacío, letras, negativos, decimales, grupos de miles mal formados, el tope y el tope + 1; "50000", "50 000", "50.000", "0" |
| `formatPeriodRange` y `formatColones` | Un día, una semana que cruza de mes y un mes |
| `finance.service` | Sesión registrada, anónima y ausente (sin crear sesión); tabla, columna y filtros exactos (`gte`/`lt` con ISO); RPC y argumentos exactos; mapeo de los tres presupuestos; periodo desconocido → error; errores que se propagan |
| `usePeriodSpending` | Arranca en `loading`; `ready`/`empty`/`failed`; cambio de periodo pide los límites nuevos; respuesta vieja descartada; reintento |
| `useSpendingBudgets` | Carga y `loadFailed`; editar y cancelar; validación sin llamar a la base; guardar bien; `saveFailed` conserva lo escrito; doble clic → una llamada; respuesta después de desmontar ignorada |
| `useFinanceDashboardViewModel` | `checking` → `noAccount` sin ninguna llamada de datos (sin sesión y con sesión anónima); `registered` carga los dos |
| Pantalla (jsdom, Page Object) | Sin cuenta (aviso y enlace a `/login`); CA-01 (tres opciones, Semana elegida, ítem de navegación); CA-02 (cambiar periodo cambia el total y se anuncia, sin navegar); CA-03 (sin presupuesto, definir, editar, diferencia en palabras, "No incluye N compras sin total"); vacío; errores separados; foco y `aria-*` |

**Prueba SQL** (`supabase/tests/027_spending_budgets.test.sql`, formato de la `023` / `025`: `begin … rollback`, `assert`, `set local role authenticated` y `request.jwt.claims` con `is_anonymous`, como el paso de anónimos de la `019` y la `023`):

- **Permisos:** `public` y `anon` sin `execute` en la RPC; ningún permiso de tabla para `anon`; las columnas exactas de `insert` y `update` para `authenticated`.
- **Sin sesión:** la RPC responde `42501`.
- **Sesión anónima** (`is_anonymous: true`):
  - la RPC responde `42501`;
  - `select` sobre la tabla no devuelve filas, aunque existan filas con su `owner_id`;
  - `insert`, `update` y `delete` directos no afectan ninguna fila o se rechazan por la RLS.
- **Dueño registrado:**
  - crea los tres periodos y quedan independientes;
  - reemplazar deja una sola fila con el monto nuevo.
- **Otro usuario registrado:**
  - no ve, no cambia y no borra los presupuestos del primero, ni por la tabla ni por la RPC (la RPC solo escribe los propios);
  - no puede insertar con el `owner_id` de otro;
  - `update` de `period` u `owner_id` se rechaza por falta de permiso de columna.
- **Validaciones:** `22023` por periodo inválido y por monto nulo, negativo, con decimales, `NaN` y sobre el tope; los checks rechazan lo mismo por `insert` directo.

La corre la dueña de la historia contra la base, después de aplicar la migración (como la `023` a la `025`).

**E2E (Playwright)** — qué permite la infraestructura actual:

- **Cómo se corre:** `npm run e2e` (`playwright test`), o solo esta feature con `npx playwright test e2e/features/finance`. Sin `PLAYWRIGHT_BASE_URL`, levanta `npm run dev` solo. Proyectos `chromium` y `mobile-chrome`. No corre en CI (`.github/workflows/ci.yml` solo corre lint, test y build).
- **Requisitos del entorno:**
  - `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`e2e/support/supabase.ts` falla con un mensaje claro si faltan). El 2026-10-18 el archivo existe y tiene las dos.
  - Chromium de Playwright instalado (`npx playwright install chromium`). El 2026-10-18 no se encontró en la ruta por defecto: se instala antes de correr.
- **Cuentas registradas: lo que existe y lo que no.**
  - Los E2E actuales con un usuario registrado (`login-inactivity`, `reset-password`) usan `e2e/support/fake-session.ts`. Esa sesión es falsa: el usuario no existe en la base y `stubSupabaseApi` responde desde el test todas las llamadas a Supabase. Sirve para probar la pantalla con una sesión **registrada** (`is_anonymous: false`) sin tocar la base.
  - **No existe** soporte para iniciar sesión con una cuenta registrada **real** contra la base compartida:
    - no hay cuentas de prueba para E2E ni variables para sus credenciales (`.env.example` no tiene ninguna);
    - el login de la app pasa por reCAPTCHA (Edge Function `login-with-recaptcha`), que un test no puede resolver;
    - un inicio de sesión directo con contraseña contra Supabase Auth solo funcionaría si la protección con captcha de Auth no está activada en el proyecto, y eso no está verificado;
    - además, las compras de prueba no se pueden borrar desde el cliente (no hay `delete` en `purchase_sessions`), así que con una cuenta fija los totales cambian entre corridas.
- **E2E de esta historia (decidido el 2026-10-19): sesión registrada simulada y respuestas de Supabase simuladas.**
  - **Qué validan:** la interfaz de Finanzas en un navegador real (desktop y mobile), para una cuenta registrada y sin cuenta.
  - **Qué no validan:** la autenticación real (login, reCAPTCHA, tokens) ni la seguridad de la base (RLS, permisos, RPC). Eso lo cubren la prueba SQL y las pruebas manuales de abajo.
  - **Cómo:**
    - `signInAsFakeUser` (`e2e/support/fake-session.ts`) para la sesión registrada;
    - respuestas simuladas por ruta (`page.route` sobre `purchase_sessions`, `spending_budgets` y `rpc/set_spending_budget`) en `e2e/features/finance/finance.helpers.ts`, en lugar del `stubSupabaseApi` genérico (que responde `[]` a todo);
    - las fechas de las compras simuladas se arman a partir de la fecha del navegador, para que caigan siempre en el periodo en curso.
  - **Escenarios** (se detallan en `features/finance/specs/E2E.md`):
    - **E2E-FIN-01** (CA-01, CA-02): abrir Finanzas desde la navegación; Semana elegida; total y "Sin total" según las compras simuladas; cambiar a Día y a Mes cambia el total sin recargar ni navegar.
    - **E2E-FIN-02** (CA-03): sin presupuesto → definirlo → la diferencia; editarlo; la llamada a la RPC lleva el periodo y el monto; los otros periodos siguen sin presupuesto.
    - **E2E-FIN-03:** un monto inválido muestra el error y no llama a la RPC; un error de guardado (respuesta simulada con error) conserva lo escrito; un error al cargar el gasto muestra "Reintentar".
    - **E2E-FIN-04** (D6, interfaz): sin sesión, aviso y enlace a `/login`, sin llamadas a `purchase_sessions` ni a `spending_budgets`.
- **Mejora futura (no bloquea esta historia):** un E2E con autenticación real contra la base compartida. Necesitaría:
  1. cuentas de prueba creadas en Supabase;
  2. sus credenciales solo en `.env.local` (y en `.env.example` sin valores), nunca en el repo;
  3. confirmar en el panel de Supabase si la protección con captcha de Auth está activada;
  4. según eso, un helper en `e2e/support/` que obtenga la sesión sin la interfaz de login;
  5. asserts sobre diferencias (el total antes y después), porque las compras quedan en la base.

**Manual** (la única prueba de la autenticación real; con capturas sin correos):

- **Acceso real con cuenta registrada:** iniciar sesión con una cuenta registrada y, contra la base compartida:
  - cerrar compras reales (con y sin total, hoy y otro día de la semana);
  - recorrer CA-01 a CA-03;
  - definir y editar los tres presupuestos y recargar para ver que se guardaron.
- **Sesión anónima real (D6):** sin cuenta, usar `/lista` (crea una sesión anónima) y abrir `/finanzas`. Debe verse el aviso con el enlace a `/login`, y en la pestaña de red de DevTools no debe haber llamadas a `purchase_sessions` ni a `spending_budgets`.
- **D4:** dos cuentas registradas de la misma familia; las compras de una no suman en la otra.
- Teclado, lector de pantalla y mobile.

Para entrar con la cuenta en local ver SPEC §15.

### Número de la migración

- `develop` (2026-10-18): `000` a `024`.
- Ramas abiertas: `025` (SCRUM-60, #68). La `026` está planificada en SCRUM-61 (#69) pero todavía no existe.
- Ninguna rama local ni remota tiene una `027`. **Propuesta provisional: `027_spending_budgets.sql`.** Se vuelve a revisar `develop` y los PRs abiertos justo antes de crear el archivo y antes del merge (`supabase/README.md`); si alguien tomó el número, se renombra antes de aplicarla. Se aplica en una transacción con su fila del historial y no se edita después de aplicada.

### Dependencias y Gitflow

- La rama `ticket/SCRUM-69-gasto-total-periodo` sale de `develop` actualizado (`449b5a4`).
- No depende de PRs sin mergear: el PR se abre con label `in progress`. La autora no tiene otro en `in progress` (#68 en `waiting qa`, #69 en `on hold`).
- Fuera de `features/finance/` solo toca `constants/routes.constants.ts`, `components/app-shell/constants/app-shell.constants.ts`, `app/(app)/finanzas/page.tsx`, `types/database.types.ts`, la migración y su prueba, y `docs/documento-proyecto.md`. Se trae `develop` antes de `waiting qa`.

### Documento del proyecto

- **En este PR (planificación):** §4.2.1, una línea con lo decidido sobre el presupuesto del dashboard y el acceso solo con cuenta.
- **Al implementar la tabla:** §6, `spending_budgets`.
- **Al cerrar:** §4.2 con lo implementado.

### Commits y PR

El PR se abre con el commit 1, hacia `develop`, con label `in progress`.

| # | Commit | Archivos |
|---|---|---|
| 1 | `docs(SCRUM-69): add spending by period planning` | `features/finance/specs/SPEC.md`, `plan.md`, `tasks.md`, `docs/documento-proyecto.md` |
| 2 | `feat(SCRUM-69): add spending budgets table` | la migración de presupuestos y su prueba SQL |
| 3 | `feat(SCRUM-69): add spending budgets to database types` | `types/database.types.ts`, `documento-proyecto.md` §6 |
| 4 | `feat(SCRUM-69): add period bounds, spending summary and budget amount utils` | utils de `features/finance/` y sus tests |
| 5 | `feat(SCRUM-69): add finance service` | constantes del servicio, modelos, servicio y su test |
| 6 | `feat(SCRUM-69): add finance dashboard view model` | constantes del flujo, hooks y sus tests |
| 7 | `docs(SCRUM-69): add finance E2E plan` | `features/finance/specs/E2E.md` |
| 8 | `feat(SCRUM-69): show spending by period in Finanzas` | componentes, pantalla, ruta, navegación, Page Object y tests |
| 9 | `test(SCRUM-69): add finance E2E` | `e2e/features/finance/` |
| 10 | `docs(SCRUM-69): …` | `tasks.md`, `documento-proyecto.md` §4.2, SPEC §13 con lo validado |

Staging explícito, nunca `git add .`.

### Riesgos

- **El E2E no prueba la autenticación real ni la base:** con la sesión y las respuestas simuladas solo valida la interfaz. Si las respuestas simuladas se alejan de las reales, el E2E puede pasar con un contrato roto. Lo mitigan los tests del servicio (nombres y argumentos exactos), la prueba SQL y las pruebas manuales. El E2E con autenticación real queda como mejora futura.
- **Tamaño:** con la tabla, la RPC, la edición y el E2E, la historia supera sus 3 puntos. Si hace falta, el E2E o la edición se pueden partir en una tarea aparte (decisión del equipo).
- **Anónimos y sus propias compras:** la RLS de `purchase_sessions` no cambia (SPEC regla 7).
- **Hora del dispositivo:** si el reloj está mal, el periodo también; es el mismo supuesto que el modo compra.
- **Compras sin total:** se muestran aparte; el total puede verse bajo hasta que HU-60/61 permitan completarlas.
- **Reglas de monto repetidas** con "Total gastado" del modo compra (SPEC §15).
