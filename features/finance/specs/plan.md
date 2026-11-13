# Plan: Finanzas — dashboard de gasto por periodo e historial de compras

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
  amount numeric not null
    check (amount <> 'NaN' and amount >= 0 and amount <= 9999999999 and amount = trunc(amount)),
  primary key (owner_id, period)
);
```

- `amount = trunc(amount)` deja solo colones enteros.
- `NaN` necesita su propia condición: en Postgres `NaN` es igual a sí mismo y mayor que cualquier número, así que ni `>= 0` ni `= trunc(amount)` lo rechazan (mismo motivo que el check de la `018`).
- El tope (9 999 999 999) es explícito y deja fuera `±Infinity`.
- **`numeric` sin precisión**, a propósito (revisión de seguridad, 2026-10-19): con `numeric(12, 2)`, un insert directo de `12.004` se redondearía a 12 en silencio antes del check; así se rechaza, igual que en la RPC.
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

## SCRUM-90: ver historial de sesiones de compra

> **Verificado el 2026-10-31** contra `develop` en `af38bd5`:
>
> - `/finanzas` solo tiene el Dashboard, sin sub-tabs (D5).
> - `purchase_sessions` ya tiene lo necesario y `types/database.types.ts` ya incluye su FK a `stores`. No hace falta migración.
> - `stores` tiene lectura abierta. `getStores` (shopping-list) ya la lee.
> - `isRouteActive` acepta subrutas: "Finanzas" sigue activa en `/finanzas/historial`.

### Qué se reutiliza

| Pieza | Uso en SCRUM-90 |
|---|---|
| `SpendingPeriodSelector`, `SPENDING_PERIOD*`, `DEFAULT_SPENDING_PERIOD` | Selector, sin cambios |
| `SpendingTotal`, `SPENDING_STATUS`, `SPENT_LABEL` | Total, contadores, vacío, error y reintento, sin cambios |
| `FinanceNoAccount`, `hasRegisteredSession` | Acceso, sin cambios |
| `getPeriodBounds`, `summarizeSpending`, `formatColones`, `formatPeriodRange` | Límites, total y formatos |
| `PriceDisclaimer` | Aviso debajo del total |
| `RecipesTabs` | Solo como patrón de `FinanceTabs` |
| `signInAsFakeUser` y `finance.helpers.ts` | E2E |

**Único refactor:** el acceso y `retryIfRegistered` de `useFinanceDashboardViewModel` pasan a `useFinanceAccess`, para que los dos ViewModels no los repitan. No cambia el comportamiento; lo protegen los tests actuales.

### Archivos

```
constants/routes.constants.ts                      + APP_ROUTE.FINANCE_HISTORY ("/finanzas/historial")
app/(app)/finanzas/historial/page.tsx              nuevo: solo compone <PurchaseHistory />

features/finance/
  PurchaseHistory.tsx                              nuevo: "use client"; sin cuenta → aviso; con cuenta → Historial
  FinanceDashboard.tsx                             + <FinanceTabs /> con cuenta registrada; comentario de D5
  components/
    FinanceTabs.tsx                                nuevo: Dashboard / Historial (links, aria-current)
    PurchaseSessionRow.tsx                         nuevo: fecha, supermercado y monto
    models/FinanceTabsProps.interface.ts           nuevo
    models/PurchaseSessionRowProps.interface.ts    nuevo
  constants/finance.constants.ts                   + FINANCE_TAB (+ tipo), FINANCE_TABS, FINANCE_DB.SELECT.PURCHASES,
                                                   columna id y textos
  hooks/
    useFinanceAccess.ts                            nuevo: extraído de useFinanceDashboardViewModel
    useFinanceDashboardViewModel.ts                usa useFinanceAccess
    usePeriodPurchases.ts                          nuevo: carga por periodo, respuesta vieja, reintento
    usePurchaseHistoryViewModel.ts                 nuevo: Facade; acceso, periodo y props de la pantalla
  models/PeriodPurchase.interface.ts               nuevo
  services/finance.service.ts                      + getPeriodPurchases
  utils/
    formatPeriodRange.ts                           exporta formatDay ("Domingo 18 de octubre"), sin cambiar su salida
  tests/
    finance.service.test.ts                        + getPeriodPurchases
    formatPeriodRange.test.ts                      + formatDay
    useFinanceAccess.test.ts, usePeriodPurchases.test.ts,
    usePurchaseHistoryViewModel.test.ts, PurchaseHistory.page.ts, PurchaseHistory.test.tsx   nuevos

e2e/features/finance/
  purchase-history.spec.ts                         nuevo
  finance.helpers.ts                               + respuestas del Historial
  finance.spec.ts                                  E2E-FIN-01 ya no exige "sin sub-tabs"

docs/documento-proyecto.md                         §4.6, al cerrar
```

### Datos

```ts
getSupabaseClient()
  .from("purchase_sessions")
  .select("id, closed_at, total_amount, stores(display_name)", { count: "exact" })
  .gte("closed_at", bounds.start.toISOString())
  .lt("closed_at", bounds.end.toISOString())
  .order("closed_at", { ascending: false })
  .order("id")
```

- `getPeriodPurchases(bounds)` valida los límites igual que `getPeriodSpending` y comparte con ella esa validación.
- **Resultados completos (SPEC regla 30):** si `count` es nulo o distinto de las filas recibidas, lanza un error y la pantalla pasa a `failed`. La consulta no usa `.limit()` ni `.range()`, pero el servidor puede cortar la respuesta sin avisar, y el repo no tiene `supabase/config.toml` para ver ese valor. Se confirma en el panel de Supabase, sin depender solo de eso.
- Mapea cada fila a `PeriodPurchase`. Un nombre nulo o en blanco no es un error: la fila muestra "Supermercado no disponible" (SPEC regla 29). Se comprueba en ejecución, porque los tipos generados no lo avisan. Un error real de la consulta sigue yendo a `failed`.
- El total sale de `summarizeSpending(purchases.map(...))`, sin otra consulta.
- `closed_at` nulo no cumple `>=`, así que las abiertas quedan fuera. La RLS deja solo las propias.
- Índice: el mismo criterio de SCRUM-69; con este volumen no hace falta otro.

### Flujo

1. `/finanzas/historial` monta `PurchaseHistory`. `useFinanceAccess` lee la sesión: sin cuenta, `noAccount` y ninguna consulta.
2. Con cuenta, arranca en `week` y `usePeriodPurchases` pide las compras.
3. Cada respuesta se guarda con la clave `periodo:reintentos`; solo se muestra si coincide con la actual.
4. El ViewModel arma las props de `SpendingPeriodSelector`, `SpendingTotal` y las filas.
5. Cambiar de periodo vuelve al paso 2 sin navegar. "Reintentar" relee la sesión y pide el mismo periodo.
6. Los tabs son links: cada pantalla se monta de nuevo y arranca en Semana (D9).

### Seguridad

- Solo lectura, con la RLS existente: no se agregan permisos ni se manda `owner_id`.
- Solo se piden las columnas que se muestran, más `id` para la `key` y el orden.
- `getSession`, nunca `ensureSession`.
- Los datos vienen de la base y se dibujan como texto, sin HTML.
- `security-reviewer` sobre el cambio antes de `waiting qa`.

### Pruebas

**Vitest:**

| Unidad | Casos |
|---|---|
| `finance.service` | Tabla, `select`, `count: "exact"`, filtros y orden exactos; mapeo; total nulo y total 0; supermercado nulo o en blanco sin error; conteo nulo o distinto de las filas → error; límites inválidos; errores que se propagan |
| `formatDay` | Un día con hora local fija; cierre cerca de la medianoche, con fechas construidas en hora local |
| `useFinanceAccess` | `checking`; registrada; anónima y sin sesión; error al leer la sesión; reintento con la sesión vencida |
| `usePeriodPurchases` | No pide sin cuenta; `loading`/`ready`/`empty`/`failed`; cambio de periodo; respuesta vieja descartada; reintento; desmontaje |
| `usePurchaseHistoryViewModel` | Arranca en Semana; textos de cada fila ("Sin total", ₡0 y "Supermercado no disponible"); total desde las mismas filas; mensaje de `status` |
| Pantalla (jsdom, Page Object) | Sin cuenta, sin tabs y sin consultas; tab activo; fila completa; supermercado no disponible; cambio de periodo; vacío y error sin lista; `PriceDisclaimer` una vez en carga, listo, vacío y error |
| `FinanceDashboard` | Se agrega la barra con "Dashboard" activo; lo demás no cambia |

**SQL:** no hay prueba nueva, porque no hay migración.

**E2E:** E2E-FIN-05 a 08, en [E2E.md](E2E.md). Sesión y respuestas simuladas, como en SCRUM-69. El helper responde con `Content-Range`, porque sin ese header `count` llega nulo.

**Manual:** los de SPEC §13, contra la base compartida, porque el E2E no comprueba la consulta real a `stores`.

### Commits y PR

El PR se abre con el commit 1, hacia `develop`, con label `in progress`, si no hay otro PR propio en ese estado (gitflow).

| # | Commit | Archivos |
|---|---|---|
| 1 | `docs(SCRUM-90): add purchase history planning` | `features/finance/specs/SPEC.md`, `plan.md`, `tasks.md`, `E2E.md` |
| 2 | `feat(SCRUM-90): add period purchases service` | constantes, modelo, servicio y su test |
| 3 | `refactor(SCRUM-90): extract finance access hook` | `useFinanceAccess`, `useFinanceDashboardViewModel` y sus tests |
| 4 | `feat(SCRUM-90): add purchase history view model` | `usePeriodPurchases`, `usePurchaseHistoryViewModel`, formato de fecha y sus tests |
| 5 | `feat(SCRUM-90): show purchase history in Finanzas` | componentes, pantallas, ruta, Page Object y tests |
| 6 | `test(SCRUM-90): add purchase history E2E` | `e2e/features/finance/` |
| 7 | `docs(SCRUM-90): record validation` | `tasks.md`, SPEC §13, `documento-proyecto.md` §4.6 |

Staging explícito, nunca `git add .`.

### Riesgos

- **Historial limitado:** al empezar un mes o una semana no se ven los anteriores (D7). Queda como limitación conocida.
- **Contrato simulado:** el E2E no llega a la base; lo mitigan los tests del servicio y la prueba manual con `stores` real.
- **Compras sin total:** el total puede verse bajo hasta HU-60 y HU-61.
- **Redondeo:** el total puede diferir ₡1 de la suma visible (SPEC regla 28).

### Deuda de SCRUM-69

`getPeriodSpending` del Dashboard tiene el mismo riesgo de corte silencioso y no ordena sus filas. Con más filas que el límite del servidor, el Dashboard podría mostrar un total incompleto o distinto al del Historial. No se cambia en esta historia.

## SCRUM-91: editar el total de una sesión o periodo

> **Verificado el 2026-11-02** contra `develop` en `9a6ec22`:
>
> - `016` y `018` no cambiaron: la política de update solo acepta compras abiertas y el trigger pone `now()` en todo update con `closed_at` no nulo.
> - Ninguna migración posterior redefine ese trigger ni agrega políticas a `purchase_sessions`.
> - `getPeriodSpending` no comprueba el conteo.
> - `Icon` envuelve `lucide-react`, ya instalado.

### Qué se reutiliza

| Pieza | Uso en SCRUM-91 |
|---|---|
| `useSpendingBudgets` y `SpendingBudget` | Solo como patrón: doble clic, desmontaje, foco, Escape y errores |
| `parseBudgetAmount` y `BUDGET_AMOUNT` | Mismas reglas; se renombran a `parseColonesAmount` y `COLONES_AMOUNT`, sin cambiar su comportamiento |
| `useFinanceAccess` | Acceso y `retryIfRegistered` |
| `usePeriodPurchases`, `usePeriodSpending`, `summarizeSpending` | Se extienden con los ajustes |
| `027` (`is_anonymous`), `016` (`pg_advisory_xact_lock`), `023` (`security definer`) | Patrones de la migración |
| `Icon` y `signInAsFakeUser` | Lápiz y E2E |

### Archivos

```
supabase/migrations/040_edit_purchase_totals.sql   nueva: trigger, dos tablas, índice, RLS y cinco RPC
supabase/tests/040_edit_purchase_totals.test.sql   nueva: prueba SQL
supabase/tests/040_time_zone_sweep.test.sql       nueva: barrido de cambios de horario, 1970-2035
types/database.types.ts                            + spending_adjustments y las dos RPC

features/finance/
  PurchaseHistory.tsx                              compone el editor del total y las filas de ajuste
  FinanceDashboard.tsx                             sin cambios de interfaz
  components/
    InlineTotalEditor.tsx                          nuevo: campo, Guardar, Cancelar, foco y errores (dos usos reales)
    EditTotalButton.tsx                            nuevo: lápiz con nombre accesible
    PeriodAdjustmentRow.tsx                        nuevo: fecha, "Ajuste manual" y monto con signo
    PurchaseSessionRow.tsx                         + lápiz y campo
    SpendingTotal.tsx                              + zona opcional para el lápiz (el Dashboard no la usa) y texto
                                                   opcional "Incluye ajustes manuales" (solo el Dashboard)
    models/*Props.interface.ts                     nuevos y extendidos
  constants/finance.constants.ts                   + TOTAL_EDIT_STATUS (+ tipo), TOTAL_EDIT_TARGET,
                                                   TOTAL_SAVE_ERROR_CODE, tabla, RPC, select, textos;
                                                   BUDGET_AMOUNT pasa a COLONES_AMOUNT
  hooks/
    useTotalEdit.ts                                nuevo: el único campo abierto (D21), validación, guardado y errores
    usePeriodPurchases.ts                          + ajustes y aplicar lo guardado sin recargar
    usePeriodSpending.ts                           pide el gasto con ajustes
    usePurchaseHistoryViewModel.ts                 compone useTotalEdit y arma filas y lápices
    useFinanceDashboardViewModel.ts                pasa el periodo al gasto y arma la indicación de ajustes; no edita
  models/
    PeriodAdjustment.interface.ts                  nuevo
    TotalMutations.interface.ts                    nuevo: Payload y Response de las dos RPC, y error tipado
    PeriodSpending.interface.ts                    + adjustmentCount
  services/finance.service.ts                      + setPurchaseTotal, setPeriodTotal, lectura con get_period_finance;
                                                   getPeriodSpending corregido (D19)
  utils/
    parseColonesAmount.ts                          renombrado desde parseBudgetAmount
    summarizeSpending.ts                           + montos de ajustes
    formatSignedColones.ts                         nuevo: "+₡5 000" / "−₡5 000"
  tests/                                           ver "Pruebas"

e2e/features/finance/
  edit-totals.spec.ts                              nuevo
  finance.helpers.ts                               + ajustes, RPC y conteo del gasto

docs/documento-proyecto.md                         §4.6 y §6, al implementar y cerrar
```

### Datos

**Migración, en este orden:**

1. **Trigger.** `create or replace` de `stamp_purchase_session_close`: si `old.closed_at` no es nulo, `new.closed_at := old.closed_at`; si no, se comporta como hoy.
2. **Tabla** `spending_time_zones`: la zona confirmada por persona, solo lectura para el cliente. Sin backfill (SPEC regla 59).
3. **Tabla** `spending_adjustments`, con permisos y política (SPEC §12). `amount` es `numeric(18, 2)` porque suma muchas compras de hasta `numeric(12, 2)`. No guarda sus periodos: salen de `effective_at` y de la zona.
4. **Funciones internas**, sin `execute` para el cliente:
   - cuenta registrada, monto y forma de la zona;
   - zona guardada, o `null` sin zona, o `TZ002` si PostgreSQL ya no la reconoce; para editar, `TZ001` sin zona;
   - límites de día, semana y mes con `date_trunc` en una zona (semana de lunes a lunes), con una medianoche repetida resuelta a la primera, sea cual sea la duración del retroceso, y con el periodo que de verdad contiene al instante;
   - índice `purchase_sessions (owner_id, closed_at)` para las sumas de D18;
   - total de un periodo: compras + ajustes que cuentan (SPEC regla 52);
   - revisión de que el día, la semana y el mes de un instante, con ajustes que cuenten, no queden negativos.
5. **`get_spending_period_bounds`:** los límites del periodo en curso con la zona guardada.
5b. **`get_period_finance`:** una sola sentencia SQL estable con la zona, los límites, las compras, los ajustes, el total y los contadores (SPEC §12). La sesión y el nivel se comprueban en una función interna usada como fuente de filas: en la lista de un `select`, PostgreSQL podía evaluar antes el nivel al planificar, y un anónimo veía `22023` en vez de `42501`.
6. **`set_spending_time_zone`:**
   1. valida sesión registrada y zona;
   2. toma `pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0))`;
   3. crea o reemplaza la zona;
   4. dentro de la misma transacción, revisa cada periodo distinto de la zona nueva donde cuenta algún ajuste, una sola vez; si alguno queda negativo, `raise` con `errcode = '23514'` deshace también el paso 3.
7. **`set_purchase_session_total`:**
   1. valida sesión registrada y monto;
   2. toma el mismo bloqueo;
   3. lee la zona guardada, o `TZ001` / `TZ002`;
   4. busca la compra por `id`, `owner_id` y `closed_at is not null`, con `for update` y sin límite de fecha (SPEC regla 48);
   5. actualiza solo `total_amount`;
   6. dentro de la misma transacción, revisa los periodos de su `closed_at`; si alguno queda negativo, `raise` con `errcode = '23514'` deshace también el paso 5.
8. **`set_period_total`:**
   1. valida sesión registrada y parámetros;
   2. toma el mismo bloqueo;
   3. toma la hora real con `clock_timestamp()`, lee la zona guardada, o `TZ001` / `TZ002`, y calcula los límites del periodo en curso;
   4. busca los ajustes de ese nivel en el periodo y calcula `diferencia = total deseado − (total actual sin esos ajustes)`;
   5. si es 0, los borra; si no, actualiza el más antiguo, que conserva su fecha, y borra los demás; si no hay ninguno, crea uno con la hora del paso 3 como `effective_at`;
   6. dentro de la misma transacción, revisa los periodos de hoy y de la fecha de los ajustes anteriores; si alguno queda negativo, `raise` con `errcode = '23514'` deshace todo.

**Permisos sin cambios:** `purchase_sessions` conserva su `grant` y sus políticas. La RPC puede escribir porque es `security definer` del dueño de la tabla, que no tiene `force row level security`; se confirma en la base antes de aplicar. Por eso no hace falta abrir el update a compras cerradas.

**Lectura de ajustes:** llegan en `get_period_finance`, ya filtrados por los niveles que cuentan (SPEC regla 52); el cliente no los pide por separado.

**Corrección de D19:**

- `getPeriodSpending(period, bounds)` pide compras con `count: "exact"` y falla como `getPeriodPurchases` si el conteo no coincide.
- Con zona guardada, el Dashboard y el Historial usan la misma lectura, `get_period_finance`, con el total calculado en la base.
- `closedCount` y `withoutTotalCount` no cuentan ajustes. `adjustmentCount` decide entre `empty` y `ready` y si el Dashboard muestra "Incluye ajustes manuales"; no cambia "Compras".

**Mismos límites:** con zona guardada, el Dashboard y el Historial leen límites, compras y ajustes de `get_period_finance` y dan formato a las fechas con esa zona. Sin zona no hay ajustes, así que siguen con `getPeriodBounds`. Los hooks se cambian en la Etapa 2.

### Flujo

**Editar una compra (CA-01):**

1. El lápiz llama a `useTotalEdit.onEdit({ type: session, id })`. Si había otro campo abierto, se cierra (D21). Abre con el valor redondeado (D22), o vacío si es "Sin total".
2. "Guardar" valida con `parseColonesAmount`; si no pasa, muestra el error sin llamar a la base.
3. `saving`, con `isSavingRef` contra el doble clic, y `setPurchaseTotal`.
4. Si sale bien, `usePeriodPurchases` reemplaza el total de esa fila. La lista y el total se recalculan sin pasar por `loading` y el foco vuelve al lápiz.
5. Si falla, `saveFailed` con lo escrito y el mensaje según el código. `TOTAL_SAVE_ERROR_CODE` identifica `23514`, `TZ001` (y los demás códigos) desde `error.code`, nunca desde `error.message` ni desde el estado HTTP; un código desconocido da el error general.
6. Con `TZ001`, el campo muestra la zona del navegador y "Confirmar". Solo con ese toque se llama a `set_spending_time_zone` y se repite la operación, sin perder lo escrito (SPEC regla 59).

**Editar el periodo (CA-02):** igual, con `setPeriodTotal`. Se reemplaza o quita el ajuste en la respuesta guardada. Si el total calculado en pantalla no coincide con lo guardado, porque otra pestaña cambió algo, se recarga el periodo.

**Dashboard (CA-03):** "Dashboard" es un link: `FinanceDashboard` se monta de nuevo y `usePeriodSpending` consulta otra vez, con la misma fórmula. La diferencia con el presupuesto se recalcula sola. `cacheComponents` no está activo, así que el estado no se conserva entre rutas; si alguien lo activa, E2E-FIN-11 lo detecta. Si el total incluye ajustes, el ViewModel pasa el texto "Incluye ajustes manuales" a `SpendingTotal`.

**Otra pestaña (D20):** no recibe ningún aviso.

### Seguridad

- **Quién llega:** solo una cuenta registrada escribe. La pantalla lo decide con `useFinanceAccess` y la base lo exige en las RPC.
- **Peor caso sin control:** escribir datos ajenos. Las RPC toman el dueño de `auth.uid()`, nunca del cliente, y responden igual si la compra es ajena o no existe.
- **`security definer`:** salta la RLS, así que valida dentro, fija `search_path`, usa nombres calificados y solo escribe `total_amount` o sus ajustes.
- **Sin escritura directa:** PATCH sobre compras cerradas y cualquier escritura sobre `spending_adjustments` siguen rechazados.
- **Validación doble:** cliente y RPC; `NaN`, negativos, decimales y sobre el tope son `22023`.
- **Zona horaria:** se guarda solo con `set_spending_time_zone`. Se valida su forma de zona con nombre, sin `posix/` ni `right/`, y que `at time zone` la conozca, y nunca se concatena en SQL. No se usa `pg_timezone_names`, que costó unos 40 ms por llamada en PostgreSQL local. No participa en ninguna comprobación de dueño o de permisos.
- **Elegir la zona no evade nada:** las RPC de edición no reciben una zona, y cambiarla pasa por la misma revisión de D18 (SPEC reglas 54 y 59). Una persona solo puede afectar sus propios datos.
- **`TZ001`:** se decide antes de buscar la compra, así que no revela si existe.
- **Errores:** códigos a textos fijos; los mensajes de Supabase no llegan a la pantalla.
- `security-reviewer` sobre la migración antes de aplicarla y otra vez antes de `waiting qa`.

### Concurrencia

| Caso | Control |
|---|---|
| Doble clic | `isSavingRef` y controles deshabilitados |
| Dos pestañas sobre la misma compra | Gana la última (SPEC regla 57) |
| Dos cálculos de ajuste a la vez | Bloqueo por usuario; el segundo ve el resultado del primero |
| Ajuste y compra a la vez | El mismo `pg_advisory_xact_lock`, tomado antes de leer y conservado hasta terminar la transacción, con la revisión de negativos dentro de ella: ninguna puede cambiar un total mientras la otra lo revisa |
| Cambio de periodo mientras guarda | Solo se aplica si la fila o el periodo siguen visibles |
| Pantalla cerrada mientras guarda | `isMountedRef`: se ignora la respuesta; el dato ya quedó en la base |
| Ajuste, compra y cambio de zona a la vez | El mismo bloqueo: la segunda operación espera, ve el resultado de la primera y revisa D18 con la zona vigente. No hay una restricción única: "uno por periodo" depende de este bloqueo |
| Una edición mientras se lee el periodo | `get_period_finance` es una sola sentencia: ve una sola foto, así que nunca mezcla compras y ajustes de dos momentos |

### Pruebas

**SQL** (`supabase/tests/040_edit_purchase_totals.test.sql`, `begin … rollback` con `assert`):

- **Permisos:** sin `execute` para `public` ni `anon`; `spending_adjustments` solo con `select`; funciones internas sin `execute`; `purchase_sessions` con los mismos `grant`.
- **Compra:** el dueño la edita, también una compra histórica; `closed_at` no cambia; otro usuario, una sesión anónima, sin sesión, compra abierta e inexistente se rechazan con el código de SPEC §12.
- **Regresión del trigger:** cerrar una compra sigue poniendo `now()` aunque se mande otra fecha.
- **Directo:** PATCH sobre una compra cerrada no afecta filas; insert, update y delete sobre ajustes se rechazan.
- **Validación:** nulo, negativo, decimales, `NaN`, sobre el tope, nivel y zona que PostgreSQL no reconoce dan `22023`; 0 es válido.
- **Límites:** los de día, semana y mes coinciden con los casos de `getPeriodBounds.test.ts` (medianoche, domingo, semana y mes que cruzan).
- **Ajuste:** crea, reemplaza sin duplicar y quita si la diferencia es 0; calcula en la base; funciona sin compras; los "Sin total" no cambian.
- **Niveles:** las tres filas de SPEC regla 52.
- **Negativos:** semana que cruza meses; día, semana y mes; compra, también histórica, que deja negativo cualquier periodo contenedor con ajuste; responden `23514` y nada queda guardado, ni siquiera el total de la compra.
- **Sin ajustes:** bajar una compra a 0 en periodos sin ajustes se acepta.
- **Sin zona:** `TZ001` en las dos RPC y en la lectura; nada asigna una zona; confirmar permite editar.
- **El entorno:** otra zona en la sesión no cambia límites, zona guardada ni ajustes; las RPC de edición no reciben una zona.
- **Cambiar de zona:** rechazo por D18 sin cambiar la anterior, también por un ajuste antiguo; aceptación con los mismos límites o con una compra que sostenga el periodo.
- **Zona no reconocida:** `TZ002` al editar y al leer, y confirmar otra es la salida.
- **Lectura:** `get_period_finance` cuadra con las RPC; sin zona, `time_zone: null`; aislamiento, sesión anónima y nivel inválido.
- **Periodo ya negativo:** ninguna operación lo oculta ni lo agrava; lo que no lo toca sigue funcionando.
- **Barrido** (`supabase/tests/040_time_zone_sweep.test.sql`): todos los días con cambio de desfase de 1970 a 2035, en todas las zonas con nombre; cada instante en su día, semana y mes, y cada día contiguo al siguiente. Tarda unos 2 minutos en local.
- **Reemplazar:** conserva la fecha; une dos ajustes del mismo periodo.
- **Cómo se llega a cada estado:** la prueba marca `[RPC]` o `[filas fijas]`.
- **Nombres:** se rechazan `posix/`, `right/`, directorios, abreviaturas y desfases.
- **Bloqueo:** se toma antes de leer, en el código de cada RPC, y se conserva hasta terminar la transacción. La espera entre dos conexiones se prueba aparte, porque el archivo SQL es una sola transacción.
- **Rango:** ajustes de más de `10^12`, por encima de `numeric(14, 2)`.
- **Datos reales:** la prueba solo cuenta filas de sus propios usuarios.
- **Aislamiento:** otro usuario no lee los ajustes; una sesión anónima no lee ninguno.

**Vitest:**

| Unidad | Casos |
|---|---|
| `parseColonesAmount` | Los de `parseBudgetAmount`, sin cambios; vacío inválido (D13) y decimales inválidos (D14) |
| `summarizeSpending` | Con ajustes positivos y negativos; contadores sin cambios; centavos; solo ajustes; nulos sin sumar |
| `formatSignedColones` | Positivo, negativo y miles |
| `finance.service` | RPC y argumentos exactos sin `owner_id` ni zona; `get_period_finance` con zona, sin zona (`time_zone: null`) y con `TZ002`; `count` en `getPeriodSpending` sin zona; falla si la lectura falla; `23514`, `TZ001` y `P0002` se reconocen por `error.code`, con cualquier texto interno y cualquier estado HTTP; código desconocido da el error general |
| `useTotalEdit` | Abrir, cancelar y Escape; un solo campo (D21); validación sin llamada; `saving`; doble clic; `saveFailed` conserva lo escrito; cada mensaje; cambio de periodo; desmontaje; sesión vencida; con `TZ001`, guardar la zona y repetir solo al confirmar |
| `usePeriodPurchases` | Aplicar lo guardado sin `loading`; ajuste creado, reemplazado y quitado; `empty` frente a `ready` con solo un ajuste; respuesta vieja descartada |
| `usePeriodSpending` | Total con ajustes; `empty` frente a `ready`; `failed` si el conteo no coincide |
| `usePurchaseHistoryViewModel` | Filas de compra y ajuste en orden; lápices según el estado; valor inicial con "Sin total", ₡0 y decimales (D22); mensaje de `status` |
| Pantalla (jsdom, Page Object) | CA-01, CA-02 y reflejo en total y contadores; vacío (D17); negativo (D18); foco; `aria-*`; fila de ajuste sin lápiz |
| `FinanceDashboard` | Sin lápices (D11); total y diferencia con ajustes; "Incluye ajustes manuales" solo con ajustes y "Compras" sin cambios |

**Integración:** `PurchaseHistory.test.tsx` y `FinanceDashboard.test.tsx` usan el servicio simulado con pantalla, ViewModel y hooks reales; un test compara que las dos pantallas calculen el mismo total con los mismos datos (D19). La integración real con la base la cubren la prueba SQL y el QA manual.

**E2E:** E2E-FIN-09 a 13, en [E2E.md](E2E.md). Sesión y respuestas simuladas.

**Manual** (`TC-SCRUM-91-nn`, con capturas sin correos):

| Caso | Qué comprueba | Tipo |
|---|---|---|
| 01 | Editar una compra contra la base; conserva fecha y periodo | Funcional |
| 02 | Editar el periodo; aparece el ajuste y las compras no cambian | Funcional |
| 03 | El Dashboard muestra lo mismo en Día, Semana y Mes | Integración |
| 04 | Ajuste rechazado por contenedor negativo | Límite |
| 05 | Otra cuenta no edita la compra, ni desde la consola | Negativo |
| 06 | Sesión anónima real: sin lápices y `42501` | Negativo |
| 07 | D4 con dos cuentas de la misma familia | Negativo |
| 08 | Mobile y teclado | Usabilidad |

### Recuperación de un periodo negativo

Un periodo con ajustes solo puede quedar negativo por algo que no pasa por las RPC: un cambio con `service_role`, SQL manual, o una actualización de la base de zonas de PostgreSQL. No hay corrección automática ni un camino que se salte D18.

1. **Si es el periodo en curso:** la persona lo arregla escribiendo su total; `set_period_total` revisa D18 igual que siempre. Solo alcanza si ningún periodo que lo contiene sigue negativo: si también lo está el mes, el total de la semana tiene que cubrir el déficit del mes.
2. **Si no:** soporte, en el SQL Editor y como dueño de las tablas:
   1. **Zona:** si la persona tiene `TZ002`, primero confirma otra zona con `set_spending_time_zone`; el diagnóstico necesita una zona que PostgreSQL reconozca.
   2. **Diagnóstico, solo lectura.** Los periodos negativos de una persona, en su zona:

      ```sql
      select distinct levels.period_scope, b.period_start, b.period_end,
        public.spending_period_total(a.owner_id, levels.period_scope, b.period_start, b.period_end) as total
      from public.spending_adjustments a
      join public.spending_time_zones z on z.owner_id = a.owner_id
      cross join unnest(array['day', 'week', 'month']) as levels (period_scope)
      cross join lateral public.spending_period_bounds(levels.period_scope, a.effective_at, z.time_zone) b
      where a.owner_id = '<id de la persona>'
        and array_position(array['day', 'week', 'month'], a.scope)
          <= array_position(array['day', 'week', 'month'], levels.period_scope)
        and public.spending_period_total(a.owner_id, levels.period_scope, b.period_start, b.period_end) < 0;
      ```

   3. **Corrección, con la persona:** en una transacción, primero `select pg_advisory_xact_lock(hashtextextended('<id de la persona>', 0));`, el mismo bloqueo de las RPC, para que ninguna edición de la persona se cruce. Después se ajusta o se borra el ajuste que lo deja negativo, o se corrige el total de una compra con el dato real.
   4. **Antes del `commit`:** en la misma transacción se repite el diagnóstico, que tiene que quedar vacío; si no, `rollback`.
   5. **Registro:** qué se cambió y por qué, en el ticket.

### Número de la migración

- **Número: `040_edit_purchase_totals.sql`**, el reservado para esta historia (decisión de la dueña de la historia, 2026-11-03). No choca con ningún archivo: el 2026-11-03, `develop` tenía `039` y `042` y las ramas abiertas `037`, `038` y `041`. Que `develop` tenga números más altos no importa, porque cada migración es independiente y se registra con su número.
- Se vuelve a revisar justo antes de aplicarla y antes del merge.
- La aplica la dueña de la historia antes de `waiting qa`, avisando al grupo, en una transacción con su fila del historial. Antes se confirma que el trigger y la política de la base coinciden con el repo.
- **Historial:** se registra como dice `supabase/README.md`, con `insert into supabase_migrations.schema_migrations (version, name, created_by) values ('040', 'edit_purchase_totals', 'SCRUM-91')` en la misma transacción. Es el mecanismo real: la columna `created_by` existe, porque `supabase/specs/SCRUM-134/reconcile-history.sql` la usó contra la base el 2026-10-08, y con ese procedimiento se registraron después `020`, `021`, `023` y `042`. No se usa `apply_migration` ni `supabase migration new`.

### Documento del proyecto

Al implementar y cerrar: §4.6 con lo implementado y §6 con `spending_adjustments`. No cambia en esta etapa.

### Commits y PR

El PR se abre con el commit 1, hacia `develop`, con label `in progress`, si no hay otro PR propio en ese estado (gitflow).

| # | Commit | Archivos |
|---|---|---|
| 1 | `docs(SCRUM-91): add total editing planning` | `features/finance/specs/SPEC.md`, `plan.md`, `tasks.md`, `E2E.md` |
| 2 | `feat(SCRUM-91): add purchase total editing and spending adjustments` | la migración y su prueba SQL |
| 3 | `feat(SCRUM-91): add spending adjustments to database types` | `types/database.types.ts`, `documento-proyecto.md` §6 |
| 4 | `refactor(SCRUM-91): rename the colones amount validation` | utilidad, constante, consumidores y tests |
| 5 | `feat(SCRUM-91): include adjustments in period spending` | servicio, utils, modelos, hooks de lectura y tests |
| 6 | `feat(SCRUM-91): add total editing logic` | servicio de escritura, `useTotalEdit`, ViewModel y tests |
| 7 | `feat(SCRUM-91): edit session totals in Historial` | fila, editor, lápiz, Page Object y tests |
| 8 | `feat(SCRUM-91): edit period totals in Historial` | total, fila de ajuste, pantalla y tests |
| 9 | `test(SCRUM-91): add total editing E2E` | `e2e/features/finance/` |
| 10 | `docs(SCRUM-91): record validation` | `tasks.md`, SPEC §13, `documento-proyecto.md` §4.6 |

Staging explícito, nunca `git add .`.

### Riesgos

- **El trigger de cierre:** es el riesgo más grave. Lo cubren la corrección y su prueba de regresión, y se aplica antes de cualquier RPC.
- **Base distinta del repo:** si el trigger o la política difieren, la migración podría no comportarse igual; se comprueba antes de aplicar.
- **Lecturas de la Etapa 2:** hasta cambiar los hooks, las pantallas calculan los periodos con el navegador. Es obligatorio cambiarlos antes de ofrecer la edición, o un viaje mostraría periodos distintos a los que protege D18. La lectura usa `get_period_finance` (SPEC §12), una sola sentencia, para que compras y ajustes sean del mismo momento.
- **`get_period_finance`:** va en la `040`; los hooks que la usan son de la Etapa 2.
- **Zona propuesta no reconocida:** si PostgreSQL no conoce la zona del navegador, `set_spending_time_zone` da `22023` y hace falta elegir otra.
- **Viajes:** quien viaje sigue viendo los periodos de su zona guardada hasta cambiarla.
- **Cambio de zona rechazado:** un ajuste negativo antiguo puede impedirlo. Se puede seguir usando la zona anterior (SPEC regla 60).
- **Zona guardada desconocida:** si PostgreSQL dejara de reconocerla, editar y leer dan `TZ002` y confirmar otra es la salida (SPEC regla 60).
- **Base de zonas:** actualizarla en PostgreSQL podría mover los límites de fechas ya guardadas, y dejar negativo un periodo sin ninguna operación de por medio.
- **Cambios manuales:** `service_role` o SQL manual pueden romper D18, porque no pasan por las RPC.
- **`closed_at`:** el trigger impide corregirlo con un update a cualquier rol (SPEC §12). Una corrección de soporte tendría que deshabilitar el trigger.
- **Montos extremos:** `numeric(18, 2)` admite más que un `number` exacto de JavaScript, a partir de unos 9 × 10^15. Equivale a unas 900 000 compras en el tope; no se trata en esta historia.
- **La suma de días no da la semana:** es intencional (SPEC regla 52), y la fila de ajuste lo explica.
- **Rechazos por negativo:** una persona puede encontrarse con que no puede bajar un total, sobre todo en una semana que cruza meses. El mensaje lo explica.
- **El Dashboard no detalla el ajuste:** D16 muestra las filas solo en la lista. El Dashboard solo avisa con "Incluye ajustes manuales"; el detalle está en el Historial.
- **Contrato simulado:** el E2E no llega a la base; lo mitigan los tests del servicio, la prueba SQL y el QA manual.
- **Tamaño:** la historia supera sus 3 puntos. Si hace falta, CA-02 se puede separar después de CA-01 (decisión del equipo).
- **HU-62:** los ajustes no tienen supermercado ni categoría.

### Para la defensa

Conceptos nuevos: `security definer` frente a `security invoker`; `old` y `new` en un trigger; `pg_advisory_xact_lock` y `for update`; por qué la base calcula la diferencia; actualizar una fila sin recargar la lista; `date_trunc` con zona horaria.

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| RPC `security definer` | Nueva política de update | La política permitiría cambiar `closed_at` o vaciar el total por API |
| Fila de ajuste | Repartir el total entre compras | Repartir borra los montos reales y no funciona sin compras |
| Fila de ajuste | Total fijo por periodo | La semana y el mes podrían contradecirse |
| Un hook de edición | Un hook por tipo de edición | D21 exige un solo campo abierto, y dos estados podrían contradecirse |
| La base calcula la diferencia | La calcula el cliente | Un dato viejo en pantalla guardaría una diferencia equivocada |
| Una zona guardada por persona | La zona del navegador en cada llamada | Un periodo podía quedar negativo en una zona que nadie revisaba |
| Sin backfill, con confirmación | Asignar una zona a los usuarios existentes | Ningún dato existente dice cuál es; una zona inventada movería sus periodos |
| Los periodos salen de `effective_at` y la zona | Guardar los límites en cada ajuste | Al cambiar de zona habría que reescribirlos, y dos ajustes podrían chocar |
| `getPeriodSpending` con conteo | Dejar la deuda | Un resultado cortado daría un total distinto entre pantallas y rompería CA-03 |

## SCRUM-92: ver sesiones sin total ingresado

> **Verificado el 2026-11-13** contra `develop` en `87a50ef` (con SCRUM-91 mergeada, #94):
>
> - **Política de lectura:** la de `purchase_sessions` (`016`) es `owner_id = auth.uid()`, sin excluir sesiones anónimas. Como en SCRUM-90, el acceso se decide en la pantalla (SPEC regla 7).
> - **Base:** `040` ya tiene `purchase_sessions_owner_closed_idx` y `set_purchase_session_total`; no hace falta nada nuevo en la base.
> - **Texto actual:** `PurchaseSessionRow` muestra "Sin total" como texto plano, el mismo estilo que un monto.
> - **Badge:** `components/ui` tiene `Chip` con tono `TERRACOTTA`, pero en el tema claro su texto da 2,58:1 a 2,76:1 (SPEC D27).
> - **Notificaciones:** no hay push web, correo ni trabajos programados en el proyecto. Push está en el roadmap post-curso (documento §3).

**Decisiones tomadas el 2026-11-13** (SPEC §5): umbral de 24 horas (D23), indicador persistente en Finanzas (D24), sección "Compras sin total" de cualquier fecha (D25), solo en Finanzas y sin descartar (D26) y contraste AA del badge (D27).

### Qué se reutiliza

| Pieza | Uso en SCRUM-92 |
|---|---|
| `Chip` (`components/ui`) | El badge, con un tono nuevo de texto accesible (D27), sin crear un componente nuevo |
| `PurchaseSessionRow`, `EditTotalButton`, `InlineTotalEditor` | Las filas de pendientes, iguales a las del periodo |
| `useTotalEdit` y `setPurchaseTotal` (SCRUM-91) | Completar el total, sin lógica nueva de edición (SPEC regla 68) |
| `usePeriodPurchases.applySavedPurchase` | Actualizar el periodo en curso al completar |
| `usePeriodPurchases` (patrón) | Clave por carga, respuesta vieja descartada, reintento, desmontaje |
| `getPeriodPurchases` (patrón) | Conteo exacto y supermercado nulo o en blanco (reglas 29 y 30) |
| `formatDay` con zona | Fechas en la zona guardada (regla 58) |
| `useFinanceAccess` y `retryIfRegistered` | Acceso (D6) y reintento |

### Alternativas para el recordatorio (CA-02, D24)

| Alternativa | Qué necesita | Cumple "por un tiempo" | Riesgo | Decisión |
|---|---|---|---|---|
| Indicador persistente dentro de la app | Una lectura y estado en la pantalla | Sí, al abrir Finanzas | No avisa con la app cerrada | **Elegida (D24)** |
| Notificación push web | Service worker, permiso del navegador, claves VAPID y un trabajo programado que decida cuándo avisar | Sí | Fuera del stack actual; está en el roadmap post-curso | No |
| Correo | Un trabajo programado (`pg_cron` o una Edge Function con horario), un proveedor de correo y consentimiento | Sí | Infraestructura nueva y datos personales en un tercero | No |
| Toast al cerrar la compra sin total | Cambiar el modo compra (`shopping-list`) | No: avisa en el momento, no después | Toca otra feature y no recuerda nada | No |
| Contador en la navegación ("Finanzas · 2") | Cambiar `components/app-shell` y leer en cada pantalla privada | Sí, en toda la app | Componente compartido, más lecturas y acuerdo del equipo | No (D26) |

**Elegido:** un indicador persistente solo en Finanzas (Dashboard e Historial), calculado al leer, sin trabajos programados, sin tablas nuevas y sin descartar (D26). El umbral es una duración de 24 horas desde `closed_at` (D23), guardada en una constante con su unidad (`..._MS`), así que no depende de la zona.

### Alternativas para CA-03 (D25)

| Opción | Cambia | Decisión |
|---|---|---|
| **A.** Sección "Compras sin total" en el Historial, con todas las pendientes de cualquier fecha | Una lectura nueva y una lista en la pantalla | **Elegida (D25)**: cumple CA-03 sin tocar D7 y da un destino claro al recordatorio |
| **B.** Ver periodos anteriores | D7, D15, el selector y los límites | No: es una historia propia y se cruza con HU-62 |
| **C.** Solo el periodo en curso | Nada | No: una compra del mes anterior no se puede completar |

### Contraste del badge (D27)

| Opción | Efecto | Elegida |
|---|---|---|
| Cambiar `--tacha-terracotta` | Oscurece todos los textos, bordes y montos terracota de la app | No: cambia pantallas de otras historias |
| Cambiar el tono `TERRACOTTA` del `Chip` | Afecta los chips de household y recetas | No: cambia pantallas de otras historias |
| **Token nuevo de texto terracota y tono nuevo del `Chip`** | Solo lo usa el badge; lo demás queda igual | **Sí** |

- **Token:** `--tacha-terracotta-text` en `app/globals.css`, en el tema claro, en el oscuro y en `prefers-color-scheme`, expuesto en `@theme` como `text-tacha-terracotta-text`.
- **Valores:**
  - **Tema claro:** un tono que dé al menos 4,5:1 sobre el fondo del chip en `surface` y en `bg`. El primero del mismo matiz es `#9c5939` (4,57:1); se elige uno con algo de margen.
  - **Tema oscuro:** puede seguir siendo `#e89a6c`, que ya da 5,89:1.
- **Tono:** `CHIP_TONE` gana un valor nuevo; su clase usa el fondo y el borde terracota de siempre con el texto nuevo.
- **Medición:** se repite sobre la pantalla real antes de cerrar (SPEC §13).
- **Hallazgo para el equipo:** los demás chips y textos terracota no cumplen AA en el tema claro. No se corrigen en esta historia.

### Archivos

```
features/finance/
  PurchaseHistory.tsx                              + recordatorio y sección "Compras sin total"
  FinanceDashboard.tsx                             + línea del recordatorio con enlace al Historial
  components/
    PurchaseSessionRow.tsx                         "Sin total" como Chip con el tono accesible (D27)
    PendingTotalReminder.tsx                       nuevo: cantidad, enlace y error con "Reintentar"
    models/*Props.interface.ts                     nuevos y extendidos
  constants/finance.constants.ts                   + umbral de 24 h (_MS), estados del recordatorio y de pendientes, textos, select
  hooks/
    usePendingPurchases.ts                         nuevo: lectura de pendientes, recordatorio, aplicar lo guardado
    useTotalEdit.ts                                el objetivo de una compra dice de qué lista viene (regla 68)
    usePurchaseHistoryViewModel.ts                 compone pendientes, recordatorio y edición
    useFinanceDashboardViewModel.ts                + recordatorio, sin lápices (D11)
  models/
    PendingPurchase.interface.ts                   nuevo, o se reutiliza PeriodPurchase si alcanza
  services/finance.service.ts                      + getPurchasesWithoutTotal
  tests/                                           ver "Pruebas"

e2e/features/finance/
  pending-totals.spec.ts                           nuevo (E2E-FIN-15 a 18)
  finance.helpers.ts                               + consulta de pendientes

app/globals.css                                    + --tacha-terracotta-text, en los dos temas (D27)
components/ui/chip/Chip.tsx                        + tono de texto terracota accesible (D27)
constants/                                         + valor en CHIP_TONE (D27)
docs/documento-proyecto.md                         §4.6, al cerrar
```

Sin migración, sin cambios en `supabase/` ni en `types/database.types.ts`: la tabla y la RPC ya existen. Sin cambios en `components/app-shell` (D26).

### Datos

- **Lectura** (`getPurchasesWithoutTotal`, SPEC §12):
  - **Consulta:** `purchase_sessions`, `select id, closed_at, total_amount, stores(display_name)`, con `closed_at=not.is.null` y `total_amount=is.null`, ordenada por `closed_at.desc,id.asc` y con `count: "exact"`.
  - **Sin dueño:** no se manda `owner_id`; la RLS deja solo las propias.
  - **Contrato:** falla como `getPeriodPurchases` si el conteo es nulo o no coincide (regla 30). Un supermercado nulo o en blanco no es un error (regla 29).
  - **Cada fila** confirma que `total_amount` sigue siendo nulo y que `closed_at` no lo es; si no, es un contrato roto.
- **Recordatorio:** sale de esas mismas filas, las de `closed_at ≤ ahora − 24 h` (reglas 63 y 66), con una función pura y el umbral en una constante (`24 * 60 * 60 * 1000`, con `_MS` en el nombre). "Ahora" es la hora de la carga, como los límites de SCRUM-69.
- **Dashboard:** hace la misma lectura para su recordatorio. No muestra la sección ni lápices (D11).
- **Sin zona:** las fechas se muestran con el navegador. Con zona guardada, con esa zona. La zona sale de la lectura del periodo (`usePeriodPurchases.timeZone`), sin otra consulta.

### Flujo

1. **Abrir el Historial:** `usePeriodPurchases` y `usePendingPurchases` cargan en paralelo, cada uno con su propio estado: el fallo de uno no tapa al otro.
2. **El recordatorio:** se ve si alguna pendiente pasó el umbral. Su enlace lleva a la sección "Compras sin total", que es un ancla en la misma pantalla.
3. **Lápiz de una pendiente:** abre el campo en esa fila (D21, un solo campo en toda la pantalla). El objetivo de la edición indica la lista de origen, para no abrir dos campos si la compra está en el periodo y en las pendientes.
4. **Guardar:** `setPurchaseTotal` (SCRUM-91), y después, sin recargar:
   - `usePendingPurchases` quita la compra y recalcula el recordatorio;
   - `usePeriodPurchases.applySavedPurchase` actualiza el periodo si la compra está ahí;
   - con `TZ001` o `TZ002`, la confirmación de zona de SCRUM-91, sin cambios.
5. **`P0002`:** la compra ya no está disponible. Se muestra el mensaje de SCRUM-91 y se vuelven a leer las pendientes.
6. **Cambio de periodo:** no cambia las pendientes, que no dependen del periodo; solo cierra un campo abierto (regla 55).

### Seguridad

- **Quién lee:** sin cuenta registrada no se consulta nada (D6). La RLS de `016` deja solo las compras propias, y el cliente nunca manda `owner_id`.
- **Escritura:** solo `set_purchase_session_total`, que valida dueño, compra cerrada y monto, y revisa D18 (SCRUM-91). No hay ninguna escritura nueva.
- **Sin datos nuevos:** no se guardan preferencias, descartes ni marcas de "visto" (D26): ni `localStorage` ni tablas.
- **Errores:** códigos a textos fijos; los mensajes de Supabase no llegan a la pantalla (SCRUM-91).
- **Sesión anónima:** con la política de `016`, una sesión anónima podría leer sus propias compras por la API, como ya documenta SCRUM-90 (regla 7). No se amplía nada.
- **`security-reviewer`:** no hay migraciones que revisar. Se pasa antes de `waiting qa` igual, por la lectura nueva.

### Concurrencia

| Caso | Control |
|---|---|
| Doble clic en "Guardar" | `useTotalEdit` (`isSavingRef`), sin cambios |
| La misma compra en dos listas | Un solo campo (D21) y el origen en el objetivo de la edición |
| Otra pestaña completa la compra | No se actualiza sola (D20); al guardar de nuevo, la RPC acepta el último total (regla 57) |
| Respuesta vieja de pendientes | Clave por carga, como `usePeriodPurchases` |
| Pantalla cerrada mientras carga o guarda | `isMountedRef` / cancelación del efecto |

### Pruebas

**Vitest:**

| Unidad | Casos |
|---|---|
| `finance.service` (`getPurchasesWithoutTotal`) | Tabla, `select`, filtros `is.null` y `not.is.null`, orden y `count: "exact"`, sin `owner_id`; conteo nulo o distinto da error; supermercado nulo o en blanco; una fila con total da error; errores que se propagan |
| Corte del recordatorio (función pura) | 23 h 59 min no cuenta, 24 h exactas sí y varios días también (reloj fijo); ninguna, una y varias; solo cuentan las sin total |
| `usePendingPurchases` | No pide sin cuenta; `loading`, `empty`, `ready` y `failed`; reintento; respuesta vieja; desmontaje; quitar la compra guardada sin `loading`; el recordatorio baja; `P0002` vuelve a leer |
| `useTotalEdit` | El origen de la compra en el objetivo; un solo campo entre las dos listas (D21) |
| `usePurchaseHistoryViewModel` | Filas con badge; recordatorio con la cantidad y el enlace; pendientes con lápiz; completar actualiza las dos listas; error del recordatorio sin tapar el total |
| `useFinanceDashboardViewModel` | Recordatorio con la cantidad y el enlace al Historial; sin lápices (D11); error sin tapar el total |
| Componentes (Page Object) | `PurchaseSessionRow` con el `Chip` de tono accesible y sin `role="alert"`; ₡0 sin badge; recordatorio (cantidad en singular y plural, enlace, sin botón de cerrar, error con "Reintentar"); sección como lista con nombre |
| `Chip` (`components/ui`) | El tono nuevo usa la clase del token nuevo; los tonos existentes no cambian |

**Integración:** `PurchaseHistory.test.tsx` y `FinanceDashboard.test.tsx`, con el servicio simulado y la pantalla, el ViewModel y los hooks reales:
- completar una pendiente de un mes anterior y verla desaparecer;
- completar una del periodo en curso y ver cambiar el total, los contadores y las pendientes;
- el recordatorio desaparece al completar la última.

**E2E** (`e2e/features/finance/pending-totals.spec.ts`, sesión y Supabase simulados, desktop y Pixel 7; detalle en [E2E.md](E2E.md), sección SCRUM-92):

| Escenario | Cubre |
|---|---|
| E2E-FIN-15: badge | CA-01: la compra sin total del periodo muestra el badge; una de ₡0 no |
| E2E-FIN-16: recordatorio | CA-02: con el reloj fijo, una pendiente de 4 días cuenta y una de 11 horas no; el recordatorio se ve en el Historial y en el Dashboard, sin botón de cerrar |
| E2E-FIN-17: completar una compra anterior | CA-03: desde la sección de pendientes, `rpc/set_purchase_session_total` lleva la compra y el total; la compra sale de la lista y el recordatorio desaparece sin recargar |
| E2E-FIN-18: error y reintento | Regla 67: la lectura de pendientes falla, el total del periodo sigue visible y "Reintentar" la recupera |

Los escenarios E2E-FIN-01 a 14 tienen que seguir pasando. El helper responde `[]` a la consulta nueva por defecto, así que no cambian.

**Manual** (`TC-SCRUM-92-nn`, contra la base, con capturas sin correos):

| Caso | Qué comprueba | Tipo |
|---|---|---|
| 01 | Badge en una compra cerrada sin total, desde el modo compra real | Funcional |
| 02 | Recordatorio con una compra cerrada sin total hace más de 24 horas, en el Dashboard y en el Historial (D23, D26) | Funcional |
| 03 | Completar una compra de un periodo anterior y verla en el total de su periodo | Integración |
| 04 | Otra cuenta no ve las pendientes de esta | Negativo |
| 05 | Sesión anónima: no se ve ni se pide nada | Negativo |
| 06 | Teclado, lector de pantalla, mobile y contraste del badge en los dos temas (D27) | Usabilidad |

### Documento del proyecto

Al cerrar: §4.6 con lo implementado (badge, recordatorio y completar). §6 no cambia, porque no hay tablas nuevas.

### Dependencias y Gitflow

- **Rama:** `ticket/SCRUM-92-ver-sesiones-sin-total`, desde `develop` con SCRUM-91 mergeada.
- **PR:** hacia `develop`, abierta desde el primer commit, con un solo label de estado (gitflow §2). Antes, `gh pr list --author "@me" --label "in progress" --state open`, porque solo puede haber una PR en `in progress` por persona.
- Commits, título y descripción del PR en inglés, con la plantilla completa.

### Commits y PR

| # | Commit | Archivos |
|---|---|---|
| 1 | `docs(SCRUM-92): add sessions without total planning` | `features/finance/specs/SPEC.md`, `plan.md`, `tasks.md` y `E2E.md` |
| 2 | `feat(SCRUM-92): show the Sin total badge in Historial` | token y tono del `Chip` (D27), `PurchaseSessionRow`, constantes y tests (CA-01) |
| 3 | `feat(SCRUM-92): read purchases without total` | servicio, modelo, función del corte, `usePendingPurchases` y tests |
| 4 | `feat(SCRUM-92): remind and complete purchases without total` | componentes, ViewModels, `useTotalEdit` (origen), pantallas y tests (CA-02 y CA-03) |
| 5 | `test(SCRUM-92): add sessions without total E2E` | `e2e/features/finance/` |
| 6 | `docs(SCRUM-92): record validation` | `tasks.md`, SPEC §13, `E2E.md`, `documento-proyecto.md` §4.6 |

Staging explícito, nunca `git add .`.

### Riesgos

- **Sin actualizarse solo:** con la pantalla abierta, una compra que cumple 24 horas no aparece en el recordatorio hasta la próxima carga (SPEC regla 65).
- **El recordatorio no avisa con la app cerrada:** es el límite de un indicador (SPEC regla 65). Si el equipo necesita un aviso real, es infraestructura nueva y una historia propia.
- **Muchas pendientes:** sin paginación (regla 70). Con cientos de compras sin total el servidor podría cortar la respuesta; el conteo exacto lo convierte en un error visible, no en un dato falso.
- **Contraste del resto de la app:** el token y el tono nuevos solo cubren el badge; los demás textos y chips terracota siguen sin AA en el tema claro, hasta que el equipo lo decida.
- **Dos listas con la misma compra:** el objetivo de la edición tiene que llevar el origen; un error ahí abriría dos campos y rompería D21.
- **Hora del navegador:** el corte usa el reloj del dispositivo. Un reloj mal puesto adelanta o atrasa el recordatorio, pero nunca cambia datos.
- **Otra pestaña (D20):** una compra completada en otra pestaña sigue en la lista hasta recargar.
- **Tamaño:** 2 puntos es justo para badge, recordatorio en dos pantallas y la sección. Si hace falta, el recordatorio del Dashboard puede ir después del Historial (decisión del equipo).

### Para la defensa

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Indicador persistente | Push o correo | No requiere infraestructura que el proyecto no tiene, y CA-02 lo permite |
| Umbral como duración | Límite de calendario | No depende de la zona horaria; una persona sin zona confirmada también lo recibe |
| Sección de pendientes | Ver periodos anteriores | Cumple CA-03 sin cambiar D7 ni cruzarse con HU-62 |
| Una lectura para lista y recordatorio | Dos consultas | No pueden contradecirse (regla 66) |
| Reutilizar `useTotalEdit` | Un editor propio | Un solo campo abierto (D21) y los mismos errores de SCRUM-91 |
| `Chip` con un tono nuevo | Cambiar el token terracota | Llega a AA sin cambiar pantallas de otras historias (D27) |
| Sin descartar | Un botón de cerrar | "Persistente" (CA-02); descartar exigiría guardar estado (D26) |
