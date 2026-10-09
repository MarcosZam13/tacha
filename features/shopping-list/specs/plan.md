# Plan técnico: lista general (buscar, añadir, ajustar cantidad)

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md).

> **Verificado el 2026-09-25** contra la base real (MCP de Supabase): el catálogo tiene datos (28 productos, 39 variantes); no existen `lists`, `list_items`, `households` ni `profiles`; las políticas de lectura del catálogo aplican a todos los roles, así que la búsqueda funciona con la sesión anónima (rol `authenticated`). Sesiones anónimas habilitadas en el proyecto.

## Archivos

```
features/shopping-list/
  ShoppingList.tsx                     entrada ("use client"): compone buscador + lista (solo presentación)
  components/
    ShoppingListRow.tsx                una fila: nombre, tamaño y QuantityStepper
    QuantityStepper.tsx                "−" cantidad "+" (botones hermanos, nunca anidados; se deshabilitan mientras la fila espera)
    ShoppingListEmptyState.tsx         lista vacía
    models/                            props de los mini componentes
  hooks/
    useShoppingListViewModel.ts        facade: une useShoppingList + useProductSearch, aplana resultados y arma las opciones del buscador
    useShoppingList.ts                 useReducer + carga inicial (useEffect) + addItem
  models/
    ShoppingListItem.interface.ts
    ShoppingListState.interface.ts
    ShoppingListAction.type.ts         unión discriminada de acciones del reducer
    CatalogSearchResult.interface.ts   resultado ya aplanado a una fila por variante: variantId, productName, sizeLabel
  services/
    shopping-list.service.ts           getGeneralList(), addItemToGeneralList(), changeItemQuantity()
  utils/
    shopping-list.reducer.ts           reducer puro + estado inicial (no es un hook: no va en hooks/)
    formatSizeLabel.ts                 275 + "g" → "275 g"
    toCatalogSearchResults.ts          productos madre del buscador → una fila por variante
  constants/
    shopping-list.constants.ts         textos, nombres de tablas/RPC, acciones
  specs/  SPEC.md · plan.md · tasks.md

services/supabase.client.ts            único cliente de Supabase de la app + ensureSession() (sesión anónima)

Buscador compartido con recetas (SCRUM-120):
components/product-search/
  ProductSearch.tsx                    input + lista de opciones (solo presentación)
  models/                              props + ProductSearchOption (id, label, detail opcional)
hooks/useProductSearch.ts              texto, debounce, protección contra respuestas viejas; resto derivado
services/catalog.service.ts            searchCatalog(): RPC search_catalog → productos madre con variantes (descarta brands y price_ranges)
types/catalog.types.ts                 CatalogProduct, CatalogProductVariant, forma del jsonb de variantes
constants/catalog.constants.ts         debounce, mínimo/máximo de caracteres, unidades base, RPC, textos del buscador

types/database.types.ts                tipos generados desde el esquema real (regenerar tras cada migración)
supabase/migrations/004_create_lists.sql
app/(app)/lista/page.tsx                     ruta delgada: solo renderiza <ShoppingList />
```

Todo lo que solo usa esta feature vive dentro de `features/shopping-list/`; afuera quedan el cliente de Supabase (lo usará toda la app), los tipos de la base, la ruta y el buscador del catálogo, que desde SCRUM-120 comparte con recetas.

Dependencia nueva: `@supabase/supabase-js` (hoy el repo llama a PostgREST con `fetch` a mano; con auth y RLS de por medio, el cliente oficial maneja la sesión y el token).

## Datos

Tablas (según documento-proyecto §6, solo las columnas que este sprint usa):

- `lists`: `id`, `owner_id` (→ `auth.users`, siempre), `household_id` (nullable, en este sprint siempre `null`), `type` (`general` / `date` / `private`), `status` (`active` / `completed` / `cancelled`), `created_at`.
- `list_items`: `id`, `list_id`, `product_catalog_variant_id`, `quantity_requested` (`check >= 1`), `created_at`; `unique (list_id, product_catalog_variant_id)`.
- RLS en ambas, deny por defecto: este sprint solo abre select/insert de `lists` y select/insert/update de `list_items`, siempre con `owner_id = auth.uid()`; el insert de `lists` exige además `household_id is null` hasta que existan households. Eliminar llega en Sprint 2.
- Índice único parcial: una sola lista `general` por dueño sin household (también evita dos listas si llegan dos RPC a la vez).
- RPC `add_item_to_general_list(target_variant_id)`, `security invoker` (RLS sigue aplicando) y `search_path` fijo: busca o crea la lista general del usuario e inserta el item; si ya existe, suma 1 (`on conflict do update`). Devuelve la fila con la cantidad final. Solo `authenticated` puede ejecutarla. La regla de merge vive en la base, como pide documento-proyecto §6.

### Qué se muestra de cada resultado

`search_catalog` devuelve el producto madre con un arreglo `variants`. En los datos reales el `name` de la variante viene duplicado ("Chocolate Milka de Leche - 90 g — Chocolate Milka de Leche - 90 g", efecto de la normalización del scraper) y el nombre del producto ya trae el tamaño. Por eso cada resultado muestra **el nombre del producto** y un tamaño armado con `base_quantity` + `base_unit` ("90 g"), no el nombre de la variante. `price_ranges` se ignora: comparar precios no es de esta historia.

## Flujo

1. Al montar, `useShoppingList` pide la lista general (`useEffect`) → `dispatch({ type: "loaded" })`.
2. Escribir en el buscador → `useProductSearch` espera el debounce → `searchCatalog()` → resultados. Si llega una respuesta de una búsqueda vieja, se descarta.
3. Elegir un resultado → `addItem()` (RPC) → la base devuelve el item con su cantidad final → `dispatch({ type: "itemUpserted" })`.
4. "+" o "−" → `dispatch(QUANTITY_CHANGE_STARTED)` (la fila queda pendiente y sus botones se deshabilitan) → `changeItemQuantity(itemId, ±1)` → RPC `change_item_quantity` → la base suma el delta y devuelve la cantidad final → `dispatch(QUANTITY_CHANGED)`. Si falla: `QUANTITY_CHANGE_FAILED` (la cantidad no cambia, aparece el error). El "−" se deshabilita en 1 (UI) y la base lo rechaza igual (`check`).

## Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| `useReducer` para la lista | `useState` | Varias acciones con reglas (y en Sprint 2 llegan eliminar y tachar); las reglas quedan en una función pura testeable sin React |
| Servicio + `useEffect` en el hook | TanStack Query | Es el patrón del repo de referencia del profesor (component-architecture §3) y TanStack no está instalado; adoptarlo es decisión de todo el equipo, no de una feature (nextjs-enterprise-patterns §3) |
| Ningún `dispatch` síncrono dentro del efecto | Poner `isLoading: true` al inicio del efecto | El estado inicial ya arranca cargando; evita renders en cascada. El lint (`set-state-in-effect`) no lo vigila para `dispatch`, así que es una regla nuestra |
| `useEffect` + debounce + bandera de cancelación | Buscar en cada tecla | Una petición por pausa de escritura, y una respuesta vieja nunca pisa a la nueva |
| Merge de duplicados en la base (RPC) | Revisar en el cliente si ya existe | Dos pestañas o dos miembros del household agregando a la vez no duplican filas; lo pide el documento del proyecto |
| Mínimo 1 en UI **y** en la base | Solo en la UI | La UI es comodidad; la base es la garantía |
| Esperar respuesta del servidor antes de actualizar | Actualización optimista | Más simple de explicar y sin rollback; se puede optimizar después si se siente lento |
| Buscador compartido en las carpetas de la raíz (SCRUM-120) | Dejarlo en la feature y que recetas lo importe de `features/shopping-list/` | Recetas (SCRUM-95) es el segundo consumidor real; importar de otra feature amarraría una a la otra (component-architecture §1, project-structure) |
| El buscador devuelve productos madre; la lista los aplana a variantes | Que el servicio compartido aplane | Recetas necesita el producto madre (CA-02 de SCRUM-95) y la lista necesita variantes; cada feature adapta el mismo resultado |
| `ProductSearch` recibe opciones (`id`, `label`, `detail`) ya armadas | Recibir productos o variantes directo | La barra no sabe si una opción es una variante o un producto; así sirve igual a las dos features sin condicionales adentro |
| Mostrar nombre del producto + tamaño | Mostrar el nombre de la variante | El nombre de la variante viene duplicado en los datos reales |

### SCRUM-63: ajustar cantidad

- RPC `change_item_quantity(target_item_id, quantity_delta)` (migración `005_change_item_quantity.sql`): `security invoker` (usa la política de update de `list_items`), solo acepta `-1` o `1`, hace `quantity_requested = quantity_requested + delta` en una sola sentencia y devuelve la fila. Si el item no existe o no es del usuario, lanza error (RLS lo deja invisible).

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Mandar un delta (±1) a una RPC | `update` con la cantidad final calculada en el cliente | Dos toques rápidos o dos pestañas mandarían la misma cantidad final y se perdería uno; con el delta la base suma cada toque |
| Deshabilitar los botones de la fila mientras espera | Dejar tocar y encolar | Sin eso, dos respuestas de la misma fila pueden llegar en desorden y la pantalla mostraría una cantidad vieja |
| Pendientes por fila (`pendingItemIds`) | Un solo `isUpdating` para toda la lista | Cambiar una fila no bloquea las demás |
| Elegir en el buscador un producto que ya está en la lista = mismo +1 que el botón | Llamar `add_item_to_general_list` igual | Pasa por el mismo bloqueo por fila; si no, un añadir y un "+" en paralelo sobre la misma fila podrían dejar en pantalla una cantidad vieja |
| `Button` de components/ui con texto solo para lectores de pantalla | `<button>` propio con `aria-label` | Reusar el primitivo (nextjs-enterprise-patterns §1); el "−" solo no dice nada a un lector de pantalla |

## Deuda conocida (revisión de seguridad, 2026-09-25)

Viene de la sesión anónima provisional; se cierra cuando exista el registro:

- **Cuentas anónimas sin CAPTCHA:** cualquiera con la anon key puede crear usuarios anónimos en bucle (Supabase los limita por IP). Antes de producción: CAPTCHA en Auth › Attack Protection (y `captchaToken` en `signInAnonymously`), revisar el rate limit y limpiar anónimos viejos.
- **Anónimo = `authenticated`:** las políticas de este sprint no distinguen anónimos de registrados, y hoy eso es lo buscado. La migración de households tiene que exigir `coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) = false` en toda acción que requiera cuenta real (crear o unirse a un household).

### SCRUM-66 (revisión de seguridad, 2026-10-08)

- **`checked_by` y el `on delete set null`** (Media, latente): ver SPEC §14. Arreglo para la migración de listas de household: en la rama "ya estaba tachada" del trigger, `new.checked_at := old.checked_at` y no tocar `checked_by` (los clientes no tienen grant sobre esa columna, así que solo lo cambia la FK).
- **Tachar sin `auth.uid()`** (Baja): si un día un job con service role tacha, `checked_by` queda null con la fila tachada. Si importa para la auditoría, el trigger puede rechazarlo.

## SCRUM-64: ver detalle de producto

> **Verificado el 2026-10-03** contra la base real: cada variante de las listas tiene 1 marca y 1 precio (solo MaxiPali). La vista `latest_prices` es `security_invoker` y `anon`/`authenticated` pueden leerla, igual que `product_brands` y `stores`. PostgREST resuelve la relación variante → `latest_prices` → `stores` en una sola petición (probado con la anon key).

Sin migraciones: todo lo que pide CA-02 ya existe en la base.

```
features/shopping-list/
  components/
    ShoppingListRow.tsx                + botón de detalle, hermano del QuantityStepper
    ShoppingListItemDetail.tsx         contenido del modal: presentación, marcas, precios (solo presentación)
    models/ShoppingListItemDetailProps.interface.ts
  hooks/
    useItemDetail.ts                   pide el detalle de la variante abierta; el "cargando" se deriva, no se guarda
    useShoppingListViewModel.ts        + fila abierta, abrir/cerrar y textos ya formateados para el modal
  models/
    ItemDetail.interface.ts            marcas + precios por tienda (lo que devuelve el servicio)
    ItemDetailViewModel.interface.ts   lo que dibuja el modal, ya calculado
  services/
    shopping-list.service.ts           + getItemDetail(variantId)
  utils/
    toStorePriceRanges.ts              precios por marca y tienda → rango por tienda, del más barato al más caro
    formatPriceRange.ts                2300, 2500 → "₡2 300 – ₡2 500"
```

Flujo: tocar el botón de detalle → el ViewModel guarda la fila abierta → `useItemDetail` ve un `variantId` nuevo y pide `getItemDetail()` → una sola consulta a `product_catalog_variants` con `product_brands(name)` y `latest_prices(price, stores(display_name))` embebidos → `toStorePriceRanges()` agrupa por tienda → el modal muestra el nombre y el tamaño que la fila ya tenía, más las marcas y los precios. Cerrar el modal suelta la fila abierta.

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Pedir el detalle al abrirlo | Traer marcas y precios junto con la lista | La carga de la lista sigue siendo una consulta liviana; los precios solo se piden para el producto que se mira, y llegan frescos |
| Una consulta con embeds (marcas + `latest_prices` + `stores`) | Dos o tres consultas, o calcular el último precio en el cliente | La vista `latest_prices` ya resuelve "el último precio por marca y tienda" en la base; una sola petición = un solo estado de carga y de error |
| Rango por tienda (mínimo–máximo entre marcas) | Una fila por marca y tienda | Es lo que pide el diseño (DESIGN.md, product-detail-view) y HU-53; con una sola marca el rango es un solo precio |
| Modal de `components/ui` | Ruta nueva `/lista/[itemId]` | No se pierde la lista de vista ni el scroll; se reusa el primitivo con cierre por Escape y por fondo |
| `isLoading` derivado: hay fila abierta y todavía no hay respuesta para su `variantId` | `setIsLoading(true)` al inicio del efecto | Mismo criterio que la carga de la lista: nada de `setState` síncrono dentro de un efecto (renders en cascada, y el lint `set-state-in-effect` lo marca) |
| Guardar la respuesta junto con el `variantId` que la pidió | Guardar solo el detalle | Si el usuario cierra y abre otro producto rápido, el detalle viejo no se muestra como si fuera del nuevo, ni siquiera un instante |
| Nombre y tamaño desde la fila ya cargada | Pedirlos otra vez con el detalle | Ya están en pantalla; pedirlos de nuevo es más datos para mostrar lo mismo |
| El detalle vive en `features/shopping-list/` | Ponerlo de una vez en `components/` | Hoy lo usa solo la lista. HU-53 (Sprint 3) es el segundo consumidor real y ahí se promueve, igual que el buscador en SCRUM-120 |
| Botón de detalle hermano del `QuantityStepper` | Hacer clickeable la fila | La fila completa es la que va a tachar (HU-36e); un botón adentro de otro es HTML inválido y el click dispararía las dos acciones |

## SCRUM-65: eliminar producto

> **Verificado el 2026-10-03** contra la base real: `list_items` tiene RLS con políticas de select, insert y update del dueño, pero ninguna de delete, así que hoy un delete borra 0 filas sin error. `authenticated` ya tiene el privilegio `delete` (default de Supabase).

Migración `012_delete_list_items.sql`: `grant delete` explícito y política `for delete to authenticated` con el mismo criterio que select y update (el item es de una lista cuyo `owner_id` es `auth.uid()`). Sin cambio de columnas, así que `types/database.types.ts` no se regenera. Lleva el número `012` porque `011` es de SCRUM-56 (households); las dos ya estaban aplicadas en la base, el número solo ordena los archivos.

```
features/shopping-list/
  components/
    ShoppingListRow.tsx                + botón de eliminar, hermano de los demás controles
    UndoToast.tsx                      mensaje + "Deshacer", fijo abajo, role="status" (solo presentación)
    models/UndoToastProps.interface.ts
  hooks/
    useItemRemoval.ts                  item pendiente, temporizador del toast, deshacer, borrar el anterior, borrar al salir
    useShoppingList.ts                 + removeItem(itemId)
    useShoppingListViewModel.ts        + oculta la fila pendiente, arma el toast, cancela el borrado si se vuelve a añadir
  services/
    shopping-list.service.ts           + deleteListItem(itemId)
  utils/
    shopping-list.reducer.ts           + ITEM_REMOVED, REMOVE_FAILED
supabase/migrations/012_delete_list_items.sql
```

Flujo: tocar eliminar → `requestRemoval(itemId)` guarda el id pendiente (si había otro pendiente, ese se borra ya) → el ViewModel filtra esa fila de `rows` y muestra el toast → efecto con `setTimeout` de la duración del toast:
- **Deshacer** → `cancelRemoval()` limpia el pendiente; el cleanup del efecto cancela el temporizador; la fila vuelve en su lugar porque nunca salió de `state.items`.
- **Vence** → `removeItem(itemId)` → `deleteListItem()` → `dispatch(ITEM_REMOVED)` (sale de `state.items`). Si falla → `dispatch(REMOVE_FAILED)`: el item sigue en `state.items`, así que la fila vuelve sola, con el mensaje de error.
- **La pantalla se desmonta con algo pendiente** → el cleanup de un efecto aparte manda el borrado.

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Borrar en la base cuando vence el toast | Borrar al tocar y re-insertar al deshacer | Deshacer no escribe nada: no hay una segunda escritura que pueda fallar, y la fila vuelve con su id, su cantidad y su lugar. Re-insertar daría un id nuevo y la fila al final de la lista |
| El item pendiente sigue en `state.items` y se oculta en el ViewModel | Sacarlo del estado y guardar una copia para deshacer | Sin copia que pueda quedar vieja: deshacer y fallar son "dejar de ocultarlo". La fila oculta se deriva de `pendingItemId` |
| Un solo item pendiente; eliminar otro borra el anterior en ese momento | Una cola de toasts | Un solo toast visible y un solo temporizador. Con cola habría que decidir qué deshace "Deshacer" |
| `setTimeout` dentro de un efecto con cleanup | `setTimeout` suelto en el handler | El cleanup cancela el temporizador al deshacer o al cambiar de item; suelto, un temporizador viejo podría borrar algo que el usuario ya recuperó |
| Borrar al salir de la pantalla (cleanup de un efecto con `[]` y una ref) | Perder el borrado si se navega | El usuario ya vio desaparecer el producto; si vuelve, no debería encontrarlo |
| Deshabilitar eliminar mientras la fila guarda su cantidad | Permitirlo | Un `change_item_quantity` en vuelo sobre una fila que se borra podría responder después y revivir la cantidad en pantalla |
| 0 filas borradas = éxito | Tratarlo como error | Si el item ya no existe (otra pestaña lo borró), para el usuario el resultado es el mismo: no está. Tampoco revela si existe un item ajeno |
| `UndoToast` dentro de la feature | En `components/ui` desde ya | Hoy es el único consumidor (segundo consumidor real, como el buscador en SCRUM-120) |

## SCRUM-66: tachar/destachar producto

> **Verificado el 2026-10-08** contra la base real (solo lectura): `list_items` tiene `id`, `list_id`, `product_catalog_variant_id`, `quantity_requested` y `created_at`, sin columnas de tachado ni triggers; `authenticated` solo tiene UPDATE sobre `quantity_requested` (005). El historial llega a `014`, así que la migración es la `015`.

Migración `015_check_list_items.sql`:

- `list_items.checked_at timestamptz null` (null = pendiente) y `list_items.checked_by uuid null → auth.users on delete set null`.
- Trigger `before insert or update` (`stamp_list_item_check`): si `checked_at` queda en null, `checked_by` también; si la fila ya estaba tachada, conserva su `checked_at`/`checked_by`; si se tacha ahora, pone `now()` y `auth.uid()`. Lo que mande el cliente en esas columnas se ignora.
- `grant update (checked_at)` a `authenticated`; `checked_by` no tiene grant.
- RPC `set_list_item_checked(target_item_id, is_checked)`, `security invoker`, como `change_item_quantity`.
- `add_item_to_general_list` se reemplaza (misma firma): si la fila ya existe y está tachada, la reabre con cantidad 1; si no, suma 1 como antes.
- `add_units_to_list_item` (013) se reemplaza con la misma regla: tachada → se reabre con las unidades que se piden ahora.
- `add_recipe_to_general_list` (013) se reemplaza copiando 013 y agregando `li.checked_at is null` a las 5 consultas que miran la lista (regla 22, las dos de conteo, `listed_quantity` y `claimed_quantity`). Es el único cambio: `diff` contra 013 da esas 5 líneas.
- Prueba: `supabase/tests/015_check_list_items.test.sql`, en una transacción que termina en `rollback`.

```
features/shopping-list/
  ShoppingList.tsx                     + dos secciones (Pendientes / Tachados hoy)
  components/
    ShoppingListSection.tsx            encabezado + <ul> de filas de una sección (solo presentación)
    ShoppingListAllChecked.tsx         el <li> de "Todo tachado" dentro de Pendientes
    ShoppingListRow.tsx                + botón de tachar (nombre y tamaño), hermano de los controles
    models/ShoppingListSectionProps.interface.ts
  hooks/
    useShoppingList.ts                 + toggleChecked(itemId, isChecked); useOptimistic sobre los items (tachado optimista)
    useShoppingListViewModel.ts        + pendingRows / checkedRows, onToggleChecked, reabrir al añadir una fila tachada
  models/
    ShoppingListItem.interface.ts      + checkedAt
    ShoppingListRowViewModel.interface.ts + canToggleChecked, isChecked
    ShoppingListState.interface.ts     + checkErrorMessage; pendingItemIds cubre cantidad y tachado
    ShoppingListAction.type.ts         + CHECK_TOGGLE_STARTED / CHECK_TOGGLED / CHECK_TOGGLE_FAILED
  services/
    shopping-list.service.ts           + setItemChecked(); getGeneralList trae solo pendientes y tachados desde hoy
  utils/
    shopping-list.reducer.ts           + las tres acciones de tachado
    startOfLocalDay.ts                 Date → ISO de la medianoche local (el "hoy" de CA-05)
  tests/
    shopping-list.reducer.test.ts      + tachar, destachar, error y orden de las filas
    startOfLocalDay.test.ts
    useShoppingList.test.ts            tachado optimista: se ve antes de la respuesta y vuelve si falla
supabase/migrations/015_check_list_items.sql
supabase/tests/015_check_list_items.test.sql   prueba SQL de 015 (rollback: no deja datos)
types/database.types.ts                + checked_at, checked_by, set_list_item_checked (a mano; se regenera al aplicar 015)
```

Flujo (optimista desde el 2026-10-09): tocar la fila → `onToggleChecked(itemId)` en el ViewModel calcula el estado nuevo (`!isChecked`) → `toggleChecked()` → `dispatch(CHECK_TOGGLE_STARTED)` (la fila queda pendiente, sus botones deshabilitados) → `startTransition(async () => …)`: primero `setOptimisticCheck` (`useOptimistic`) pone un `checkedAt` provisorio y **la fila se ve en la otra sección ya** → `setItemChecked()` → RPC `set_list_item_checked` → el trigger pone `checked_at`/`checked_by` → la base devuelve la fila → `dispatch(CHECK_TOGGLED, checkedAt)` guarda la hora real en el reducer → termina la transición y React deja de mostrar el valor optimista (ya coincide con el real). Si falla: `CHECK_TOGGLE_FAILED` guarda el error; al terminar la transición React descarta el valor optimista y la fila vuelve sola a su sección: no hay rollback que escribir.

Al cargar: `getGeneralList()` pide los items con `checked_at is null or checked_at >= medianoche local` (filtro sobre la tabla embebida). Lo tachado antes de hoy no viaja.

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Una columna `checked_at` nullable | `is_checked boolean` + `checked_at` | Con dos columnas puede quedar `is_checked = false` con fecha, o al revés. Con una sola, "tachado" y "cuándo" no se pueden contradecir, y CA-05 es un filtro por fecha |
| Trigger que pone `now()` y `auth.uid()` | Que el cliente mande la fecha y el usuario | Todo valor del cliente es hostil (security-practices §2): con la API cualquiera podría tachar a nombre de otro o con fecha vieja. La hora del servidor además no depende del reloj del teléfono |
| Grant solo de `checked_at`; `checked_by` sin grant | Grant de las dos columnas | Un PATCH directo no puede escribir `checked_by`; y si escribe `checked_at`, el trigger igual pone la hora real |
| El trigger conserva la fecha si la fila ya estaba tachada | Volver a poner `now()` | Tachar dos veces (dos pestañas) no cambia cuándo se compró; además el trigger corre en cada update, también al cambiar la cantidad |
| RPC con el estado deseado (`is_checked`) | RPC "toggle" que invierte lo que haya | El usuario decide mirando la pantalla. Si dos pestañas mandan "tachar", las dos quieren lo mismo: con toggle, la segunda lo destacharía. Es lo contrario de la cantidad (005), donde cada toque sí debe sumar |
| RPC `security invoker` | `update` directo desde el servicio | Mismo patrón que `change_item_quantity`: devuelve la fila y da un error claro si no es tuya; RLS sigue decidiendo |
| Tachado optimista con `useOptimistic` (2026-10-09) | Esperar a la base, como la cantidad | Tachar es lo que más se toca, y en el súper (modo compra) cada espera se nota. `useOptimistic` muestra el cambio mientras dura la transición y lo descarta solo al terminar: si la base falla, la fila vuelve sin código de rollback. La cantidad sigue esperando porque el número final lo decide la base (suma de deltas) |
| `useOptimistic` sobre `state.items` dentro de `useShoppingList` | Un estado optimista a mano en el reducer (`optimisticCheckedIds`) | React ya resuelve cuándo mostrar y cuándo descartar lo optimista; a mano habría que limpiar en éxito y en error, y el reducer seguiría guardando solo lo confirmado |
| Mantener la fila deshabilitada mientras viaja | Dejar destachar antes de que responda | Dos escrituras de la misma fila en vuelo podrían terminar en desorden; una por fila es la regla de toda la lista |
| `pendingItemIds` compartido entre cantidad y tachado | Un pendiente por tipo de escritura | Una sola escritura por fila a la vez: es la misma regla que ya impide eliminar mientras se guarda la cantidad (una respuesta tardía no revive una fila borrada), y un doble toque rápido en la fila no manda dos RPC |
| Las secciones se derivan de `checkedAt` en el ViewModel | Guardar dos arreglos en el reducer | Un solo arreglo en el orden en que se añadieron: destachar devuelve la fila a su lugar sin reordenar nada (CA-04), y no hay dos listas que se desincronicen |
| Filtro de "hoy" en la consulta | Traer todo y filtrar en el cliente | Lo tachado en días anteriores crece sin fin; no tiene sentido descargarlo para esconderlo |
| Medianoche **local** calculada en el cliente | `current_date` en la base | La base está en UTC: en Costa Rica (UTC-6) el "día" cambiaría a las 6 p. m. |
| Botón con `aria-pressed` | `role="checkbox"` o un checkbox oculto | CA-01 prohíbe el checkbox; `aria-pressed` le dice al lector de pantalla que es un botón de dos estados sin dibujar nada |
| Botón de tachar hermano de los controles, no un `<li>` clickeable | `onClick` en el `<li>` | Un `<li>` no es enfocable ni activable con teclado. Y un botón que envuelve otros botones es HTML inválido: el click de "+" también tacharía |
| No usar `ItemRow` de `components/ui` | Reusarlo | Dibuja un checkbox (contra CA-01) y envuelve toda la fila en un `<button>` |
| Reabrir la fila tachada al añadirla desde el buscador (cambio en `add_item_to_general_list`) | Sumarle 1 como antes | `unique (list_id, variant)` obliga a reusar la fila. Si estaba tachada ayer, sumarle la dejaría escondida: el usuario añade y no ve nada |
| Lo tachado no cuenta en `add_recipe_to_general_list` (filtro en las 5 consultas) | Dejar la receta como estaba | Sin el filtro, lo comprado ayer cuenta como "ya en la lista": la receta no pide nada y la fila queda tachada y escondida. Lo introduce esta historia, porque antes no existían filas tachadas |
| Reemplazar la función completa copiando 013 | Una función nueva que envuelva a la vieja | plpgsql no permite cambiar una consulta de adentro; con la copia el `diff` contra 013 son 5 líneas, fáciles de revisar |
| Requirements viejos de una fila reabierta: pendiente para SCRUM-98 | Borrarlos al reabrir | Pide abrir `delete` en una tabla de recetas y decidir qué pasa al destachar a mano; el error que queda es conservador (SPEC §14) |
| Prueba SQL con `rollback` | Probarlo solo con E2E | "Comprado ayer" no se puede fabricar desde el navegador (el trigger no acepta fechas); en SQL se apaga el trigger para esa sentencia dentro de la transacción |
| `ShoppingListSection` como mini componente | Repetir el `<ul>` dos veces en `ShoppingList.tsx` | El `return` principal se sigue leyendo como esqueleto (component-architecture §4), y la misma sección sirve para sublistas y listas privadas (CA-06) |
