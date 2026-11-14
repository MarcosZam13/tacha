# Feature: Finanzas — dashboard de gasto por periodo e historial de compras

Historias (criterios en [historias-usuario.md](../../../docs/historias-usuario.md); Jira es la fuente de verdad):

- [SCRUM-69 / HU-37](https://tacha.atlassian.net/browse/SCRUM-69): ver gasto total por periodo. Sprint 3, en planificación.
- [SCRUM-90 / HU-59](https://tacha.atlassian.net/browse/SCRUM-90): ver historial de sesiones de compra. Implementada, con QA manual parcial (§13).
- [SCRUM-91 / HU-60](https://tacha.atlassian.net/browse/SCRUM-91): editar el total de una sesión o periodo. En planificación.
- [SCRUM-92 / HU-61](https://tacha.atlassian.net/browse/SCRUM-92): ver sesiones sin total ingresado. En planificación; decisiones D23 a D27 tomadas el 2026-11-13 (§5).

El cómo está en [plan.md](plan.md) y los pasos en [tasks.md](tasks.md). Producto: [documento-proyecto.md §4.2.1 y §4.6](../../../docs/documento-proyecto.md#42-lista-general-y-dashboard-financiero); diseño: [DESIGN.md §7.9 y §7.11](../../../docs/DESIGN.md).

## 1. Objetivo

### SCRUM-69

Que una persona con cuenta vea cuánto gastó en el día, la semana o el mes en curso, y lo compare de un vistazo con el presupuesto que se puso para ese tipo de periodo, para administrar sus compras sin hacer cuentas a mano.

### SCRUM-90

Que una persona con cuenta revise las compras que cerró en el día, la semana o el mes en curso: cuándo, en qué supermercado y por cuánto, con el total del periodo destacado.

### SCRUM-91

Que una persona con cuenta corrija el total de una compra o del periodo en curso, sin ingresar precio por producto, para que Finanzas refleje lo que gastó de verdad.

### SCRUM-92

Que una persona con cuenta distinga de un vistazo las compras que cerró sin total, reciba un aviso si alguna queda así por un tiempo y pueda completarla cuando quiera desde el Historial, para que su gasto no quede incompleto sin darse cuenta.

## 2. Alcance

### SCRUM-69

Incluye:

- Una pantalla nueva **Finanzas** (`/finanzas`) en la navegación privada, que hoy es solo el "Dashboard" (DESIGN.md §3.1 y §7.11), sin barra de sub-tabs (D5).
- **Solo para cuentas registradas** (D6). Sin sesión, o con una sesión anónima, la pantalla pide iniciar sesión y no consulta ni guarda nada.
- Un selector de periodo **Día / Semana / Mes**, que arranca en **Semana** (CA-01, D2).
- El **gasto total** del periodo en curso: la suma de las compras **cerradas** propias que tienen total. Al cambiar el periodo se recalcula sin recargar la pantalla (CA-02, D3, D4).
- La cantidad de compras cerradas **sin total** del periodo, por separado y sin contarlas como ₡0 (D3).
- Un **presupuesto** por tipo de periodo (uno diario, uno semanal, uno mensual), definido y editado por el usuario y guardado en la base, mostrado al lado del total con la diferencia (CA-03, D1).
- Estados de carga, vacío y error con reintento, por separado para el gasto y para el presupuesto.

No incluye ([§14](#14-casos-fuera-de-alcance)): desgloses (HU-38 a HU-42), historial (HU-59 a HU-62), aviso de precios (HU-43), periodos anteriores, ni borrar el presupuesto desde la pantalla.

### SCRUM-90

Incluye:

- Un sub-tab **"Historial"** en `/finanzas/historial` (CA-01). Con él nace la barra **Dashboard / Historial** en las dos pantallas de Finanzas (D5 de SCRUM-69).
- La **lista de compras cerradas** del periodo elegido, con fecha, supermercado y monto (CA-01).
- El **selector Día / Semana / Mes**, que arranca en Semana, filtra la lista y destaca el total del periodo (CA-02, D7, D9).
- **"Sin total"** en las compras con total nulo, sin sumarlas ni mostrarlas como ₡0 (D8).
- El aviso de precios estimados (`PriceDisclaimer`) debajo del total del Historial (DESIGN.md §7.9).
- Carga, vacío y error con reintento.
- Solo cuentas registradas (D6), sin migraciones ni cambios en la base.

No incluye ([§14](#14-casos-fuera-de-alcance)): periodos anteriores, productos de cada compra, editar totales (HU-60), badge y recordatorio de "Sin total" (HU-61), filtros (HU-62) ni el aviso en el Dashboard (SCRUM-75).

### SCRUM-91

Incluye:

- Un **lápiz junto al total de cada compra** del Historial, con edición inline (CA-01), también en las compras "Sin total" (D12).
- Un **lápiz junto al total del periodo** elegido en el Historial (CA-02, D11), solo para el periodo en curso (D15).
- **Ajustes manuales:** editar el total de un periodo no cambia ninguna compra. La diferencia se guarda como un ajuste (D10), que se ve como una fila **"Ajuste manual"** y no cuenta en "Compras" (D16).
- **Reflejo en el Dashboard** en la misma pestaña (CA-03): las dos pantallas calculan el total con las mismas compras y los mismos ajustes.
- Una **indicación discreta en el Dashboard** cuando el total del periodo incluye ajustes manuales, sin cambiar el conteo de compras.
- Una **zona horaria guardada por persona**, confirmada de forma explícita, que es la única referencia de sus periodos (reglas 58 y 59).
- La corrección de `getPeriodSpending` para que el Dashboard y el Historial no den totales distintos (D19).
- Una migración con dos RPC, la tabla de ajustes y la corrección del trigger de cierre.

No incluye ([§14](#14-casos-fuera-de-alcance)): editar desde el Dashboard, periodos anteriores, volver una compra a "Sin total", decimales, actualizar otra pestaña abierta, ni el badge y el recordatorio de HU-61.

### SCRUM-92

**Dentro:**

- Un **badge terracota "Sin total"** en cada compra sin total del Historial, informativo y sin aspecto de error (CA-01). Reemplaza el texto plano de D8.
- Un **recordatorio persistente dentro de Finanzas** cuando una compra lleva **24 horas o más** cerrada sin total (CA-02, D23, D24 y D26), en el Dashboard y en el Historial, sin opción de descartarlo.
- Una sección **"Compras sin total"** en el Historial con las pendientes de **cualquier fecha** (D25), para **completar** cualquiera (CA-03) con la edición que ya existe de SCRUM-91: lápiz, campo, validación, errores y `set_purchase_session_total`.
- El contraste del badge en WCAG AA, 4,5:1 (D27), con un token nuevo de texto terracota y un tono nuevo del `Chip` que solo usa este badge.
- Sin migración ni RPC nueva: una lectura de `purchase_sessions` con la RLS de `016`.

**Fuera:** §14.

## 3. Entradas

### SCRUM-69

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

### SCRUM-90

| Entrada | Tipo | De dónde |
|---|---|---|
| Sesión | la de Supabase, si existe | `hasRegisteredSession()`, como en SCRUM-69 |
| Fecha y hora actuales | `Date` | Reloj del navegador, en cada carga (regla 8) |
| Periodo elegido | `SpendingPeriodType` | Selector; arranca en `week` y no se conserva entre tabs (D9) |
| Compras del periodo | `PeriodPurchase[]` (`id`, `closedAt`, `storeName`, `totalAmount: number \| null`) | `purchase_sessions` cerradas del usuario, con el nombre de `stores` ([§12](#12-contratos-externos)) |
| `onSelect` de cada periodo y `onRetry` | `() => void` | Selector y botón "Reintentar" |

### SCRUM-91

| Entrada | Tipo | De dónde |
|---|---|---|
| Sesión | la de Supabase, si existe | `hasRegisteredSession()`, como en SCRUM-69 |
| Compra a editar | `id: string` | La fila del Historial |
| Periodo a editar | `SpendingPeriodType` | El periodo elegido en el selector |
| Texto del total | `string` | Campo de edición; se valida con las reglas de la regla 15 |
| Zona horaria propuesta | `string` (IANA) | `Intl.DateTimeFormat().resolvedOptions().timeZone`; solo se propone. Se guarda si la persona la confirma, y las RPC de edición no la reciben (regla 58) |
| Zona guardada | `string` (IANA) o ninguna | `spending_time_zones` del usuario ([§12](#12-contratos-externos)) |
| Ajustes del periodo | `PeriodAdjustment[]` (`id`, `amount`, `effectiveAt`, `scope`) | `spending_adjustments` del usuario ([§12](#12-contratos-externos)) |
| `onEdit`, `onSave`, `onCancel`, `onTextChange` | funciones del ViewModel | Lápiz y campo de edición |

El cliente nunca manda `owner_id`, el monto del ajuste, los límites del periodo ni una zona al editar un total.

### SCRUM-92

- La sesión registrada (D6).
- Las compras **cerradas propias** con `total_amount` nulo, de cualquier fecha (D3, D4, D8).
- La hora actual del navegador, para comparar con el umbral de 24 horas (D23).
- La zona guardada, si hay, solo para dar formato a las fechas (regla 58).

## 4. Salidas

### SCRUM-69

- **Sin cuenta registrada:** muestra "Inicia sesión con tu cuenta para ver tus finanzas." con un enlace a `/login`, y no hace ninguna consulta de gasto ni de presupuesto.
- **Con cuenta:**
  - muestra el periodo en curso con sus fechas, el gasto total en colones (`₡`, sin decimales), cuántas compras suman y cuántas quedaron sin total;
  - muestra el presupuesto del tipo de periodo elegido y la diferencia con el gasto, o "Sin presupuesto" si todavía no hay uno.
- **Al cambiar el periodo:** vuelve a pedir el gasto de ese periodo y actualiza la pantalla en el lugar, sin navegar ni recargar. El presupuesto ya está cargado, porque se piden los tres de una vez.
- **Al guardar un presupuesto:** lo crea o lo reemplaza en la base con `set_spending_budget` y lo muestra; los otros dos no cambian.
- No escribe nada más en la base.

### SCRUM-90

- **Sin cuenta registrada:** el mismo aviso de SCRUM-69, sin consultar compras y sin barra de sub-tabs.
- **Con cuenta:**
  - la barra de sub-tabs, con "Historial" activo;
  - el total del periodo, sus fechas y los contadores "Compras" y "Sin total";
  - el aviso de precios estimados;
  - la lista de compras del periodo, de la más reciente a la más antigua.
- **Al cambiar el periodo:** vuelve a pedir las compras y actualiza la pantalla sin navegar ni recargar.
- No escribe nada en la base.

### SCRUM-91

- **Sin cuenta registrada:** el mismo aviso, sin lápices y sin ninguna llamada de lectura o escritura.
- **Al guardar una compra:** cambia solo su `total_amount`, y la fila, el total y los contadores se actualizan sin recargar la lista.
- **Al guardar un periodo:** ninguna compra cambia. Se crea, reemplaza o quita el ajuste de ese periodo, y el total muestra lo escrito.
- **Al volver al Dashboard:** el gasto, los contadores y la diferencia con el presupuesto ya incluyen el cambio (CA-03). Si el total del periodo incluye ajustes, se indica debajo del monto; "Compras" no cambia por eso.
- **Si no se puede guardar:** no cambia nada y lo escrito se conserva.
- **Al confirmar o cambiar la zona:** se guarda solo si ningún periodo con ajustes queda negativo en ella; si no, sigue la anterior.
- El Historial sigue sin mostrar periodos anteriores.

### SCRUM-92

- **Filas de compra:** las "Sin total" muestran el badge en lugar del texto plano, con su lápiz (D12).
- **Recordatorio:** la cantidad de compras sin total que llevan 24 horas o más, con un enlace para ir a completarlas. No aparece si no hay ninguna.
- **Sección "Compras sin total":** todas las pendientes, de cualquier fecha, con fecha, supermercado, badge y lápiz.
- **Al completar una:** deja de estar pendiente sin recargar. Si cae en el periodo en curso, su fila, el total y los contadores cambian como en SCRUM-91, y el recordatorio baja su cantidad.

## 5. Reglas de negocio

### SCRUM-69

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

### SCRUM-90

**Decididas por la dueña de la historia** (2026-10-31):

21. **D7. Periodo:** solo el periodo **en curso**, como D2. No se puede ir a periodos anteriores.
22. **D8. Sin total:** una compra con `total_amount` nulo muestra **"Sin total"**, nunca ₡0, y no suma. Un total real de cero se muestra como **₡0** y sí cuenta en "Compras".
23. **D9. Periodo entre tabs:** no se conserva. Cada tab arranca en **Semana** al abrirlo.

**Heredadas de SCRUM-69, sin cambios:**

24. D3 (solo compras cerradas, según `closed_at`), D4 (solo las propias), D6 y regla 7 (acceso), reglas 8 y 9 (límites y fechas del periodo) y regla 13 (respuesta vieja).

**Historial:**

25. **Una sola consulta:** la lista y el total salen de las mismas filas, con `summarizeSpending`, para que no se contradigan.
26. **Orden:** `closed_at` descendente y, ante un empate, `id`, para que el orden sea estable.
27. **Fecha de cada compra:** la de cierre en hora local, sin hora ("Domingo 18 de octubre"). Una compra abierta ayer y cerrada hoy aparece hoy.
28. **Monto de cada compra:** en colones y sin decimales, redondeado solo al mostrarlo. Por el redondeo, el total puede diferir en ₡1 de la suma de las filas visibles.
29. **Supermercado:** `stores.display_name`. Que `store_id` sea obligatorio no garantiza que la consulta devuelva el nombre. Si llega nulo o en blanco, la fila se conserva con su fecha y su monto, y muestra **"Supermercado no disponible"**. El total no depende del nombre.
30. **Sin paginación, pero sin resultados incompletos:** son compras personales de un periodo, pocas filas. El servidor puede limitar las filas sin avisar, así que la consulta pide el conteo exacto. Si el conteo es nulo o distinto de las filas recibidas, la carga falla: es mejor un error visible que un total falso.
31. **Barra de sub-tabs:** son links a pantallas distintas, solo con cuenta registrada.

### SCRUM-91

**Decididas por la dueña de la historia** (2026-11-02):

32. **D10. Total del periodo:** editarlo guarda una **fila de ajuste**, con la diferencia entre lo escrito y el total calculado. No reparte ni cambia montos de compras.
33. **D11. Dónde se edita el periodo:** solo en el Historial. El Dashboard refleja el cambio y no tiene lápiz.
34. **D12. Compras "Sin total":** tienen lápiz. Completarlas adelanta HU-61 CA-03; el badge y el recordatorio siguen en HU-61.
35. **D13. Volver a "Sin total":** no se permite en esta historia. El campo vacío es inválido; ₡0 es válido.
36. **D14. Decimales:** no se aceptan. Solo colones enteros, como al cerrar una compra.
37. **D15. Periodos editables:** solo el periodo en curso, como D7. Esta decisión restringe la edición del **total del periodo**, no la de las compras individuales (regla 48).
38. **D16. Cómo se ve un ajuste:** una fila **"Ajuste manual"** en la lista, sin lápiz, que no cuenta en "Compras" ni en "Sin total".
39. **D17. Periodo sin compras:** se puede editar. El ajuste es lo que da el total.
40. **D18. Periodo contenedor negativo:** la RPC rechaza un ajuste que deje negativo a un periodo que lo contiene, con un mensaje claro. No se guarda nada.
41. **D19. Totales coincidentes:** `getPeriodSpending` se corrige en esta historia: conteo exacto como la regla 30 y la misma suma con ajustes que el Historial.
42. **D20. Otra pestaña abierta:** **no se actualiza automáticamente y queda fuera de alcance.** Muestra el dato nuevo cuando se recarga o se vuelve a entrar. Es un límite declarado.
43. **D21. Edición simultánea:** un solo campo abierto a la vez en el Historial. Abrir otro lápiz cancela el anterior, si no está guardando; mientras guarda, los demás lápices quedan deshabilitados.
44. **D22. Decimales antiguos:** una compra guardada con decimales abre el campo con el valor redondeado que se ve. Solo se guarda si la persona confirma con "Guardar".

**Heredadas, sin cambios:**

45. D3, D4, D6, D7, D8 y D9, y las reglas 8, 9, 13, 26, 27, 28, 29 y 30. El total de la regla 25 sigue saliendo de una sola respuesta, ahora con compras y ajustes (regla 49).

**Monto:**

46. **Monto válido:** el de la regla 15, colones enteros de 0 a 9 999 999 999 con separadores de miles en grupos de 3. Se valida en el cliente y otra vez en la RPC.
47. **₡0:** es un total real en una compra y en un periodo. Una compra en ₡0 cuenta en "Compras". Un periodo puede quedar en ₡0 con un ajuste negativo.

**Compra:**

48. **Qué se puede editar:** solo una compra **cerrada y propia**. Se cambia únicamente `total_amount`: `closed_at` no cambia, así que la compra sigue en el mismo día, semana y mes. Una compra "Sin total" pasa de "Sin total" a "Compras" al guardarla.
    - **Compras históricas:** sí se pueden editar. Cualquier compra cerrada propia que el Historial muestre se puede editar, también si se cerró en un día, una semana o un mes ya terminados, siempre que supere las validaciones de esta sección. La RPC no pone un límite de fecha.
    - Hoy el Historial solo muestra el periodo en curso (D7), así que el lápiz solo aparece en las compras de ese periodo. Por ejemplo, en la vista Mes se puede editar una compra de una semana anterior del mismo mes.

**Ajustes:**

49. **Total de un periodo** = compras con total + ajustes que cuentan en ese periodo. Las compras "Sin total" siguen sin sumar y un ajuste no las completa.
50. **Uno por periodo:** volver a editar el total de un periodo reemplaza su ajuste, y si la diferencia da 0 se quita y su fila desaparece. Un cambio de zona puede dejar dos ajustes del mismo nivel en un periodo, porque dos semanas distintas caen en una sola; siguen sumando bien, y la siguiente edición los une en el más antiguo.
51. **Lo calcula la base:** el cliente manda el total deseado. La diferencia se calcula en la base con los datos de ese momento, así que un dato viejo en pantalla no altera el resultado.
52. **Dónde cuenta:** un ajuste lleva como fecha el momento de crearlo, que no cambia al reemplazarlo, y cuenta en su nivel y en los mayores que contienen esa fecha, nunca en los menores.

    | Nivel del ajuste | Día | Semana | Mes |
    |---|---|---|---|
    | Día | Sí | Sí | Sí |
    | Semana | No | Sí | Sí |
    | Mes | No | No | Sí |

    Por eso la suma de los días puede no dar la semana. Es intencional: la fila "Ajuste manual" explica la diferencia.
53. **Editar una compra con un ajuste existente:** el ajuste no se recalcula. El total del periodo se mueve con la diferencia de esa compra.
54. **Sin negativos (D18):** ningún periodo con un ajuste manual puede quedar negativo. Todos los periodos se calculan con la zona guardada de la persona. Si alguno queda negativo, se rechaza **toda** la operación con `23514` y no se guarda nada.
    - **Al guardar un ajuste:** se revisan el día, la semana y el mes de hoy y de la fecha de los ajustes que se reemplazan.
    - **Al editar una compra:** se revisan el día, la semana y el mes que contienen su `closed_at`, también si es una compra histórica.
    - **Al cambiar de zona:** se revisan los periodos de todos los ajustes de la persona, en la zona nueva.
    - **Dentro de la transacción de la RPC:** la revisión se hace después de escribir y antes de confirmar, de modo que un rechazo deshace también la escritura.
    - **Sin condiciones de carrera:** cada RPC toma el bloqueo por usuario antes de leer o escribir, y lo conserva hasta terminar la transacción. Las tres usan el mismo bloqueo, así que una no puede cambiar un total mientras otra lo revisa. La compra se lee además con `for update`.
    - **Por qué alcanza:** estas RPC son las únicas escrituras del cliente que pueden bajar un total. Cerrar una compra solo suma, y una compra cerrada no se borra desde el cliente.
    - **Qué no cubre:** un cambio por fuera de la aplicación (`service_role`, SQL manual) no pasa por esta revisión. Tampoco una actualización de la base de zonas de PostgreSQL, que podría mover los límites de fechas ya guardadas.

**Edición:**

55. "Cancelar", Escape o cambiar de periodo descartan lo escrito. Un guardado en curso no se descarta: su respuesta se aplica si la fila o el periodo siguen visibles.
56. Mientras guarda, el campo y los botones quedan deshabilitados; un segundo "Guardar" no manda otra llamada.
57. Dos escrituras sobre el mismo dato desde dos pestañas: gana la última. Son datos propios, sin bloqueo optimista. La base ordena por usuario las escrituras de esta historia, para que cada cálculo vea el resultado de la anterior.

**Zona horaria:**

58. **Una sola referencia:** los periodos de una persona se calculan siempre con su zona guardada.
    - **El navegador no decide:** las RPC de edición no reciben ninguna zona. Viajar o cambiar la zona del navegador no cambia la zona guardada ni los periodos.
    - **Tiene que reconocerla PostgreSQL y ser una zona con nombre:** `America/Costa_Rica`, `UTC` o `Etc/GMT+5`, que es un nombre de la base de zonas. No valen un desfase como `UTC+5`, una abreviatura como `CST`, un directorio como `America/Argentina` ni las copias `posix/` y `right/`. Si no, `set_spending_time_zone` responde `22023` y no guarda nada.
    - **No autoriza nada:** quién es el dueño y qué compras puede tocar salen siempre de `auth.uid()`.
    - **Mismos límites en todo:** el Dashboard, el Historial y las RPC aplican las definiciones de la regla 8 (inicio incluido, fin excluido; semana de lunes a lunes; mes del día 1 al día 1 siguiente). Con zona guardada, las pantallas leen los límites de `get_period_finance`; en esos casos, los límites no se calculan en el navegador, como decía la regla 8.
    - **Medianoche repetida:** si el horario retrocede justo a medianoche, como en La Habana, el día empieza en la primera de las dos, sea cual sea la duración del retroceso. Así el fin de un periodo es el inicio del siguiente. Si la medianoche no existe, como el día que Samoa se saltó en 2011, el periodo anterior termina donde empieza el siguiente.
    - **Cada instante en el periodo que lo contiene:** si el horario retrocede después de medianoche o cruzándola, como en Terranova hasta 2010, la fecha local vuelve a ser la de ayer un rato. Ese rato cuenta en el periodo que lo contiene, no en el de su fecha local.
    - **"Hoy" al guardar un ajuste:** es la hora real después de tomar el bloqueo, no la del inicio de la transacción.
59. **Zona guardada por persona** (decisión de la dueña de la historia, 2026-11-02).
    - **Sin backfill:** ningún dato existente dice cuál es la zona de una persona, así que los usuarios existentes y los nuevos empiezan igual, sin zona. Nunca se asigna sola, ni al intentar editar.
    - **Confirmar:** al editar un total sin zona, las RPC responden `TZ001`. La pantalla propone la zona del navegador y la guarda solo si la persona la confirma. Se puede ver Finanzas sin confirmar: sin zona no hay ajustes, y `get_period_finance` responde `time_zone: null`, así que la pantalla lee como hasta ahora, con el navegador. Si PostgreSQL deja de reconocer la zona guardada, las RPC responden `TZ002`: ahí sí hay ajustes, y la pantalla pide confirmar otra zona antes de mostrar totales.
    - **Cambiar:** es una acción explícita, con `set_spending_time_zone`. Se aceptan otra zona o un alias si ningún periodo con ajustes queda negativo en ella; si no, se rechaza la operación completa con `23514` y sigue la anterior.
    - **Efecto de cambiar:** los ajustes conservan su fecha, y sus periodos se calculan con la zona nueva. Un total puede cambiar de periodo.
60. **Qué se puede hacer ante cada rechazo.** Hay casos sin salida desde la aplicación, y se declaran acá. Ninguna operación oculta ni agrava un periodo negativo: toda operación que lo toque se rechaza, y la lectura lo muestra tal cual.
    - **Compra con `23514`:** se puede guardar con un monto mayor, porque todos los periodos revisados contienen la compra. Sin embargo, no se puede guardar un monto menor mientras un ajuste negativo lo impida, y un ajuste de un periodo anterior ya no se puede quitar (D15). Es lo que pide D18.
    - **Periodo con `23514`:** se puede escribir otro total. Si el ajuste que lo impide es de un periodo anterior, la salida es subir una compra de ese periodo.
    - **Cambio de zona con `23514`:** sigue la zona anterior, y se puede seguir usando. Para cambiarla, hay que subir compras de los periodos que quedarían negativos.
    - **`TZ001` y `TZ002`:** se resuelven confirmando una zona. `set_spending_time_zone` no necesita la zona anterior, así que también sirve si PostgreSQL dejó de reconocerla.
    - **Zona del navegador no reconocida:** si PostgreSQL no conoce la zona que propone el navegador, da `22023` y hasta que exista una forma de elegir otra zona esa persona no puede editar totales. Se define en la Etapa 5.
    - **Periodo ya negativo:** solo aparece por un cambio fuera de la aplicación (`service_role`, SQL manual) o por una actualización de la base de zonas de PostgreSQL. Si es el periodo en curso, la persona lo arregla escribiendo su total. Si es un periodo anterior, nada en la aplicación lo arregla, y tampoco subir una compra si el déficit supera el tope de la regla 46: hace falta soporte, con el procedimiento de [plan.md](plan.md#recuperación-de-un-periodo-negativo).
    - **Sin salida desde la aplicación:** además del caso anterior, un ajuste negativo tan grande que ninguna zona nueva lo sostenga.

### SCRUM-92

**Decididas por la dueña de la historia** (2026-11-13). Las alternativas descartadas están en [plan.md](plan.md), "SCRUM-92".

- **D23. Umbral:** **24 horas** desde `closed_at`. Es una duración, no un límite de calendario, así que no depende de la zona horaria ni de que la persona haya confirmado una.
- **D24. Canal:** un **indicador persistente dentro de Finanzas**. Sin push, sin correo y sin trabajos programados.
- **D25. Compras de periodos anteriores:** una sección **"Compras sin total"** en el Historial con las pendientes de **cualquier fecha**, no solo del periodo en curso. D7 no cambia: el selector y el total siguen mostrando solo el periodo en curso.
- **D26. Dónde y cómo:** el recordatorio se ve **solo en Finanzas** (Dashboard e Historial) y **no se puede descartar**: desaparece cuando ya no queda ninguna compra que pase el umbral. Sin contador en la navegación y sin guardar estado de "visto".
- **D27. Contraste:** el badge cumple **WCAG AA, 4,5:1**, en los dos temas. Medido el 2026-11-13 con los tokens de `app/globals.css`:

  | Tema | Texto | Fondo del `Chip` terracota | Contraste |
  |---|---|---|---|
  | Claro | `#d97b4f` | terracota al 10 % sobre `surface` o `bg` | 2,58:1 a 2,76:1, **no cumple** |
  | Oscuro | `#e89a6c` | terracota al 10 % sobre `surface` o `bg` | 5,89:1 a 6,58:1, cumple |

  En el tema claro hace falta un texto más oscuro: el primer tono del mismo matiz que llega a 4,5:1 en el peor fondo es `#9c5939` (4,57:1). El ajuste va en un **token nuevo de texto terracota** y un **tono nuevo del `Chip`** que lo usa. El tono `TERRACOTTA` existente y `--tacha-terracotta` no cambian, porque los usan otras pantallas.

**Heredadas, sin cambios:** D3, D4, D6 y regla 7, D8 (una compra sin total no suma, y ₡0 es un total real), D12 (las "Sin total" tienen lápiz), D13 (no se vuelve a "Sin total"), D21, D22, reglas 46 a 48 y 58.

**Badge (CA-01):**

61. **Cómo se ve:** el `Chip` de `components/ui` con el tono terracota accesible de D27 y el texto **"Sin total"**, junto al lápiz. Sin rojo, sin ícono de error y sin `role="alert"`. El estado se dice en texto, no solo con color.
62. **Dónde:** solo en las filas de compra. No cambian el contador "Sin total" de `SpendingTotal`, ni "No incluye N compras sin total" del Dashboard, ni las filas de ajuste. Un total de ₡0 nunca lleva badge (D8).

**Recordatorio (CA-02):**

63. **Qué cuenta:** las compras cerradas propias con `total_amount` nulo y `closed_at` igual o anterior a la hora actual menos 24 horas (D23), de cualquier fecha. Una compra cerrada hace 23 horas y 59 minutos todavía no cuenta; una de 24 horas exactas, sí.
64. **Persistente y sin descartar (D26):** se ve en el Dashboard y en el Historial cada vez que se abren, mientras quede alguna, y desaparece cuando ya no queda ninguna. No hay botón para cerrarlo ni se guarda que se vio. Es informativo: sin `role="alert"` ni colores de error, con la cantidad en texto y un enlace a la sección "Compras sin total".
65. **Sin trabajos programados:** se calcula al leer, con la hora del navegador al cargar. No avisa con la app cerrada, que es el límite de un indicador (D24), ni se actualiza solo si la pantalla queda abierta y una compra cumple las 24 horas: se ve en la próxima carga.
66. **Una sola lectura:** el recordatorio y la sección de pendientes salen de la misma respuesta, para que no se contradigan (como la regla 25).
67. **Si la lectura falla:** el recordatorio muestra un error discreto con "Reintentar", sin tapar el total del periodo. No se oculta el fallo, porque eso se vería como "no tienes compras sin total".

**Completar (CA-03):**

68. **Sin lógica nueva de edición:** el lápiz, `useTotalEdit` y `set_purchase_session_total` de SCRUM-91, con la misma validación, los mismos errores (incluidos `TZ001`, `TZ002` y `P0002`), el foco y D21. Hay un solo campo abierto en toda la pantalla, aunque la misma compra aparezca en dos listas, y el campo se abre solo en la fila donde se tocó el lápiz.
69. **Al guardar:** la compra sale de las pendientes y el recordatorio se actualiza sin recargar. Si está en el periodo en curso, se aplica igual que en SCRUM-91 (`applySavedPurchase`).
70. **Sección "Compras sin total" (D25):** todas las pendientes de cualquier fecha, también las que todavía no cumplen 24 horas; `closed_at` descendente y después `id` (regla 26), fechas en la zona guardada (regla 58), conteo exacto y error si no coincide (regla 30). Sin paginación: son compras personales sin completar, pocas filas; el riesgo está en el plan.
71. **Solo cuentas registradas** (D6): una compra cerrada sin total en una sesión anónima no recibe recordatorio, porque esa sesión no puede abrir Finanzas.

## 6. Estados

### SCRUM-69

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

### SCRUM-90

**Acceso:** `FINANCE_ACCESS_STATUS` (`checking`, `noAccount`, `registered`), igual que en SCRUM-69.

**Compras del periodo** (`SPENDING_STATUS`), una unión:

| Estado | Cuándo | Qué se ve |
|---|---|---|
| `loading` | Primera carga, cambio de periodo o reintento | El selector y un `Spinner` en lugar del total y de la lista |
| `ready` | Hay al menos una compra cerrada | Total, fechas, contadores y lista |
| `empty` | Ninguna compra cerrada | ₡0 y "Todavía no tienes compras cerradas en este periodo.", sin lista |
| `failed` | Falló la consulta o el resultado está incompleto (regla 30) | Error y "Reintentar", sin lista; el selector sigue disponible |

El aviso de precios se ve en los cuatro estados, siempre con cuenta registrada.

### SCRUM-91

**Compras y gasto:** `SPENDING_STATUS`, con un cambio: `empty` exige que tampoco haya ajustes. Un periodo solo con ajuste está en `ready`.

**Edición** (`TOTAL_EDIT_STATUS`), una unión, para un solo campo a la vez (D21):

| Estado | Cuándo | Qué se ve |
|---|---|---|
| `viewing` | Sin campo abierto | Montos y lápices |
| `editing` | Abrió un lápiz | Campo con el valor actual, "Guardar" y "Cancelar"; una compra "Sin total" lo abre vacío |
| `saving` | Esperando la RPC | Campo y botones deshabilitados, "Guardando…"; los demás lápices deshabilitados |
| `saveFailed` | Falló el guardado | El campo con lo escrito, el error y los mismos botones |

**Zona:** antes de la primera edición, se pide confirmar. Mientras no haya zona guardada, los lápices se ven igual, y al guardar `TZ001` abre la confirmación sin perder lo escrito.

**Cuándo hay lápiz:**

| Situación | Lápiz del periodo | Lápiz de las compras |
|---|---|---|
| `loading` o `failed` | No | No hay lista |
| `empty` | Sí (D17) | No hay lista |
| `ready` | Sí | Sí |
| Fila "Ajuste manual" | No aplica | Sin lápiz (D16) |

### SCRUM-92

**Recordatorio**, una unión:

| Estado | Cuándo | Qué se ve |
|---|---|---|
| `loading` | Leyendo las pendientes | Nada, para no mover la pantalla |
| `none` | Ninguna lleva 24 horas o más | Nada |
| `pending` | Una o más llevan 24 horas o más | El recordatorio con la cantidad |
| `failed` | Falló la lectura | El error discreto y "Reintentar" (regla 67) |

**Sección "Compras sin total"**: `loading`, `empty` (no se muestra la sección), `ready` y `failed`, con el patrón de `SPENDING_STATUS`. El recordatorio y la sección salen de la misma lectura (regla 66): si falla, el error se muestra una sola vez, en el lugar del recordatorio.

**Edición:** `TOTAL_EDIT_STATUS` de SCRUM-91, sin cambios.

## 7. Errores

### SCRUM-69

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

### SCRUM-90

Reutiliza los textos de SCRUM-69:

| Situación | Mensaje visible | Dónde |
|---|---|---|
| Sin cuenta registrada | "Inicia sesión con tu cuenta para ver tus finanzas." + "Iniciar sesión" | Lugar de la pantalla; no lleva `role="alert"` |
| No se pudieron cargar las compras, o el resultado está incompleto (regla 30) | "No se pudo cargar tu gasto. Intenta de nuevo." + "Reintentar" | Bloque del total, `role="alert"` |
| Una fila sin nombre de supermercado (regla 29) | No es un error: "Supermercado no disponible" en esa fila | Fila de la lista |
| La sesión venció o dejó de ser válida | El mismo error; al reintentar se vuelve a leer la sesión y, si ya no es registrada, se pasa a `noAccount` | Ídem |

Los errores de Supabase no se muestran crudos.

### SCRUM-91

Textos propuestos (se confirman al escribir las constantes):

| Situación | Mensaje visible | Dónde |
|---|---|---|
| Vacío, inválido, con decimales o mayor al tope | "Escribe el monto en colones, solo números (ej. 50000)." | Debajo del campo, con `aria-describedby`; sin llamar a la base |
| No se pudo guardar (red o servidor) | "No se pudo guardar el total. Intenta de nuevo." | Debajo del campo, `role="alert"`; lo escrito se conserva |
| Dejaría un periodo en negativo, código `23514` (regla 54) | "Ese monto dejaría un periodo en negativo. Revisa el total del día, la semana y el mes." | Ídem |
| Sin zona confirmada, código `TZ001` (reglas 59 y 60) | "Confirma tu zona horaria para guardar este total." + la zona del navegador + "Confirmar" | Ídem; lo escrito se conserva |
| PostgreSQL ya no reconoce la zona guardada, código `TZ002` (regla 60) | "Tu zona horaria guardada ya no es válida. Confirma tu zona para continuar." + la zona del navegador + "Confirmar" | En lugar de los totales; lo escrito se conserva |
| La zona nueva dejaría un periodo en negativo, código `23514` | "No se puede usar esa zona: dejaría un periodo en negativo. Sigues con tu zona actual." | Junto a la acción de cambiar de zona |
| La compra ya no se puede editar, `P0002` | "Esa compra ya no está disponible. Recarga la lista." | Ídem |
| La sesión venció, `42501` o `401` | El error de guardado; al volver a leer la sesión, si ya no es registrada, se pasa a `noAccount` | Ídem |

Los errores de Supabase no se muestran crudos. Un error de guardado no cambia los montos en pantalla.

**Código `23514`:** la aplicación identifica específicamente este código para mostrar el mensaje de arriba. Nunca lee ni compara el texto interno de PostgreSQL, que puede cambiar. Las RPC validan los montos antes de escribir, así que en esta operación el código solo llega por la regla 54. Cualquier otro código desconocido muestra el error general de guardado.

**Códigos `TZ001` y `TZ002`:** son propios de esta historia y distintos de `23514`: `TZ001` significa que falta confirmar una zona y `TZ002`, que la guardada ya no se reconoce. La aplicación también los identifica por el código, nunca por el texto interno.

**Cómo se identifican todos los errores:** siempre por `error.code`, nunca por el estado HTTP ni por el texto de PostgreSQL. PostgREST puede dar el mismo estado a códigos distintos, y a `P0002` probablemente un 500.

### SCRUM-92

Textos propuestos (se confirman al escribir las constantes):

| Situación | Mensaje visible | Dónde |
|---|---|---|
| No se pudo leer las compras sin total | "No se pudo revisar si tienes compras sin total. Intenta de nuevo." + "Reintentar" | En el lugar del recordatorio; no tapa el total |
| Guardar el total | Los de SCRUM-91 §7, sin cambios | Junto al campo |
| La compra ya no existe (`P0002`) | El de SCRUM-91 §7; la lista de pendientes se vuelve a leer | Junto al campo |

## 8. UI esperada

### SCRUM-69

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

### SCRUM-90

Según DESIGN.md §7.9, sin lo que es de HU-60 y HU-61 (lápiz de edición y badge). Textos propuestos:

- Título **"Finanzas"** y barra de sub-tabs **"Dashboard"** e **"Historial"**, con el patrón visual de `RecipesTabs`.
- Selector de periodo: el mismo `SpendingPeriodSelector`.
- Total: el mismo `SpendingTotal`, con "Gastado esta semana", el monto en Fraunces, las fechas y los dos `StatCard`.
- Debajo del total, `PriceDisclaimer`, una sola vez.
- Lista: una fila por compra con fecha, supermercado y monto. **"Sin total"** va como texto neutro, sin color de error.

### SCRUM-91

Según DESIGN.md §7.9. Textos propuestos:

- **Periodo:** un lápiz pequeño al lado del monto en Fraunces. El campo se llama "Total de hoy (₡)", "Total de esta semana (₡)" o "Total de este mes (₡)".
- **Compra:** un lápiz al lado de su monto o de "Sin total". El campo se llama "Total de la compra (₡)".
- **Campo:** "Guardar" y "Cancelar", como en el presupuesto, dentro de la misma fila o del bloque del total.
- **Fila de ajuste:** fecha, "Ajuste manual" y el monto con signo ("+₡5 000", "−₡5 000"), sin lápiz. Va en la misma lista, ordenada por fecha con las compras.
- **Contadores:** "Compras" y "Sin total" no cambian por un ajuste.
- **Dashboard:** sin lápices. Si el total del periodo incluye algún ajuste, debajo del monto va una indicación discreta en texto secundario: **"Incluye ajustes manuales"**. Sin ajustes no se muestra. "Compras" y "Sin total" no cambian.

- **Confirmar la zona:** al recibir `TZ001`, un aviso junto al campo muestra la zona del navegador y "Confirmar". Nunca se guarda sin ese toque.

Ícono: `Pencil` de `lucide-react`, con `Icon` de `@/components/ui`.

### SCRUM-92

Según DESIGN.md §7.9: "Sesiones sin total ingresado deben distinguirse visualmente (ej. badge terracota «Sin total») sin sentirse como un error". Terracota es para etiquetas contextuales y montos (DESIGN.md §2), y nunca compite con el teal de las acciones.

- **Badge:** el `Chip` con el tono terracota accesible (D27) y "Sin total", en el lugar del monto y junto al lápiz.
- **Recordatorio:** un aviso discreto en tonos crema y terracota (`chipbg` y `chipborder`, texto con el contraste de D27), sin rojo y sin botón de cerrar (D26):
  - **Historial:** arriba de la lista. Texto propuesto: **"Tienes 1 compra sin total desde hace más de 24 horas"** o **"Tienes 3 compras sin total desde hace más de 24 horas"**, más un enlace **"Completarlas"** que lleva a la sección.
  - **Dashboard:** la misma línea debajo del total, con el enlace al Historial en la sección. Sin lápices (D11).
- **Sección "Compras sin total"** (D25), debajo de la lista del periodo: con las mismas filas del Historial (fecha, supermercado, badge y lápiz).

## 9. Accesibilidad

### SCRUM-69

- El selector es un grupo con nombre ("Periodo"), con tres botones con `aria-pressed`; se usa con Tab y Enter o Espacio.
- El gasto y el presupuesto tienen su etiqueta en texto, no solo el número; la diferencia dice en palabras si queda o si se pasó (no solo color).
- Una zona `role="status"` siempre montada anuncia el nuevo total al cambiar de periodo y "Presupuesto guardado" al guardar. Los errores van en `role="alert"`.
- El campo del presupuesto tiene `label`; su error se asocia con `aria-describedby` y `aria-invalid`.
- Al abrir la edición el foco va al campo; al guardar o cancelar vuelve al botón "Editar presupuesto".
- El enlace "Iniciar sesión" es un enlace real (`<a>`), no un botón.
- Todo se puede hacer solo con teclado, en desktop y en mobile.

### SCRUM-90

- Los sub-tabs son un `<nav>` con nombre ("Secciones de finanzas") y links reales; el activo lleva `aria-current="page"`.
- El selector, la zona `role="status"` y los errores funcionan como en SCRUM-69.
- La lista es un `<ul>` con nombre ("Compras del periodo"), con un `<li>` por compra.
- "Sin total" se dice en palabras, no solo con color.
- Todo se puede hacer solo con teclado, en desktop y en mobile.

### SCRUM-91

- Cada lápiz es un `<button>` con nombre propio: "Editar total del domingo 18 de octubre, MaxiPali" y "Editar total de esta semana". El ícono es decorativo.
- El campo tiene `label`; su error usa `aria-describedby` y `aria-invalid`.
- **Foco:** al abrir, va al campo; al guardar o cancelar, vuelve a su lápiz; si el guardado falla, vuelve al campo. Escape cancela.
- La zona `role="status"` anuncia "Total guardado" y el total nuevo. Los errores de guardado van en `role="alert"`.
- "Ajuste manual" y el signo del monto se dicen en texto, no solo con color. "Incluye ajustes manuales" también es texto, cerca del total.
- Todo se puede hacer solo con teclado, en desktop y en mobile.

### SCRUM-92

- **Badge:** "Sin total" va en texto; el color acompaña. Contraste según D27.
- **Recordatorio:** no lleva `role="alert"`, porque no es un error ni algo urgente; se lee con el resto de la página. El enlace tiene un nombre que dice adónde lleva.
- **Sección de pendientes:** un `<ul>` con nombre ("Compras sin total") y un `<li>` por compra.
- **Lápiz y campo:** SCRUM-91 §9, sin cambios: nombre propio, foco, Escape y `aria-*`.
- Todo se puede hacer solo con teclado, en desktop y en mobile.

## 10. Restricciones técnicas

### SCRUM-69

- TypeScript estricto, Tailwind con tokens `tacha-*`, sin strings sueltos (constants-standards).
- Estructura de feature (component-architecture): todo lo nuevo vive en `features/finance/`, salvo la ruta `app/(app)/finanzas/page.tsx` (que solo compone la feature), `APP_ROUTE.FINANCE` y el ítem de la navegación (project-structure).
- **No se modifica `features/shopping-list/`** (decisión del 2026-10-18). Las reglas de monto y la medianoche local se implementan dentro de Finanzas (plan, "Qué se reutiliza").
- Estado de servidor con servicios y `useEffect` en el ViewModel (AGENTS.md: TanStack Query no está instalado).
- Los límites del periodo, la suma y la validación del monto son funciones puras, probadas sin React.
- Sin librerías de fechas: `Date` e `Intl.DateTimeFormat` del navegador.
- Base: una migración nueva con el procedimiento de `supabase/README.md`, su prueba SQL en `supabase/tests/` y `security-reviewer` antes de aplicarla. No se modifican migraciones aplicadas ni las políticas de `purchase_sessions`.
- Tests automáticos obligatorios (CONTRIBUTING §7) y E2E según [plan.md](plan.md#pruebas). El E2E usa una sesión registrada y respuestas de Supabase simuladas: valida la interfaz, no la autenticación real ni la seguridad de la base (decisión de la dueña de la historia, 2026-10-19).

### SCRUM-90

- Mismas reglas de SCRUM-69. Todo lo nuevo vive en `features/finance/`, salvo la ruta `app/(app)/finanzas/historial/page.tsx`, que solo compone la feature, y `APP_ROUTE.FINANCE_HISTORY`.
- `FinanceTabs` vive en la feature porque solo la usa Finanzas (project-structure).
- **Sin migraciones ni cambios en la RLS, en `types/database.types.ts` ni en `features/shopping-list/`.**
- Sin duplicar SCRUM-69: se reutilizan selector, total, utils y constantes. El acceso se extrae a `useFinanceAccess`, sin cambiar su comportamiento.
- Siempre `getSession`, nunca `ensureSession`: abrir el Historial no crea un usuario anónimo.
- Tests automáticos obligatorios y E2E según [plan.md](plan.md#scrum-90-ver-historial-de-sesiones-de-compra).

### SCRUM-91

- Mismas reglas de SCRUM-69 y SCRUM-90. Todo lo nuevo de interfaz vive en `features/finance/`.
- **No se amplían los permisos de update sobre compras cerradas:** ni política nueva, ni `grant` nuevo sobre `purchase_sessions`. Un PATCH directo sobre una compra cerrada sigue bloqueado. La única vía son las RPC.
- **Trigger:** `stamp_purchase_session_close` (`018`) pone `now()` en todo update con `closed_at` no nulo. Sin corregirlo, editar un total movería la compra a hoy. La migración lo corrige sin cambiar el cierre normal.
- **RPC `security definer`:** `set search_path = ''`, dueño tomado de `auth.uid()`, rechazo de sesiones anónimas y `execute` solo para `authenticated`. Migración con el procedimiento de `supabase/README.md`, prueba SQL y `security-reviewer` antes de aplicarla.
- No se editan migraciones aplicadas ni `features/shopping-list/`.
- Estado con servicios y `useEffect`, sin TanStack Query ni Realtime. Lógica en ViewModels y hooks; los `.tsx` solo presentan.
- Textos, RPC, códigos de error y estados en `finance.constants.ts`, sin strings sueltos.
- Tests automáticos obligatorios y E2E según [plan.md](plan.md#scrum-91-editar-el-total-de-una-sesión-o-periodo).

### SCRUM-92

- **Sin migración, RPC ni Edge Function:** la lectura usa la RLS de `016`, y la escritura, `set_purchase_session_total` (`040`).
- **Sin Realtime, push ni correo:** D24 y regla 65.
- **Reutiliza sin duplicar:**
  - `Chip`, de `components/ui`;
  - `PurchaseSessionRow` y `EditTotalButton`;
  - `InlineTotalEditor` y `useTotalEdit`;
  - `formatDay` y `formatColones`.
- **Textos y umbral en `FINANCE_TEXT` y constantes propias.** El umbral con su unidad en el nombre, como `_MS` (constants-standards).
- **Fuera de Finanzas, solo lo de D27:** un token nuevo en `app/globals.css` (texto terracota, en los dos temas) y un tono nuevo del `Chip` en `components/ui` y `CHIP_TONE`. Son cambios aditivos: el tono `TERRACOTTA` y `--tacha-terracotta` quedan iguales. No se tocan `shopping-list` ni `components/app-shell` (D26).

## 11. Dependencias

### SCRUM-69

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

### SCRUM-90

| Dependencia | Estado (2026-10-31) | Efecto |
|---|---|---|
| SCRUM-69 (HU-37): pantalla, selector, total, utils y acceso | En `develop` | Se reutilizan |
| SCRUM-67 (HU-36f): `purchase_sessions` (`016`, `018`) y `stores` | En `develop` | Fuente de los datos, sin cambios |
| SCRUM-75 (HU-43): `PriceDisclaimer` | En `develop` | Se reutiliza en el Historial; su integración en el Dashboard sigue en SCRUM-75 |
| HU-60, HU-61 y HU-62 | Sin empezar | Se suman al Historial después |

No depende de ningún PR sin mergear.

### SCRUM-91

| Dependencia | Estado (2026-11-02) | Efecto |
|---|---|---|
| SCRUM-90 (HU-59): Historial, `usePeriodPurchases`, `PurchaseSessionRow` | En `develop` (#87, `9a6ec22`) | Se extiende |
| SCRUM-69 (HU-37): Dashboard, `SpendingTotal`, `getPeriodSpending`, `parseBudgetAmount` | En `develop` | Se extiende |
| SCRUM-67 (HU-36f): `purchase_sessions` y su trigger (`016`, `018`) | En `develop` | Solo cambia el trigger |
| `Icon` y `lucide-react` | En `develop` | Ícono del lápiz |
| HU-61 | Sin empezar | Toma el badge y el recordatorio; CA-03 queda adelantado por D12 |

No depende de ningún PR sin mergear.

### SCRUM-92

| Depende de | Estado | Uso |
|---|---|---|
| SCRUM-90 (HU-59): Historial, `PurchaseSessionRow`, `usePeriodPurchases` | En `develop` | Se extiende |
| SCRUM-91 (HU-60): `useTotalEdit`, `EditTotalButton`, `InlineTotalEditor`, `setPurchaseTotal`, migración `040` | En `develop` (#94) | Se reutiliza sin cambiar su contrato |
| `Chip` de `components/ui` | En `develop` | Badge (D27) |
| SCRUM-93 (HU-62): filtros | Sin empezar | No se cruza: los filtros no cambian qué compra está pendiente |

## 12. Contratos externos

### SCRUM-69

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
  | `amount` | `numeric` (sin precisión, para no redondear en silencio) | `not null`, `check (amount <> 'NaN' and amount >= 0 and amount <= 9999999999 and amount = trunc(amount))`: colones enteros, hasta 9 999 999 999 |
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

### SCRUM-90

**Lo que existe** (verificado el 2026-10-31 en `develop`, `af38bd5`):

- `public.purchase_sessions`: `id`, `store_id` (obligatorio, FK a `stores`), `closed_at`, `total_amount numeric(12, 2)` (nulo = "sin total"). Su RLS deja leer solo las propias.
- `public.stores`: `display_name`, con lectura abierta (`"public read stores"`).

**Lectura del Historial** (sin cambios en la base; solo con sesión registrada):

```
purchase_sessions  select id, closed_at, total_amount, stores(display_name)
                   where closed_at >= <inicio> and closed_at < <fin>
                   order by closed_at desc, id
```

La consulta se hace con `count: "exact"` (regla 30).

No se pide `owner_id` ni se manda ningún id de usuario.

### SCRUM-91

Migración nueva: `040_edit_purchase_totals.sql` ([plan.md](plan.md#número-de-la-migración-1)).

**Tabla `public.spending_adjustments`:**

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `uuid` | `primary key default gen_random_uuid()` |
| `owner_id` | `uuid` | `not null`, FK a `auth.users` con `on delete cascade` |
| `scope` | `text` | `not null`, `check (scope in ('day', 'week', 'month'))` |
| `effective_at` | `timestamptz` | `not null`; la hora de la base al crearlo; no cambia al reemplazarlo (regla 52) |
| `amount` | `numeric(18, 2)` | `not null`, `check (amount <> 'NaN' and amount <> 0)`; con signo. Lleva centavos porque una compra antigua puede tenerlos |

Sus periodos no se guardan: salen de `effective_at` y de la zona de su dueño. Por eso cambiar de zona no deja datos viejos, y "uno por periodo" lo cumple `set_period_total` bajo el bloqueo por usuario, no un índice único (regla 50).

**Tabla `public.spending_time_zones`:** `owner_id uuid` (`primary key`, FK a `auth.users` con `on delete cascade`) y `time_zone text not null`. Una fila por persona; sin fila, no confirmó ninguna zona. Sin backfill.

**Permisos, en las dos tablas:** RLS activada; `revoke all` de `public`, `anon` y `authenticated`; solo `grant select` a `authenticated`, con política de dueño registrado (el mismo criterio de `027`). El cliente no escribe ninguna.

**`set_purchase_session_total(target_session_id uuid, new_total numeric) returns public.purchase_sessions`:**

- Sin `auth.uid()` o con sesión anónima: `42501`.
- Total nulo, negativo, con decimales, `NaN` o sobre el tope: `22023`.
- Sin zona confirmada: `TZ001`; zona guardada que PostgreSQL ya no reconoce: `TZ002`. Los dos, sin revisar la compra.
- Compra inexistente, ajena o abierta: `P0002`, con el mismo mensaje en los tres casos.
- Sin límite de fecha: acepta cualquier compra cerrada propia (regla 48).
- Dejaría un periodo con ajustes en negativo: `23514`, sin guardar nada.
- Devuelve la fila actualizada.

**`set_period_total(target_scope text, target_total numeric) returns setof public.spending_adjustments`:**

- Sin `auth.uid()` o con sesión anónima: `42501`.
- Nivel o total inválidos: `22023`.
- Sin zona confirmada: `TZ001`; zona guardada que PostgreSQL ya no reconoce: `TZ002`.
- Calcula con la hora de la base y la zona guardada el periodo en curso (D15), y ajusta según las reglas 50 a 52.
- Dejaría un periodo con ajustes en negativo: `23514`, sin guardar nada.
- Devuelve el ajuste guardado, o ninguna fila si se quitó.

**`set_spending_time_zone(new_time_zone text) returns public.spending_time_zones`:**

- Sin `auth.uid()` o con sesión anónima: `42501`.
- Zona inválida (regla 58): `22023`.
- Crea o reemplaza la zona de quien llama.
- Dejaría un periodo con ajustes en negativo en la zona nueva: `23514`, y sigue la anterior.
- Devuelve la fila guardada.

**`get_spending_period_bounds(target_scope text) returns table (period_start timestamptz, period_end timestamptz)`:**

- Sin `auth.uid()` o con sesión anónima: `42501`.
- Nivel inválido: `22023`.
- Sin zona confirmada: `TZ001`; zona guardada que PostgreSQL ya no reconoce: `TZ002`.
- Devuelve los límites del periodo en curso, con la zona guardada.

Las cinco RPC, con `get_period_finance`, son `security definer`, `set search_path = ''`, con `revoke execute … from public, anon` y `grant … to authenticated`.

**`get_period_finance(target_scope text) returns jsonb`:** la lectura del Dashboard y del Historial. La implementa la `040`; los hooks que la usan son de la Etapa 2.

- **Por qué una sola:** el Dashboard y el Historial no leen compras y ajustes en consultas separadas. Entre dos consultas, una edición podría colarse y mostrar por un momento un total que no existe, incluso negativo.
- **Coherencia:** es **una sola sentencia SQL**, en una función SQL estable. Ve una sola foto de la base, así que la zona, los límites, las compras, los ajustes y el total son del mismo momento. Todas las funciones que llama son estables, y "ahora" es `now()`, una sola vez.
- **Responde:**

  | Campo | Contenido |
  |---|---|
  | `time_zone` | La zona guardada, o `null` si no hay |
  | `period_start`, `period_end` | Los límites del periodo en curso con esa zona; `null` sin zona |
  | `purchases` | `[{ id, closed_at, total_amount, store_name }]` del periodo, de la más reciente a la más antigua (regla 26); `store_name` es `null` si está en blanco (regla 29) |
  | `adjustments` | `[{ id, scope, effective_at, amount }]` que cuentan en el periodo (regla 52) |
  | `total` | Compras con total más ajustes (regla 49), calculado en la base; `null` sin zona |
  | `closed_count`, `without_total_count`, `adjustment_count` | Los contadores de §8; los ajustes no cuentan como compras |

- **Errores:** sin cuenta registrada, `42501`; nivel inválido, `22023`; zona guardada que PostgreSQL ya no reconoce, `TZ002`.
- **Sin zona:** no es un error. Responde `time_zone: null`, sin límites, compras, ajustes ni total, y la pantalla sigue leyendo como hasta ahora, con el navegador. Sin zona no hay ajustes (regla 59).
- **Con `TZ002`:** sí hay ajustes, así que la pantalla no muestra totales y pide confirmar una zona. Nunca cae a otra zona.
- **Resultados completos:** se arma en la base, sin el límite de filas de PostgREST.
- **Montos:** van como números JSON. Son exactos hasta unos 9 × 10^15, muy por encima de cualquier total real.
- **Tamaño:** sin tope de compras por periodo; son las compras personales de un mes como mucho.
- **Mismos permisos:** `security definer`, `set search_path = ''`, solo `authenticated`, el dueño de `auth.uid()`.

**Lecturas sin zona guardada** (solo con sesión registrada): no hay ajustes, así que no se leen. El Historial lee como hasta ahora y el Dashboard pide sus compras con `count: "exact"` (D19):

```
purchase_sessions     select total_amount
                      where closed_at >= <inicio> and closed_at < <fin>     con count: "exact" (D19)
```

Con zona guardada, las dos pantallas leen solo de `get_period_finance`.

**`stamp_purchase_session_close`:** si `old.closed_at` no es nulo, conserva ese valor; si la compra se está cerrando, pone `now()`, como hasta ahora. **Limitación aceptada:** ningún rol puede corregir o reabrir el `closed_at` de una compra cerrada con un update, tampoco soporte, sin deshabilitar el trigger.

### SCRUM-92

**Lectura** (solo con sesión registrada, sin `owner_id`; la RLS de `016` deja solo las propias):

```
purchase_sessions  select id, closed_at, total_amount, stores(display_name)
                   where closed_at is not null and total_amount is null
                   order by closed_at desc, id                          con count: "exact" (regla 30)
```

- Esta lectura alimenta la sección "Compras sin total" (D25) y el recordatorio, que filtra en el navegador las de `closed_at` igual o anterior a la hora actual menos 24 horas (reglas 63 y 66). El Dashboard hace la misma lectura para su recordatorio.
- El índice `purchase_sessions_owner_closed_idx` (`040`) cubre el filtro por dueño y fecha.
- **Escritura:** `set_purchase_session_total(target_session_id, new_total)`, igual que SCRUM-91 §12.

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

### HU-59 (SCRUM-90)

Estado al 2026-11-01, sobre `206df86`. Una casilla marcada indica la evidencia que tiene: **manual** es lo que informó la dueña de la historia; **automático** son tests con sesión y respuestas simuladas, que no prueban la base ni la autenticación real. Sin marcar, está pendiente.

Criterios de la historia, con cómo se verifica cada uno (con una cuenta registrada):

- [x] **CA-01:** el sub-tab "Historial" dentro de "Finanzas" muestra una lista de sesiones de compra con fecha, supermercado y monto. Manual y automático.
  - Desde `/finanzas`, "Historial" lleva a `/finanzas/historial`, queda activo y "Finanzas" sigue marcada en la navegación privada. Automático (E2E-FIN-05).
  - Cada compra cerrada del periodo se ve con su fecha, su supermercado y su monto, de la más reciente a la más antigua. Manual y automático.
  - Las compras abiertas no aparecen. Automático: el test del servicio fija el filtro por `closed_at`; sin comprobación manual.
- [x] **CA-02:** un selector de periodo Día / Semana / Mes filtra las sesiones y destaca el total del periodo. Manual y automático.
  - Arranca en **Semana** (`aria-pressed="true"`). Automático.
  - Cambiar de periodo cambia la lista y el total sin navegar ni recargar, y el total nuevo se anuncia en `role="status"`. El filtro y el total: manual y automático; el anuncio y que la URL no cambie: automático.
  - La lista y el total coinciden (regla 25). Manual y automático.
  - Una respuesta de un periodo anterior que llega tarde no reemplaza al elegido. Automático.

Casos de cada flujo:

- [x] **Sin total (D8):** total nulo → "Sin total", no suma y cuenta en "Sin total"; total 0 → ₡0 y cuenta en "Compras". "Compras" más "Sin total" da el número de filas. Automático (E2E-FIN-06).
- [x] **Supermercado no disponible (regla 29):** nombre nulo o en blanco → la fila se ve con su fecha y su monto, "Supermercado no disponible" y el total sin cambios. Automático (E2E-FIN-06).
- [x] **Resultado incompleto (regla 30):** conteo nulo o distinto de las filas recibidas → error, sin lista ni total. Automático (test del servicio).
- [x] **Tabs (D9):** cambiar a Mes, ir al otro tab y volver: cada pantalla arranca en Semana. Automático (E2E-FIN-05).
- [x] **Acceso (D6):** sin sesión y con una sesión anónima, `/finanzas/historial` muestra el aviso, sin barra de sub-tabs y sin pedir `purchase_sessions`. Automático, solo la interfaz (E2E-FIN-08); la prueba real sigue pendiente abajo.
- [ ] **Solo lo propio (D4):** una compra de otro integrante de la familia no aparece (prueba manual con dos cuentas registradas). No ejecutada.
- [x] **Vacío:** ₡0 y el mensaje de vacío, sin lista. Automático (E2E-FIN-07).
- [x] **Errores:** falla de la consulta → error, sin lista; "Reintentar" pide el mismo periodo. Automático (E2E-FIN-07).
- [x] **Aviso:** `PriceDisclaimer` aparece una sola vez, debajo del total, también en carga, vacío y error. Automático.
- [x] **Dashboard sin cambios:** los tests y E2E de SCRUM-69 siguen pasando; solo cambia la barra de sub-tabs. Automático.
- [x] **E2E (interfaz):** E2E-FIN-05 a 08 pasan en `chromium` y `mobile-chrome`. Validan la interfaz, **no** la autenticación real ni la seguridad de la base.
- [ ] **Manual (acceso real):** parcial.
  - [x] CA-01 y CA-02 con la pantalla real, informados por la dueña de la historia: fecha, supermercado y monto; orden de más reciente a más antigua; Día, Semana y Mes filtran y actualizan el total; el total coincide con los montos.
  - [ ] Sin sesión y con una sesión anónima real, sin llamadas a `purchase_sessions` en la pestaña de red.
  - [ ] D4 con dos cuentas de la misma familia.
  - [ ] Mobile y teclado.
  - [ ] Capturas sin correos.
  - [ ] Con datos reales: total nulo y ₡0, carga, vacío, error y reintento.
- [x] Tests automáticos (Vitest) del camino feliz y de al menos un caso negativo o límite por unidad.
- [x] `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` y `git diff --check` pasan. Detalle en [tasks.md](tasks.md), tarea 5.1.

### HU-60 (SCRUM-91)

Ninguno validado todavía.

Criterios de la historia, con cómo se verifica cada uno (con una cuenta registrada):

- [ ] **CA-01:** cada sesión de compra tiene un ícono de lápiz junto a su total para editarlo inline.
  - El lápiz abre el campo en la misma fila, sin navegar.
  - Guardar ₡12 000 cambia la fila, el total y los contadores sin recargar la lista.
  - La compra sigue con la misma fecha y en el mismo periodo (`closed_at` no cambia).
  - Una compra de un periodo ya terminado que el Historial muestre también se puede editar (regla 48); D15 no lo impide.
- [ ] **CA-02:** el total del periodo seleccionado también es editable directamente, sin entrar sesión por sesión.
  - Con ₡15 000 en compras, guardar ₡20 000 deja el total en ₡20 000 y agrega "Ajuste manual +₡5 000".
  - Las compras conservan sus montos, y "Compras" y "Sin total" no cambian.
  - Volver a editar reemplaza el ajuste; volver a ₡15 000 lo quita.
- [ ] **CA-03:** al guardar, el cambio se refleja de inmediato en el dashboard financiero (HU-37).
  - En la misma pestaña, al abrir "Dashboard" después de guardar, se ven el total nuevo y la diferencia con el presupuesto, sin recargar.
  - El Dashboard y el Historial muestran el mismo total en los tres periodos (D19).
  - Con ajustes, el Dashboard muestra "Incluye ajustes manuales" y "Compras" no cambia; sin ajustes, no lo muestra.

Casos de cada flujo:

- [ ] **Sin total (D12):** el lápiz abre vacío; guardar pasa la compra a "Compras" y baja "Sin total".
- [ ] **₡0 (regla 47):** guardar 0 muestra ₡0 y cuenta en "Compras"; el total del periodo también acepta 0.
- [ ] **Totales nulos con ajuste (regla 49):** las compras "Sin total" siguen contadas aparte y un ajuste no las completa.
- [ ] **Vacío (D17):** sin compras, el lápiz sigue disponible; guardar ₡5 000 muestra el total y la fila de ajuste, sin mensaje de vacío.
- [ ] **Contenedor negativo (D18, regla 54):** un ajuste, una compra o un cambio de zona que dejaría negativo un periodo con ajustes se rechaza entero, sin cambios, también en una compra histórica. Se muestra el mensaje del código `23514`.
- [ ] **Zona horaria (regla 58):** una zona que PostgreSQL no reconoce da `22023`; cambiar la zona del navegador no cambia los periodos; el Dashboard, el Historial y las RPC usan los mismos límites.
- [ ] **Zona guardada (regla 59):** sin zona, editar da `TZ001` y nada la asigna; confirmar la guarda y permite editar; cambiarla se rechaza si un periodo con ajustes quedaría negativo, y sigue la anterior.
- [ ] **Salidas (regla 60):** si PostgreSQL deja de reconocer la zona guardada, editar y leer dan `TZ002` y se puede confirmar otra; un periodo ya negativo no se oculta ni se agrava.
- [ ] **Dónde cuenta (regla 52):** un ajuste de semana no cambia Día y sí Mes; uno de mes solo cambia Mes; uno de día cambia los tres.
- [ ] **Validación (D13, D14):** vacío, letras, negativo, decimales, separadores mal agrupados y más del tope se rechazan sin llamar a la base; "50000", "50 000", "50.000" y "0" se aceptan.
- [ ] **Decimales antiguos (D22):** abre redondeado; "Cancelar" no cambia nada; "Guardar" guarda el entero.
- [ ] **Edición (D21):** abrir otro lápiz cancela el anterior; mientras guarda, los demás quedan deshabilitados; doble clic hace una sola llamada; cambiar de periodo y Escape descartan; el foco vuelve al lápiz.
- [ ] **Errores:** una falla conserva lo escrito y permite reintentar o cancelar; con la sesión vencida se pasa a `noAccount`.
- [ ] **Dashboard (D11):** no tiene lápices.
- [ ] **Otra pestaña (D20):** no se actualiza sola; límite declarado, sin test que lo exija.
- [ ] **Lectura (`get_period_finance`):** límites, compras, ajustes, total y contadores en una sola lectura, iguales a los de las RPC; sin zona, `time_zone: null`.
- [ ] **Base (prueba SQL):** los casos de [plan.md](plan.md#pruebas-2).
- [ ] **E2E (interfaz):** E2E-FIN-09 a 14 pasan en `chromium` y `mobile-chrome`. Validan la interfaz, **no** la autenticación real ni la seguridad de la base.
- [ ] **Manual (acceso real):**
  - [ ] CA-01, CA-02 y CA-03 contra la base compartida, comprobando que la compra conserva su fecha.
  - [ ] Una cuenta registrada no puede editar la compra de otra, ni desde la consola con un PATCH o la RPC.
  - [ ] Una sesión anónima real no ve lápices y la RPC le responde `42501`.
  - [ ] D4 con dos cuentas de la misma familia: los ajustes y las ediciones de una no aparecen en la otra.
  - [ ] Mobile y teclado, con capturas sin correos.
- [ ] Tests automáticos (Vitest) del camino feliz y de al menos un caso negativo o límite por unidad.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` y `git diff --check` pasan.

### HU-61 (SCRUM-92)

Ninguno validado todavía.

- [ ] **CA-01, badge:** una compra sin total muestra el badge terracota "Sin total", sin rojo, sin ícono de error y sin `role="alert"`; una de ₡0 no lo lleva. Componente, pantalla, E2E-FIN-15 y manual.
- [ ] **CA-02, recordatorio:** con una compra sin total cerrada hace 24 horas o más, el recordatorio se ve en el Dashboard y en el Historial con la cantidad y el enlace; una de menos de 24 horas no cuenta. No se puede descartar. Al completar la última, desaparece sin recargar. ViewModel, pantalla, E2E-FIN-16 con el reloj fijo y manual.
- [ ] **CA-03, completar en cualquier momento:** una compra sin total de un periodo anterior aparece en "Compras sin total", se completa con el lápiz de SCRUM-91 y deja de estar pendiente. Pantalla, E2E-FIN-17 y manual contra la base.
- [ ] **Errores:** si falla la lectura de pendientes, se ve el error y "Reintentar", y el total del periodo sigue visible (E2E-FIN-18).
- [ ] **D6:** sin cuenta registrada o con sesión anónima no se lee nada.
- [ ] **D27:** el badge llega a 4,5:1 en los dos temas, medido otra vez sobre la pantalla real.
- [ ] Teclado y mobile.

## 14. Casos fuera de alcance

### SCRUM-69

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

### SCRUM-90

- Periodos anteriores o rangos de fechas (D7).
- Conservar el periodo entre tabs o en la URL (D9).
- Ver qué productos se compraron en cada sesión. La historia lo menciona ("qué compré"), pero sus criterios no lo piden.
- Qué pasa cuando un producto sale de una compra cerrada al destacharlo (nota de la `018`): esta historia no muestra productos ni cambia totales.
- Editar el total de una sesión o de un periodo (HU-60).
- Badge terracota, recordatorio y completar el total (HU-61).
- Filtros por supermercado y categoría (HU-62).
- El aviso de precios en el Dashboard (tarea 4.1 de SCRUM-75).
- Compras de otros integrantes de la familia (D4) y cambios en la RLS de `purchase_sessions`.
- Paginación (regla 30).

### SCRUM-91

- Editar totales desde el Dashboard (D11).
- Editar el total de periodos anteriores (D15), o ir a verlos. Editar una compra histórica sí está dentro del alcance (regla 48).
- Volver una compra a "Sin total" (D13) y aceptar decimales (D14).
- Actualizar otra pestaña abierta, con Realtime, foco o eventos entre pestañas (D20).
- Bloqueo optimista entre pestañas (regla 57).
- Badge terracota y recordatorio de "Sin total" (HU-61 CA-01 y CA-02).
- Filtros (HU-62). Un ajuste no tiene supermercado ni categoría; cómo se filtra se decide en esa historia.
- Historial de cambios de un total o de ajustes anteriores.
- Ajustes o totales compartidos con la familia (D4).
- Ampliar la RLS o los permisos de `purchase_sessions`.
- Asignar una zona a usuarios existentes (regla 59).
- Una pantalla de configuración para cambiar la zona: la base lo permite, y la acción se define en la Etapa 5.

### SCRUM-92

- Push web, correo, SMS o recordatorios con la app cerrada (D24; roadmap post-curso).
- Trabajos programados o Edge Functions.
- Configurar el umbral por persona.
- Recordatorios para sesiones anónimas (D6) o para compras de la familia (D4).
- Ver periodos anteriores en el selector del Historial (D25: D7 no cambia).
- Filtros por supermercado y categoría (HU-62).
- Cambios en el modo compra (`shopping-list`), como pedir el total al cerrar.
- Contador en la navegación, descartar el recordatorio o guardar que se vio (D26).
- Corregir el contraste de los demás chips y textos terracota de la app (household, recetas, catálogo): no cumplen AA en el tema claro y se reporta al equipo (D27).

## 15. Notas de implementación

### SCRUM-69

- **Sin precios por producto en el gasto:** el gasto real sale solo de `total_amount` de cada compra (documento-proyecto §4.6).
- **Número de la migración:** `027` es provisional. La `025` es de SCRUM-60 (#68) y la `026` está planificada para SCRUM-61 (#69). El 2026-10-18 ninguna rama tenía una `027`; se vuelve a revisar al implementar (antes de crear el archivo) y antes del merge.
- **Reglas de monto repetidas a propósito:** "Total gastado" del modo compra ya valida colones con el mismo formato y el mismo tope. Por la decisión de no tocar `shopping-list`, Finanzas tiene su propia validación con las mismas reglas. Unificarlas queda como deuda.
- **Probar con una cuenta registrada en local:** según las notas de household (SCRUM-57), `/login` no permite entrar en local si falta `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` en `.env.local`. Para las pruebas manuales se usó una sesión de cuenta de prueba cargada desde la consola. Hay que confirmarlo antes de la etapa de QA.

### SCRUM-90

- **`SpendingTotal` se reutiliza entero:** ya resuelve total, fechas, contadores, vacío, error y reintento. Por eso el error dice "tu gasto" también en el Historial.
- **Dos hooks parecidos, a propósito:** `usePeriodPurchases` repite el patrón de respuesta vieja de `usePeriodSpending`, porque pide y devuelve datos distintos. El Dashboard sigue pidiendo solo `total_amount`.
- **Sesión anónima:** la limitación de la regla 7 sigue igual. Por la API solo podría leer sus propias compras.
- **Probar con una cuenta registrada en local:** ver la nota de SCRUM-69 en esta misma sección.

### SCRUM-91

- **Por qué RPC y no una política:** la política de `016` solo deja actualizar compras abiertas. Abrirla junto con el permiso de columna existente permitiría cambiar `closed_at` o vaciar el total por API.
- **La base calcula los límites:** con la zona guardada, para que el navegador no elija otro periodo. Con zona guardada, las pantallas leen esos límites; sin ella, siguen con `getPeriodBounds`, porque no hay ajustes (regla 59).
- **Probar con una cuenta registrada en local:** ver la nota de SCRUM-69 en esta misma sección.

### SCRUM-92

- **El badge reemplaza el texto:** la nota de SCRUM-90 en `PurchaseSessionRow` ("el badge es de HU-61") se cumple acá; el texto sigue siendo "Sin total" (D8).
- **Origen del campo:** si una compra aparece en el periodo en curso y en las pendientes, el campo se abre solo en la fila donde se tocó el lápiz. Para eso, el objetivo de la edición tiene que saber de qué lista viene; ver plan, "SCRUM-92".
