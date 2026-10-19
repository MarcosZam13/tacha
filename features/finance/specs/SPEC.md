# Feature: Finanzas — dashboard de gasto por periodo

Historia (criterios en [historias-usuario.md](../../../docs/historias-usuario.md); Jira es la fuente de verdad):

- [SCRUM-69 / HU-37](https://tacha.atlassian.net/browse/SCRUM-69): ver gasto total por periodo. Sprint 3, en planificación.

El cómo está en [plan.md](plan.md) y los pasos en [tasks.md](tasks.md). Producto: [documento-proyecto.md §4.2.1 y §4.6](../../../docs/documento-proyecto.md#42-lista-general-y-dashboard-financiero); diseño: [DESIGN.md §7.11](../../../docs/DESIGN.md).

## 1. Objetivo

Que una persona con cuenta vea cuánto gastó en el día, la semana o el mes en curso, y lo compare de un vistazo con el presupuesto que se puso para ese tipo de periodo, para administrar sus compras sin hacer cuentas a mano.

## 2. Alcance

Incluye:

- Una pantalla nueva **Finanzas** (`/finanzas`) en la navegación privada, que hoy es solo el "Dashboard" (DESIGN.md §3.1 y §7.11), sin barra de sub-tabs (D5).
- **Solo para cuentas registradas** (D6). Sin sesión, o con una sesión anónima, la pantalla pide iniciar sesión y no consulta ni guarda nada.
- Un selector de periodo **Día / Semana / Mes**, que arranca en **Semana** (CA-01, D2).
- El **gasto total** del periodo en curso: la suma de las compras **cerradas** propias que tienen total. Al cambiar el periodo se recalcula sin recargar la pantalla (CA-02, D3, D4).
- La cantidad de compras cerradas **sin total** del periodo, por separado y sin contarlas como ₡0 (D3).
- Un **presupuesto** por tipo de periodo (uno diario, uno semanal, uno mensual), definido y editado por el usuario y guardado en la base, mostrado al lado del total con la diferencia (CA-03, D1).
- Estados de carga, vacío y error con reintento, por separado para el gasto y para el presupuesto.

No incluye ([§14](#14-casos-fuera-de-alcance)): desgloses (HU-38 a HU-42), historial (HU-59 a HU-62), aviso de precios (HU-43), periodos anteriores, ni borrar el presupuesto desde la pantalla.

## 3. Entradas

| Entrada | Tipo | De dónde |
|---|---|---|
| Sesión | la de Supabase, si existe | `getSession()`; registrada si no es anónima (`getSessionStatus`, `utils/getSessionStatus.ts`). **Nunca `ensureSession()`**, que crearía una sesión anónima |
| Fecha y hora actuales | `Date` | Reloj del navegador, en el momento de cada carga (regla 8) |
| Periodo elegido | `SpendingPeriodType` (`day`, `week`, `month`) | Selector; arranca en `week` |
| Compras del periodo | lista de `{ totalAmount: number \| null }` | `purchase_sessions` cerradas del usuario dentro de los límites del periodo ([§12](#12-contratos-externos)) |
| Presupuestos | `Record<SpendingPeriodType, number \| null>` | `spending_budgets` del usuario ([§12](#12-contratos-externos)) |
| Texto del presupuesto | `string` | Campo "Presupuesto … (₡)" |
| `onPeriodChange` | `(period: SpendingPeriodType) => void` | Selector |
| `onSpendingRetry` / `onBudgetRetry` | `() => void` | Botones "Reintentar" |
| `onBudgetEdit` / `onBudgetSave` / `onBudgetCancel` | `() => void` | Botones del presupuesto |

## 4. Salidas

- **Sin cuenta registrada:** muestra "Inicia sesión con tu cuenta para ver tus finanzas." con un enlace a `/login`, y no hace ninguna consulta de gasto ni de presupuesto.
- **Con cuenta:**
  - muestra el periodo en curso con sus fechas, el gasto total en colones (`₡`, sin decimales), cuántas compras suman y cuántas quedaron sin total;
  - muestra el presupuesto del tipo de periodo elegido y la diferencia con el gasto, o "Sin presupuesto" si todavía no hay uno.
- **Al cambiar el periodo:** vuelve a pedir el gasto de ese periodo y actualiza la pantalla en el lugar, sin navegar ni recargar. El presupuesto ya está cargado, porque se piden los tres de una vez.
- **Al guardar un presupuesto:** lo crea o lo reemplaza en la base con `set_spending_budget` y lo muestra; los otros dos no cambian.
- No escribe nada más en la base.

## 5. Reglas de negocio

**Decididas por la dueña de la historia** (2026-10-18):

1. **D1. Presupuesto (opción A):** el usuario define y edita presupuestos **independientes** para día, semana y mes, guardados en la base. Cada uno es un monto fijo que vale para todos los periodos de ese tipo (el "semanal" se compara con cualquier semana en curso). El cálculo por defecto desde la lista (documento-proyecto §4.2.1) queda para otra historia.
2. **D2. Periodo:** se muestra siempre el periodo **en curso**, en hora local; arranca en **Semana**. Límites en la regla 8.
3. **D3. Compras:** solo cuentan las compras **cerradas** (`purchase_sessions.closed_at` no nulo) cuyo cierre cae en el periodo. Las que tienen total suman; las cerradas **sin total no suman ni cuentan como ₡0**: se muestran aparte ("N compras sin total"). Las abiertas no entran.
4. **D4. Alcance:** solo el gasto **personal** del usuario de la sesión (`owner_id`). Las compras de otros integrantes de su familia no suman, aunque se hayan hecho sobre la lista de la familia.
5. **D5. Navegación:** "Finanzas" es un ítem de la navegación privada y su pantalla es el Dashboard. No se crean sub-tabs hasta que exista "Historial" (HU-59).
6. **D6. Acceso:** solo cuentas **registradas y autenticadas**. Una sesión anónima de Supabase (que el resto de la app crea con `ensureSession()`) no puede ver Finanzas ni leer o escribir presupuestos.

**Acceso (D6):**

7. Se cumple en dos capas:
   - **Pantalla:** sin sesión registrada no se consulta ni se escribe nada; se muestra el aviso de §4. El `SessionGuard` (SCRUM-49) está apagado por defecto (`NEXT_PUBLIC_SESSION_GUARD_ENABLED`), así que la pantalla no depende de él.
   - **Base, presupuestos:** la tabla y la RPC rechazan las sesiones anónimas con el mismo criterio que household (`coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)`, `011` a `024`).
   - **Base, compras:** la RLS de `purchase_sessions` (`016`) no cambia y sigue dejando que cada sesión, también la anónima, lea **sus propias** compras, porque el modo compra lo necesita. Finanzas no las consulta para una sesión anónima. Por la API, una sesión anónima solo podría leer sus propias compras, nunca las de otro.

**Periodos:**

8. **Límites**, calculados en el navegador en hora local y mandados como instantes ISO, porque la base guarda `closed_at` en UTC. El inicio se incluye y el fin no; "00:00" es la medianoche local.

   | Periodo | Inicio | Fin |
   |---|---|---|
   | Día | hoy a las 00:00 | mañana a las 00:00 |
   | Semana | el lunes de esta semana a las 00:00 | el lunes siguiente a las 00:00 |
   | Mes | el día 1 de este mes a las 00:00 | el día 1 del mes siguiente a las 00:00 |

   - El domingo pertenece a la semana que empezó el lunes anterior.
   - Una semana puede cruzar de mes (lunes 29 de septiembre a domingo 5 de octubre de 2025) y de año (lunes 28 de diciembre de 2026 a domingo 3 de enero de 2027): se cuenta entera.
   - Diciembre termina el 1 de enero del año siguiente; febrero termina el 1 de marzo, tenga 28 o 29 días.
   - Una compra cerrada exactamente a las 00:00 cuenta para el periodo que empieza en ese instante.
   - Los límites se calculan en cada carga (al abrir, al cambiar de periodo y al reintentar). Si la pantalla queda abierta al pasar la medianoche, no se actualiza sola (§14).
9. Debajo del total se muestran las fechas del periodo ("Lunes 12 a domingo 18 de octubre", propuesto), para que se pueda verificar qué se está sumando.

**Gasto:**

10. **La base decide qué compras son del usuario:** la RLS de `purchase_sessions` solo deja leer las propias. El cliente no manda `owner_id`.
11. **La suma** usa los montos guardados (`numeric(12, 2)`) y se redondea solo al mostrarla.
12. **Sin compras con total en el periodo** el gasto es ₡0. Si tampoco hay compras sin total, es el estado vacío; no es un error.
13. **Respuesta vieja:** si se cambia de periodo antes de que llegue la respuesta anterior, solo se muestra la del periodo elegido.

**Presupuesto:**

14. **Uno por usuario y tipo de periodo.** Crear y editar es la misma operación (`set_spending_budget`): si no existía se crea, si existía se reemplaza. Nunca hay dos del mismo tipo para el mismo usuario.
15. **Monto válido:** colones enteros, de 0 a 9 999 999 999. Son dígitos, con separadores de miles en grupos de 3 (las mismas reglas que "Total gastado" del modo compra). Vacío es inválido; ₡0 es un presupuesto válido.
16. **Solo el dueño, con cuenta registrada,** lee y escribe sus presupuestos. El cliente manda solo el tipo de periodo y el monto; el dueño lo pone la base.
17. **Sin presupuesto** para el tipo de periodo elegido: se ve "Sin presupuesto semanal" (o diario, o mensual) y el botón "Definir presupuesto"; no se muestra diferencia.
18. **Diferencia** (con presupuesto y gasto cargados): presupuesto − gasto. Si es ≥ 0, "Te quedan ₡X"; si es < 0, "Te pasaste por ₡X". Si hay compras sin total, se agrega "No incluye N compras sin total".
19. **Editar:** "Editar presupuesto" abre un campo con el monto actual (vacío si no hay) y los botones "Guardar" y "Cancelar".
    - Cancelar, Escape o cambiar de periodo descartan lo escrito sin guardar.
    - Mientras guarda, el campo y los botones quedan deshabilitados; un segundo "Guardar" no manda otra llamada.
    - Al guardar bien, el campo se cierra, se muestra el monto nuevo y se anuncia "Presupuesto guardado".
20. **Si el presupuesto no se pudo cargar,** no se puede editar hasta reintentar, para no reemplazar un monto que no se ve. El gasto se sigue mostrando.

## 6. Estados

**Pantalla** (`FINANCE_ACCESS_STATUS`), una unión:

| Estado | Cuándo | Qué se ve |
|---|---|---|
| `checking` | Leyendo la sesión guardada | `Spinner` |
| `noAccount` | Sin sesión, o con sesión anónima | El aviso y el enlace a `/login` |
| `registered` | Sesión de una cuenta registrada | El dashboard, con los estados de abajo |

**Gasto del periodo** (`SPENDING_STATUS`), una unión:

| Estado | Cuándo | Qué se ve |
|---|---|---|
| `loading` | Primera carga, cambio de periodo o reintento | El selector y un `Spinner` en lugar de los montos |
| `ready` | Hay al menos una compra cerrada en el periodo | Total, fechas, "Compras" y "Sin total" |
| `empty` | Ninguna compra cerrada en el periodo | ₡0 y "Todavía no tienes compras cerradas en este periodo." |
| `failed` | Falló la consulta | Error y "Reintentar"; el selector sigue disponible |

**Presupuesto** (`BUDGET_STATUS`), una unión:

| Estado | Cuándo | Qué se ve |
|---|---|---|
| `loading` | Primera carga o reintento | `Spinner` en el bloque del presupuesto |
| `viewing` | Cargado | El monto o "Sin presupuesto …", y "Editar presupuesto" o "Definir presupuesto" |
| `editing` | Abrió el campo | Campo, "Guardar" y "Cancelar"; el error de validación debajo si lo hay |
| `saving` | Esperando `set_spending_budget` | Campo y botones deshabilitados, "Guardando…" |
| `saveFailed` | Falló el guardado | El campo con lo escrito, el error y los mismos botones para reintentar o cancelar |
| `loadFailed` | Falló la carga | Error y "Reintentar"; sin botón de editar |

## 7. Errores

Textos propuestos (se confirman al escribir las constantes):

| Situación | Mensaje visible | Dónde |
|---|---|---|
| Sin cuenta registrada | "Inicia sesión con tu cuenta para ver tus finanzas." + enlace "Iniciar sesión" | Lugar del dashboard (no es un error: no lleva `role="alert"`) |
| No se pudo cargar el gasto | "No se pudo cargar tu gasto. Intenta de nuevo." + "Reintentar" | Bloque del gasto, `role="alert"` |
| No se pudo cargar el presupuesto | "No se pudo cargar tu presupuesto. Intenta de nuevo." + "Reintentar" | Bloque del presupuesto, `role="alert"` |
| Monto vacío, inválido o mayor al tope | "Escribe el monto en colones, solo números (ej. 50000)." | Debajo del campo, asociado con `aria-describedby` |
| No se pudo guardar | "No se pudo guardar tu presupuesto. Intenta de nuevo." | Debajo del campo, `role="alert"`; lo escrito se conserva |
| La sesión venció o dejó de ser válida (`401`, `42501`) | El mismo error de carga o de guardado; al volver a leer la sesión, si ya no es registrada, se pasa a `noAccount` | Ídem |

- Los errores de Supabase no se muestran crudos.
- Un error del gasto no oculta el presupuesto, ni al revés.

## 8. UI esperada

Según DESIGN.md §7.11 (y la cabecera de §7.8). Textos propuestos:

- Título **"Finanzas"**.
- **Sin cuenta:** el aviso de §7 y un enlace **"Iniciar sesión"** a `/login` (`AUTH_ROUTE.LOGIN`).
- Selector de periodo con tres pills: **"Día"**, **"Semana"**, **"Mes"**; la elegida en teal sólido.
- **Gasto:** etiqueta "Gastado hoy" / "Gastado esta semana" / "Gastado este mes", el monto grande (Fraunces) y las fechas del periodo debajo.
- **Presupuesto**, al lado del gasto (debajo en mobile), con el mismo tamaño:
  - etiqueta "Presupuesto diario" / "Presupuesto semanal" / "Presupuesto mensual";
  - el monto, o "Sin presupuesto diario / semanal / mensual";
  - la diferencia ("Te quedan ₡12 000" / "Te pasaste por ₡3 000") y, si corresponde, "No incluye N compras sin total";
  - botón **"Editar presupuesto"** o **"Definir presupuesto"** (variante secundaria);
  - en edición: `Input` "Presupuesto semanal (₡)" (o diario, o mensual), **"Guardar"** y **"Cancelar"**.
- Dos `StatCard`: **"Compras"** (cuántas suman) y **"Sin total"** (cuántas cerradas no tienen total).
- Estado vacío y errores dentro de la misma pantalla.

Componentes compartidos: `StatCard`, `Spinner`, `Button` e `Input` de `@/components/ui`; formato de colones con `PRICE_FORMAT`.

## 9. Accesibilidad

- El selector es un grupo con nombre ("Periodo"), con tres botones con `aria-pressed`; se usa con Tab y Enter o Espacio.
- El gasto y el presupuesto tienen su etiqueta en texto, no solo el número; la diferencia dice en palabras si queda o si se pasó (no solo color).
- Una zona `role="status"` siempre montada anuncia el nuevo total al cambiar de periodo y "Presupuesto guardado" al guardar. Los errores van en `role="alert"`.
- El campo del presupuesto tiene `label`; su error se asocia con `aria-describedby` y `aria-invalid`.
- Al abrir la edición el foco va al campo; al guardar o cancelar vuelve al botón "Editar presupuesto".
- El enlace "Iniciar sesión" es un enlace real (`<a>`), no un botón.
- Todo se puede hacer solo con teclado, en desktop y en mobile.

## 10. Restricciones técnicas

- TypeScript estricto, Tailwind con tokens `tacha-*`, sin strings sueltos (constants-standards).
- Estructura de feature (component-architecture): todo lo nuevo vive en `features/finance/`, salvo la ruta `app/(app)/finanzas/page.tsx` (que solo compone la feature), `APP_ROUTE.FINANCE` y el ítem de la navegación (project-structure).
- **No se modifica `features/shopping-list/`** (decisión del 2026-10-18). Las reglas de monto y la medianoche local se implementan dentro de Finanzas (plan, "Qué se reutiliza").
- Estado de servidor con servicios y `useEffect` en el ViewModel (AGENTS.md: TanStack Query no está instalado).
- Los límites del periodo, la suma y la validación del monto son funciones puras, probadas sin React.
- Sin librerías de fechas: `Date` e `Intl.DateTimeFormat` del navegador.
- Base: una migración nueva con el procedimiento de `supabase/README.md`, su prueba SQL en `supabase/tests/` y `security-reviewer` antes de aplicarla. No se modifican migraciones aplicadas ni las políticas de `purchase_sessions`.
- Tests automáticos obligatorios (CONTRIBUTING §7) y E2E según [plan.md](plan.md#pruebas). El E2E usa una sesión registrada y respuestas de Supabase simuladas: valida la interfaz, no la autenticación real ni la seguridad de la base (decisión de la dueña de la historia, 2026-10-19).

## 11. Dependencias

| Dependencia | Estado (2026-10-18) | Efecto |
|---|---|---|
| SCRUM-67 (HU-36f, modo compra): `purchase_sessions` y `close_purchase_session` (`016`, `018`) | En `develop` | Fuente del gasto, sin cambios |
| SCRUM-45 (login con reCAPTCHA) y `getSessionStatus` (`utils/`) | En `develop` | Iniciar sesión con la cuenta y saber si la sesión es registrada |
| SCRUM-135 (navegación privada, `components/app-shell/`) | En `develop` | Se agrega "Finanzas" a `APP_NAV_ITEMS` y `/finanzas` a `APP_ROUTE` |
| `StatCard`, `Spinner`, `Button`, `Input` y `PRICE_FORMAT` | En `develop` | Se reutilizan |
| E2E (`playwright.config.ts`, `e2e/support/`, SCRUM-129) | En `develop` | Corre en local; no corre en CI. Se usa su sesión registrada simulada (`fake-session.ts`) con respuestas de Supabase simuladas (plan, "Pruebas") |
| Cuentas de prueba para un E2E con autenticación real | No existen | No bloquea esta historia: un E2E con autenticación real queda como mejora futura (§14) |
| HU-43 (aviso de precios), HU-59 a HU-62 (historial), HU-38 a HU-42 (desgloses) | Sin empezar | Se suman a esta pantalla después |

No depende de ningún PR sin mergear.

## 12. Contratos externos

**Lo que existe** (verificado el 2026-10-18 en `develop`, `449b5a4`):

- **`public.purchase_sessions`** (`016`, `018`): `owner_id`, `household_id`, `list_id`, `store_id`, `started_at`, `closed_at` (lo pone la base al cerrar), `total_amount numeric(12, 2)` (nulo = "sin total"; solo en una compra cerrada).
  - `grant select` a `authenticated`; política `"owner reads own purchase sessions"` (`owner_id = auth.uid()`), que no distingue sesiones anónimas (regla 7).

**Lectura del gasto** (sin cambios en la base; solo con sesión registrada):

```
purchase_sessions  select total_amount  where closed_at >= <inicio> and closed_at < <fin>
```

**Presupuesto** (migración nueva; número provisional `027` hasta verificarlo al implementar; ver [plan.md](plan.md#datos)):

- Tabla `public.spending_budgets`:

  | Columna | Tipo | Regla |
  |---|---|---|
  | `owner_id` | `uuid` | `not null default auth.uid()`, FK a `auth.users` con `on delete cascade` |
  | `period` | `text` | `not null`, `check (period in ('day', 'week', 'month'))` |
  | `amount` | `numeric(12, 2)` | `not null`, `check (amount <> 'NaN' and amount >= 0 and amount = trunc(amount))`: colones enteros, hasta 9 999 999 999 por el tipo |
  | | | `primary key (owner_id, period)` |

- **Permisos:** RLS activada y deny por defecto. `revoke all` de `public`, `anon` y `authenticated`. Después `grant select, delete`, `insert (period, amount)` y `update (amount)` a `authenticated`.
- **Políticas:** las cuatro (leer, crear, cambiar y borrar) son solo para el dueño **con cuenta registrada**: `owner_id = (select auth.uid())` y la sesión no es anónima (`not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)`).
- RPC `set_spending_budget(budget_period text, budget_amount numeric) returns public.spending_budgets`:
  - `security invoker` (la RLS aplica), `set search_path = ''`;
  - `revoke execute … from public, anon`, `grant … to authenticated`;
  - sin `auth.uid()` o con sesión anónima: `42501`, antes de tocar la tabla;
  - periodo inválido, monto nulo, negativo, con decimales, `NaN` o mayor al tope: `22023`;
  - crea o reemplaza el presupuesto de quien llama (`insert … on conflict (owner_id, period) do update`) y devuelve la fila.
- Lectura: `select period, amount from spending_budgets` (los tres a la vez; la RLS deja solo los propios, y nada a una sesión anónima).
- `delete`: no lo usa la pantalla; existe para que el dueño pueda quitar sus filas (y para limpiar después de pruebas manuales o E2E con cuentas reales).

## 13. Casos de aceptación

### HU-37 (SCRUM-69)

Ninguno validado todavía.

Criterios de la historia, con cómo se verifica cada uno (con una cuenta registrada):

- [ ] **CA-01:** en Finanzas (Dashboard) hay un selector de periodo Día / Semana / Mes.
  - Al abrir `/finanzas` se ven las tres opciones y **Semana** está elegida (`aria-pressed="true"`).
  - "Finanzas" está en la navegación privada y lleva a `/finanzas`.
- [ ] **CA-02:** al cambiar el periodo, el gasto total se recalcula sin recargar la pantalla.
  - Con una compra cerrada hoy con total ₡10 000 y otra cerrada el lunes de esta semana (si no es hoy) con ₡5 000:
    - Día: ₡10 000;
    - Semana: ₡15 000;
    - Mes: ₡15 000 más las del mes fuera de esta semana.
  - Cambiar de periodo no navega ni recarga: la URL y el resto de la pantalla no cambian, y el nuevo total se anuncia en `role="status"`.
  - Una respuesta de un periodo anterior que llega tarde no reemplaza al elegido.
  - "Los desgloses" del criterio todavía no existen (HU-39 a HU-42); se recalcularán con el mismo periodo.
- [ ] **CA-03:** el gasto total se muestra destacado, junto al presupuesto del mismo periodo.
  - Sin presupuesto: "Sin presupuesto semanal" y "Definir presupuesto".
  - Definir ₡50 000 para la semana: se ve ₡50 000 y "Te quedan ₡35 000" (con ₡15 000 gastados). Al recargar, sigue ahí.
  - Editarlo a ₡12 000: se ve "Te pasaste por ₡3 000".
  - El presupuesto semanal no cambia el diario ni el mensual: Día y Mes siguen con el suyo, o "Sin presupuesto".

Casos de cada flujo:

- [ ] **Acceso (D6):**
  - sin sesión, y con una sesión anónima, `/finanzas` muestra el aviso y el enlace a `/login`, sin pedir `purchase_sessions` ni `spending_budgets`;
  - con una cuenta registrada se ve el dashboard;
  - en la base, una sesión anónima no lee, crea, cambia ni borra presupuestos, y la RPC le responde `42501`.
- [ ] **Periodos (unitarios):** cada límite de la regla 8, con fechas fijas:
  - un domingo y un lunes;
  - semana que cruza de mes y de año;
  - 31 de diciembre;
  - 29 de febrero de 2028 y 28 de febrero de 2027;
  - una compra cerrada a las 00:00 exactas.
- [ ] **Qué suma (D3):** solo cerradas; las sin total no suman y se cuentan aparte (dos sin total → "Sin total: 2", no ₡0 sumado); las abiertas no entran; los decimales se suman sin perder centavos.
- [ ] **Solo lo propio (D4):** una compra cerrada por otro integrante de la familia no aparece (prueba manual con dos cuentas registradas de la misma familia; la RLS es la de la `016`).
- [ ] **Vacío:** sin compras cerradas, ₡0 y el mensaje de vacío.
- [ ] **Errores:**
  - falla del gasto → error y "Reintentar" pide el mismo periodo;
  - falla del presupuesto → error, sin editar, y "Reintentar";
  - falla al guardar → lo escrito se conserva y se puede reintentar o cancelar.
- [ ] **Validación del monto:** vacío, letras, negativo, decimales ("12.5"), separadores mal agrupados y más del tope se rechazan sin llamar a la base; "50000", "50 000" y "50.000" se aceptan; ₡0 se acepta.
- [ ] **Edición:** cancelar, Escape y cambiar de periodo descartan; doble clic en "Guardar" hace una sola llamada; el foco vuelve al botón.
- [ ] **Base (prueba SQL):**
  - permisos de la tabla y de la RPC;
  - un usuario registrado no lee, cambia ni borra el presupuesto de otro;
  - las sesiones anónimas no pueden hacer ninguna operación de presupuesto;
  - `set_spending_budget` crea y reemplaza, sin duplicar;
  - los checks rechazan montos inválidos y periodos desconocidos;
  - sin sesión, `42501`.
- [ ] **E2E (interfaz):** los escenarios de `features/finance/specs/E2E.md` pasan en `chromium` y `mobile-chrome`, con una sesión de cuenta registrada **simulada** y respuestas de Supabase **simuladas**. Validan la interfaz de Finanzas para una cuenta registrada (y el aviso sin cuenta); **no validan la autenticación real ni la seguridad de la base**, que cubren la prueba SQL y las pruebas manuales.
- [ ] **Manual (acceso real):**
  - iniciar sesión con una cuenta registrada real y usar Finanzas contra la base compartida (CA-01 a CA-03);
  - con una sesión anónima real (por ejemplo, después de usar `/lista` sin cuenta), comprobar que `/finanzas` muestra el aviso y que en la pestaña de red no hay llamadas a `purchase_sessions` ni a `spending_budgets`.
- [ ] Tests automáticos (Vitest) del camino feliz y de al menos un caso negativo o límite por unidad.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` pasan.

## 14. Casos fuera de alcance

- Desgloses por familia o lista privada (HU-38), categoría (HU-39), supermercado (HU-40), persona (HU-41) y productos más comprados (HU-42).
- El historial de compras, editar totales y completar compras sin total (HU-59 a HU-62).
- El aviso de precios estimados (HU-43).
- El presupuesto calculado desde los precios de la lista (documento-proyecto §4.2.1).
- Presupuesto de la familia, o con fechas (un monto distinto para una semana concreta).
- Periodos anteriores o rangos de fechas a elección.
- Actualizar el periodo solo al pasar la medianoche con la pantalla abierta.
- Quitar un presupuesto desde la pantalla (la base lo permite; la interfaz no lo ofrece).
- Cambiar la RLS de `purchase_sessions`, o cualquier archivo de `features/shopping-list/`.
- Pasar a una cuenta los datos de una sesión anónima (SCRUM-49).
- E2E con autenticación real contra la base compartida (cuentas de prueba, credenciales fuera del repo y un helper de sesión): mejora futura ([plan.md](plan.md#pruebas)).
- Gráficos y el resumen de gasto en la cabecera de `/lista` (DESIGN.md §7.8).

## 15. Notas de implementación

- **Sin precios por producto en el gasto:** el gasto real sale solo de `total_amount` de cada compra (documento-proyecto §4.6).
- **Número de la migración:** `027` es provisional. La `025` es de SCRUM-60 (#68) y la `026` está planificada para SCRUM-61 (#69). El 2026-10-18 ninguna rama tenía una `027`; se vuelve a revisar al implementar (antes de crear el archivo) y antes del merge.
- **Reglas de monto repetidas a propósito:** "Total gastado" del modo compra ya valida colones con el mismo formato y el mismo tope. Por la decisión de no tocar `shopping-list`, Finanzas tiene su propia validación con las mismas reglas. Unificarlas queda como deuda.
- **Probar con una cuenta registrada en local:** según las notas de household (SCRUM-57), `/login` no permite entrar en local si falta `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` en `.env.local`. Para las pruebas manuales se usó una sesión de cuenta de prueba cargada desde la consola. Hay que confirmarlo antes de la etapa de QA.
