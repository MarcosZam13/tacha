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
