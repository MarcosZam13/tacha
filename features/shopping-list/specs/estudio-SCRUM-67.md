# Guía de estudio: SCRUM-67 (HU-36f, modo compra)

Para defender el código en vivo. El contrato está en [SPEC.md](SPEC.md) (reglas 13-21) y las decisiones con su alternativa en [plan.md](plan.md#scrum-67-modo-compra).

## 1. Cómo se demuestra

1. `npm run dev` → `/lista` con un par de productos.
2. "Iniciar compra" → elegir MaxiPali: la URL pasa a `/lista?compra=<id>` y aparece "Comprando en MaxiPali". El resto es la misma lista (CA-02).
3. Tachar un producto: pasa a "Tachados hoy", igual que siempre (CA-03).
4. "+" en esa fila: sube lo **comprado** y aparece "Pedido N" (CA-04).
5. "Salir": vuelve a `/lista` sin barra, lo tachado sigue ahí (CA-06).
6. "Iniciar compra" → MaxiPali otra vez: la URL tiene el **mismo** id (CA-05).
7. Tachar lo que falte: aparece "Cerrar compra" (CA-07). Total `12500` → "Cerrar compra" → lista normal.
8. En la base (`purchase_sessions`): la compra con `closed_at` y `total_amount`; en `list_items`, `purchase_session_id` y `quantity_bought`.

## 2. Recorridos (mapa del flujo)

**Iniciar:** botón "Iniciar compra" (`ShoppingListInner.tsx`) → `onStartPurchase` = `useStorePicker().open` → pide `getStores()` la primera vez → `StorePicker.tsx` dentro del `Modal` → tocar MaxiPali → `pickStore(storeId)` → `startPurchaseSession(storeId)` (servicio) → RPC `start_purchase_session(store, medianoche local)` → la base retoma o crea → devuelve el id → `onStarted(id)` = `usePurchaseSession().enterShoppingMode` → `router.push("/lista?compra=<id>")`.

**Entrar al modo:** cambia la URL → `useSearchParams().get("compra")` en `usePurchaseSession` → efecto → `getPurchaseSession(id)` (solo si está abierta; RLS esconde las ajenas) → guarda `{ requestedId, session }` → `activeSession` derivado → el ViewModel expone `activeStoreName` → `ShoppingModeBar`.

**Tachar en modo compra:** tocar la fila → `onToggleChecked` (ViewModel) → `toggleChecked(itemId, true, activeSessionId)` (`useShoppingList`) → optimista: `checkedAt` + compra + comprado = pedido → `checkItemInSession()` → RPC `check_list_item_in_session` → trigger (015 extendido en 016) valida la compra → la fila vuelve → `CHECK_TOGGLED` con el `ItemCheck` real.

**Ajustar lo comprado:** "+" → `onIncreaseQuantity` → `changeDisplayedQuantity` ve que la fila está comprada en ESTA compra → `changeBoughtQuantity` → `QUANTITY_CHANGE_STARTED` → RPC `change_bought_quantity` → `BOUGHT_QUANTITY_CHANGED`.

**Cerrar:** no queda nada pendiente → `isAllChecked` → `useClosePurchase` deriva `isVisible` → `ClosePurchasePanel` → "Cerrar compra" → `parseSpentTotal(texto)` → `closePurchaseSession(id, total)` → `onClosed` = `leaveClosedSession` → `router.replace("/lista")`.

## 3. Archivos

| Archivo | Qué hace |
|---|---|
| `supabase/migrations/016_create_purchase_sessions.sql` | Tabla, RLS, columnas nuevas en `list_items`, trigger extendido, 4 RPC |
| `supabase/tests/016_create_purchase_sessions.test.sql` | Prueba SQL con dos usuarios, en `rollback` |
| `constants/purchase-session.constants.ts` | Parámetro `compra`, tablas/RPC, textos, `SPENT_TOTAL`, `CLOSE_PANEL_MODE` |
| `constants/postgres.constants.ts` (raíz) | `POSTGRES_ERROR_CODE`, promovido desde recetas |
| `models/ItemCheck.interface.ts` | Estado de tachado: cuándo, compra, lo comprado |
| `models/PurchaseSession`, `StoreOption`, `StorePickerViewModel`, `ClosePurchaseViewModel` | Formas que ven los hooks y los componentes |
| `services/purchase-session.service.ts` | Súper, iniciar, leer la compra, cerrar |
| `services/shopping-list.service.ts` | + `checkItemInSession`, `changeBoughtQuantity`, `toItemCheck` |
| `utils/shopping-list.reducer.ts` | `CHECK_TOGGLED` con `ItemCheck`, `BOUGHT_QUANTITY_CHANGED` |
| `utils/parseSpentTotal.ts`, `utils/toShoppingModeHref.ts` | Funciones puras con test |
| `hooks/usePurchaseSession.ts` | URL → compra activa; entrar, salir |
| `hooks/useStorePicker.ts` | Modal de súper; iniciar o retomar |
| `hooks/useClosePurchase.ts` | Panel de cierre, total, cerrar |
| `hooks/useShoppingList.ts` | Tachar con o sin compra; lo comprado |
| `hooks/useShoppingListViewModel.ts` | Compone todo: qué número muestra el stepper, "Pedido N", qué RPC usa tachar |
| `ShoppingList.tsx` / `ShoppingListInner.tsx` | Frontera `Suspense` / la pantalla |
| `components/ShoppingModeBar`, `StorePicker`, `ClosePurchasePanel` | Solo presentación |

## 4. Decisiones X vs Y

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Modo compra en la URL | Estado de React o `localStorage` | Recargar no te saca, "Salir" es solo navegar y "atrás" funciona. Un estado de React se pierde al recargar |
| Salir no cierra | Cerrar al salir | CA-06 (salir sin perder) y CA-05 (retomar); cerrar es aparte, con el total |
| "Hoy" = medianoche local que manda el cliente | `current_date` en la base | La base está en UTC; en Costa Rica cambiaría de día a las 6 p. m. Mismo criterio que "Tachados hoy" |
| `pg_advisory_xact_lock` por usuario | Índice único | Dos pestañas iniciando a la vez crearían dos compras; "el día" no se puede indexar porque depende del cliente |
| El trigger valida la compra | Solo validarla en la RPC | Con el grant de columna alguien puede hacer PATCH directo, y una FK no mira RLS: sin el trigger podría colgar su fila de la compra de otra persona |
| RPC nueva para tachar en compra | Cambiar `set_list_item_checked` | Cambiar la firma de una función aplicada obliga a borrarla; 015 no se edita |
| Lo comprado arranca igual a lo pedido | Pedirlo al tachar | CA-02: tachar no pide nada extra; solo se toca si difiere |
| Mismo "−"/"+" para lo comprado | Un panel aparte | CA-02: sin controles nuevos (decisión del 2026-10-09); "Pedido N" evita la confusión |
| Panel de cierre derivado | Detectar "el último tachado" | Si destachás algo se va solo; si recargás con todo tachado, aparece |
| Total opcional | Obligatorio | documento-proyecto §4.6: "sin total" es válido |
| Tres hooks (`usePurchaseSession`, `useStorePicker`, `useClosePurchase`) | Todo en el ViewModel | Cada uno tiene una responsabilidad y su test; el ViewModel solo compone (sin god ViewModel) |
| `ShoppingList` + `ShoppingListInner` | `Suspense` en la página | La ruta sigue delgada; la frontera la necesita la feature |

## 5. Conceptos nuevos

- **`useSearchParams` + `<Suspense>`:** leer la query de la URL en un componente cliente; Next.js exige una frontera de Suspense para poder prerenderizar la página.
- **`router.push` vs `router.replace`:** `push` agrega al historial ("Salir": atrás vuelve a la compra); `replace` lo reemplaza (después de cerrar, atrás no vuelve a una compra cerrada).
- **Advisory lock:** un candado de Postgres sobre un número (acá, el hash del usuario) que dura hasta el fin de la transacción.
- **Estado derivado con "id que lo pidió":** `{ requestedId, session }` para no mostrar la compra vieja mientras carga la nueva (mismo truco que el detalle, SCRUM-64).
- **Unión discriminada como resultado:** `parseSpentTotal` devuelve `{ isValid: true, total } | { isValid: false }`; TypeScript no deja leer `total` sin chequear `isValid`.

## 6. Preguntas trampa (con respuesta)

<details><summary>"¿Por qué guardaste el modo compra en el estado del reducer?"</summary>

No está en el reducer (premisa falsa). Está en la URL (`?compra=<id>`), y `usePurchaseSession` lo lee con `useSearchParams`. El reducer sigue guardando solo la lista.
</details>

<details><summary>"Si salgo del modo compra, ¿se cierra la compra?"</summary>

No. "Salir" solo navega a `/lista`. La compra sigue abierta en la base y lo tachado ya está guardado. Iniciar otra vez en el mismo súper hoy la retoma (`start_purchase_session` busca una abierta desde la medianoche local).
</details>

<details><summary>"¿Qué impide que alguien meta su producto en la compra de otro?"</summary>

El trigger `stamp_list_item_check` (extendido en 016): si `purchase_session_id` cambia, busca esa compra con `owner_id = auth.uid()` y `closed_at is null`; si no existe, lanza `42501`. Funciona igual por la RPC o por un PATCH directo. La prueba SQL lo prueba con Beto intentando usar la compra de Ana.
</details>

<details><summary>"¿Por qué el '+' a veces cambia lo pedido y a veces lo comprado? ¿No es confuso?"</summary>

Solo en una fila tachada dentro de la compra activa cambia lo comprado; en el resto, lo pedido. Lo decide `isBoughtInActiveSession` en el ViewModel. Para que no confunda, la fila muestra "Pedido N" cuando difieren. Fue decisión de producto (CA-02: sin controles nuevos).
</details>

<details><summary>"¿Por qué hay un `as number` en el servicio?"</summary>

Los tipos que genera Supabase nunca marcan como nullable los parámetros de una función, pero `close_purchase_session` acepta `null` ("sin total"; lo prueba el test SQL). Es el único cast y tiene el comentario al lado. No se edita el archivo generado porque se perdería al regenerar.
</details>

<details><summary>"¿Qué pasa si abro /lista?compra=abc?"</summary>

`getPurchaseSession` recibe un error `22P02` (no es un uuid) y lo trata como "no está abierta": devuelve `null`, el hook hace `router.replace("/lista")` y muestra "Esa compra ya no está abierta". Lo mismo para una compra cerrada o ajena.
</details>

## 7. Drills de cambio en vivo

| Pedido | Dónde | Meta |
|---|---|---|
| "Que el total sea obligatorio" | `utils/parseSpentTotal.ts`: vacío → `{ isValid: false }` (y su test); quitar `TOTAL_HELPER` | 3 min |
| "Cambia 'Comprando en' por 'Estás en'" | `constants/purchase-session.constants.ts` `SHOPPING_AT` (y el E2E si lo busca) | 1 min |
| "Que no sugiera cerrar solo, solo con el botón" | `hooks/useClosePurchase.ts`: `isVisible` sin la rama `AUTO && isAllChecked` | 2 min |
| "Que 'Salir' pregunte si cerrar" | `ShoppingModeBar` "Salir" → `onRequestClosePurchase`; explicar que rompe CA-06 | 3 min |
| "Mostrar la hora de inicio en la barra" | `SESSION_SELECT` + `started_at`, `PurchaseSession`, `getPurchaseSession`, `ShoppingModeBar` | 8 min |

## 8. Puntos débiles

Se llena en el simulacro.
