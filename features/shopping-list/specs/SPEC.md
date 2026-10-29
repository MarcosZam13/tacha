# Feature: ShoppingList

Historias: [SCRUM-62 / HU-36a](https://tacha.atlassian.net/browse/SCRUM-62) (buscar y añadir producto) · [SCRUM-63 / HU-36b](https://tacha.atlassian.net/browse/SCRUM-63) (ajustar cantidad). Sprint 1.

[SCRUM-64 / HU-36c](https://tacha.atlassian.net/browse/SCRUM-64) (ver detalle de producto) · [SCRUM-65 / HU-36d](https://tacha.atlassian.net/browse/SCRUM-65) (eliminar producto). Sprint 2.

[SCRUM-66 / HU-36e](https://tacha.atlassian.net/browse/SCRUM-66) (tachar/destachar producto) · [SCRUM-67 / HU-36f](https://tacha.atlassian.net/browse/SCRUM-67) (modo compra). Sprint 3.

[SCRUM-114 / HU-76](https://tacha.atlassian.net/browse/SCRUM-114) (aviso pasivo de faltante de receta o plan). Sprint 4, de Roberto con revisión de Marcos: [sección 16](#16-scrum-114-aviso-pasivo-de-faltante).

> Reescrita con la plantilla de 15 secciones en SCRUM-66 (component-architecture §2, "Specs existentes"): tachar cambia el comportamiento de la fila. El contenido de las historias anteriores se conserva, solo cambió de sección.

## 1. Objetivo

Que el usuario arme su lista general buscando productos del catálogo real, ajustando cuánto necesita, y que lleve control de lo que ya consiguió tachándolo con un toque, sin salir de la pantalla y con la lista guardada. En el súper (modo compra) la misma lista registra además dónde se compró y cuánto se compró de verdad, y la compra se cierra con lo que se gastó.

## 2. Alcance

Incluye:

- Barra de búsqueda arriba de la lista, con resultados en vivo del RPC `search_catalog` (mínimo 2 caracteres, con debounce).
- Cada resultado es una **variante** del producto madre, mostrada como nombre del producto + tamaño (ej. "Crema de Leche Nestlé - 236g" · "236 g"), porque `list_items` referencia `product_catalog_variants` (documento-proyecto §6).
- Al elegir un resultado, se añade a la lista general del usuario con cantidad 1. Si esa variante ya está, se le suma 1 en vez de duplicar la fila (regla de merge que vive en la base, documento-proyecto §6).
- Controles "+" y "−" en cada fila; "−" nunca baja de 1.
- La lista se guarda en Supabase (`lists` + `list_items`) y se carga al abrir la pantalla.
- Un botón de detalle al final de cada fila, al lado de los controles de cantidad. Abre un modal con el nombre y la presentación del producto, sus marcas y el precio de referencia por supermercado (rango entre marcas, del más barato al más caro).
- Un botón de eliminar al final de cada fila. Al tocarlo la fila desaparece al instante y aparece un toast "Producto eliminado" con "Deshacer". El borrado en la base se hace cuando el toast vence.
- **(SCRUM-66)** La parte de la fila con el nombre y el tamaño es un solo botón que tacha y destacha. Los controles de cantidad, detalle y eliminar son botones hermanos al final de la fila, nunca hijos.
- **(SCRUM-66)** La lista se divide en dos secciones: "Pendientes" arriba y "Tachados hoy" abajo. Una fila pasa de una a otra **al instante** (actualización optimista, decisión del 2026-10-09); si la base rechaza el cambio, vuelve sola a su sección.
- **(SCRUM-66)** La base guarda cuándo y quién tachó cada item (`list_items.checked_at`, `list_items.checked_by`, migración `015`).
- **(SCRUM-67)** Botón "Iniciar compra" en la lista general. Primero se elige el supermercado (MaxiPali, MasXMenos o Walmart); después se ve la misma lista con una barra "Comprando en {súper}" y los botones "Terminar compra" y "Salir".
- **(SCRUM-67)** Una compra (`purchase_sessions`, migración `016`) por dueño, súper y día: si ya hay una abierta hoy en ese súper, se retoma.
- **(SCRUM-67)** En modo compra, tachar guarda además en qué compra se compró y cuánto se compró (al principio, lo pedido). El "−"/"+" de una fila tachada en esa compra ajusta lo comprado.
- **(SCRUM-67)** Cuando no queda nada pendiente, se sugiere cerrar la compra con el total gastado (opcional).

No incluye: ver §14.

## 3. Entradas

Del usuario:

- texto del buscador: `string`
- variante elegida: `variantId: string`
- toque en "+" / "−" de una fila: `itemId: string`, `quantityStep: ItemQuantityStepType` (`1` | `-1`)
- toque en el botón de detalle: `itemId: string`
- toque en eliminar / "Deshacer": `itemId: string`
- **(SCRUM-66)** toque en la fila: `itemId: string`; el estado nuevo (`isChecked: boolean`) lo calcula el ViewModel a partir del que la fila tiene en pantalla.
- **(SCRUM-67)** supermercado elegido: `storeId: string`; total gastado al cerrar: el texto del campo, convertido a `number | null` (vacío = sin total).
- **(SCRUM-67)** compra activa: `?compra=<purchaseSessionId>` en la URL de `/lista`.

De la base:

- `ShoppingListItem[]` de la lista general: `id`, `productName`, `sizeLabel`, `quantity`, `variantId`, **`checkedAt: string | null`**, **`purchaseSessionId: string | null`**, **`quantityBought: number | null`**.
- **(SCRUM-67)** supermercados (`stores`) y la compra activa con el nombre de su súper.

La pantalla no recibe props: `app/(app)/lista/page.tsx` solo renderiza `<ShoppingList />`.

## 4. Salidas

- Filas nuevas o con cantidad actualizada, tal como quedaron en la base.
- Modal de detalle con marcas y precios.
- Toast de eliminado con "Deshacer"; borrado en la base al vencer.
- **(SCRUM-66)** `list_items.checked_at` / `checked_by` escritos por la base al tachar (hora del servidor y `auth.uid()`), y en `null` al destachar.
- **(SCRUM-66)** La fila en la sección que corresponde, con el texto tachado y atenuado si está tachada.
- **(SCRUM-67)** Una fila de `purchase_sessions` (crear o retomar), `list_items.purchase_session_id` y `quantity_bought` al tachar en modo compra, y `closed_at` + `total_amount` al cerrar.
- Mensajes de error por acción, sin que la lista quede en un estado inventado.

## 5. Reglas de negocio

1. Añadir la misma variante dos veces deja una sola fila con la suma (la decide la base).
2. La cantidad nunca baja de 1 (UI y `check` en la base).
3. Deshacer un eliminado no escribe en la base: el item sigue guardado y solo se oculta en pantalla.
4. Solo el dueño de la lista puede leer, añadir, cambiar, tachar o borrar sus items (RLS).
5. **(SCRUM-66)** Tocar una fila pendiente la tacha; tocar una fila tachada la destacha.
6. **(SCRUM-66)** Cuándo y quién tachó lo pone la base, nunca el cliente: el cliente solo dice "tachado" o "no tachado".
7. **(SCRUM-66)** "Tachados hoy" muestra solo lo tachado desde la medianoche del día local del usuario. Lo tachado antes no aparece en ninguna de las dos secciones (va a vivir en Historial de compras).
8. **(SCRUM-66)** Añadir un producto que está tachado lo devuelve a "Pendientes" con la cantidad que se pide ahora (1 desde el buscador; lo que calcule la receta desde una receta), en vez de sumarle a lo ya comprado: es una compra nueva.
9. **(SCRUM-66)** Dentro de cada sección las filas mantienen el orden en que se añadieron: destachar devuelve la fila a su lugar y el resto no se mueve.
10. **(SCRUM-66)** Mientras una fila espera respuesta de la base (cantidad o tachado), sus botones de tachar, cantidad y eliminar quedan deshabilitados. Con el tachado optimista la fila ya se ve en su sección nueva durante esa espera.
11. **(SCRUM-66)** Al agregar una receta, lo tachado no cuenta como "ya en la lista": ni su cantidad ni lo que otras recetas pidieron sobre esa fila. Si la receta necesita ese producto, lo pide como si no estuviera.
12. **(SCRUM-66)** Tachar es optimista; la cantidad, añadir y eliminar no cambian (siguen esperando a la base).
13. **(SCRUM-67)** Iniciar compra en un súper retoma la compra abierta del mismo dueño en ese súper iniciada hoy (desde la medianoche local); si no hay, crea una. Dos pestañas que inician a la vez terminan en la misma compra.
14. **(SCRUM-67)** El modo compra vive en la URL (`/lista?compra=<id>`): recargar lo mantiene. "Salir" quita el parámetro y **no** cierra la compra: lo tachado ya está guardado y se puede retomar (CA-06).
15. **(SCRUM-67)** En modo compra, tachar guarda la compra (`purchase_session_id`) y lo comprado (`quantity_bought`, al principio igual a lo pedido). Quién y cuándo los sigue poniendo el trigger de 015.
16. **(SCRUM-67)** En modo compra, el "−"/"+" de una fila tachada **en esta compra** ajusta lo comprado (mínimo 1); en una pendiente ajusta lo pedido, como siempre. La fila muestra "Pedido N" cuando lo comprado es distinto de lo pedido.
17. **(SCRUM-67)** Destachar borra la compra y lo comprado de la fila (la base, igual que borra quién y cuándo).
18. **(SCRUM-67)** Cuando no queda nada pendiente en modo compra, aparece el panel "Cerrar compra" con el total gastado (colones, número ≥ 0, opcional: vacío = "sin total", como pide documento-proyecto §4.6). "Terminar compra" en la barra abre el mismo panel. Cerrar guarda `closed_at` y el total y vuelve a la lista normal.
19. **(SCRUM-67)** Una compra cerrada o ajena no acepta tachados (lo rechaza la base). Abrir `/lista?compra=<id>` de una compra cerrada, ajena o inexistente sale del modo compra con un aviso.
20. **(SCRUM-67)** Fuera del modo compra, tachar funciona como en SCRUM-66: sin compra ni cantidad comprada.
21. **(SCRUM-67)** Una compra solo la ve y la cambia su dueño (RLS). Una fila solo se puede asociar a una compra propia y abierta: la base lo valida aunque alguien llame la API a mano.

## 6. Estados

De la lista (`ShoppingListState`, un reducer):

- `loading` → `ready` | `loadError`
- por fila: `idle` | `pending` (escritura de cantidad o tachado esperando respuesta)
- por fila **(SCRUM-66)**: `pending` (sección "Pendientes", `checkedAt === null`) | `checked` (sección "Tachados hoy"). Mientras viaja el cambio, lo que se ve es el estado optimista (`useOptimistic`); el confirmado sigue en el reducer.
- eliminar: `none` | `undoVisible` (toast) | `deleting`
- **(SCRUM-67)** modo: `normal` (sin `?compra`) | `shopping` (compra cargada y abierta). Carga de la compra: `loading` | `ready` | `invalid` (cerrada, ajena o inexistente → vuelve a `normal` con aviso).
- **(SCRUM-67)** elegir súper: `closed` | `open` (modal) → `starting`. Cerrar compra: `hidden` | `open` (todo tachado o "Terminar compra") → `closing`.
- detalle: `closed` | `loading` | `ready` | `error`

Los estados vienen de datos (`checkedAt`, `pendingItemIds`, `undoItemId`), no de booleanos sueltos que puedan contradecirse.

## 7. Errores

- Texto de menos de 2 caracteres: no se busca, no se muestran resultados.
- Búsqueda sin resultados: mensaje "sin resultados".
- Error al cargar: mensaje y no se ofrece añadir (la pantalla mostraría solo lo recién añadido como si fuera toda la lista).
- Error al añadir, cambiar cantidad, eliminar o **tachar/destachar**: mensaje de error propio de esa acción; la fila queda como la confirmó la base por última vez (una fila que no se pudo tachar vuelve a "Pendientes", donde estaba antes del toque).
- Error al pedir el detalle: mensaje dentro del modal; la lista sigue igual.
- Error al borrar en la base: la fila vuelve y aparece un mensaje de error.
- **(SCRUM-67)** Error al cargar los súper o al iniciar la compra: mensaje dentro del modal; se puede reintentar.
- **(SCRUM-67)** Compra inválida en la URL: aviso "Esa compra ya no está abierta" y la lista normal.
- **(SCRUM-67)** Error al cambiar lo comprado: el mismo mensaje que la cantidad; lo comprado queda como lo confirmó la base.
- **(SCRUM-67)** Total con letras o negativo: error en el campo, no se envía. Error al cerrar: mensaje en el panel; la compra sigue abierta.

## 8. UI esperada

- Título "Lista general" y buscador arriba.
- Sección "Pendientes": filas sin tachar. Si todo está tachado, la sección sigue arriba con un texto corto que lo dice, en vez de desaparecer o quedar vacía.
- Sección "Tachados hoy": filas tachadas hoy, con el nombre tachado y atenuado. Solo aparece si tiene filas.
- Cada fila: [botón de tachar con nombre y tamaño, ocupa todo el ancho libre] [− cantidad +] [detalle] [eliminar].
- Sin checkbox ni ícono de estado (HU-36e CA-01; reemplaza al checkbox indicador de DESIGN.md §2, que es anterior a la decisión del 2026-08-21).
- Estado de lista vacía, spinner al cargar, toast de eliminado, modal de detalle.
- **(SCRUM-67)** Fuera de modo compra: botón "Iniciar compra" bajo el título (si la lista tiene filas). Al tocarlo, un modal con un botón por súper.
- **(SCRUM-67)** En modo compra: barra arriba "Comprando en {súper}" con "Terminar compra" y "Salir"; sin "Iniciar compra". El resto de la pantalla es la misma lista (CA-02).
- **(SCRUM-67)** Fila tachada en esta compra: la cantidad del stepper es lo comprado; si difiere de lo pedido, debajo del tamaño dice "Pedido N".
- **(SCRUM-67)** Panel "Cerrar compra": texto corto, campo "Total gastado (₡)" opcional, botones "Cerrar compra" y "Seguir comprando".

## 9. Accesibilidad

- El botón de tachar es un `<button>` con `aria-pressed`: el lector de pantalla anuncia "presionado" cuando está tachado, sin agregar nada visible (CA-03).
- Ningún botón dentro de otro botón (HTML inválido; el click de adentro dispararía también el de afuera).
- Los botones de solo símbolo ("−", "+", "i", "✕") tienen texto `sr-only`.
- Cada sección es una región con nombre (`<section aria-label>`) y un `<h2>` visible.
- Errores con `role="alert"`; toast con `role="status"`.
- Una fila que espera respuesta usa `disabled` nativo, que también la saca del foco con Tab.
- **(SCRUM-67)** La barra de modo compra es una región con nombre; "Salir" y "Terminar compra" son botones con texto.
- **(SCRUM-67)** El modal de súper usa el `Modal` de `components/ui` (cierre con Escape); cada súper es un botón con su nombre.
- **(SCRUM-67)** El total usa el `Input` de `components/ui` (label asociado) y su error se muestra bajo el campo; "Pedido N" es texto visible, no solo un color.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`.
- Tailwind con tokens `tacha-*`.
- ViewModel + hooks: los `.tsx` solo presentan; el acceso a datos va en `services/`.
- Estado de la lista con `useReducer`: todas las reglas en un reducer puro y testeado.
- Cero literales: textos, tablas, RPC y acciones en `constants/`.
- Las búsquedas viejas nunca pisan a las nuevas; un detalle viejo nunca se muestra en otro producto.
- Migraciones según `supabase/README.md#migraciones` (número libre, transacción + fila del historial; nunca `apply_migration` del MCP).
- Skills: `component-architecture`, `constants-standards`, `project-structure`, `security-practices`, `unit-testing-standards`, `gitflow`.
- **(SCRUM-67)** `useSearchParams` obliga a una frontera `<Suspense>` (Next.js): la pantalla se separa en `ShoppingList` (la frontera) + `ShoppingListInner` (Container/Inner, component-architecture §5).

## 11. Dependencias

- `features/shopping-list/services/shopping-list.service.ts`
- `features/shopping-list/constants/shopping-list.constants.ts`
- `services/supabase.client.ts` (cliente único + sesión)
- `components/product-search/`, `hooks/useProductSearch.ts`, `services/catalog.service.ts` (buscador compartido, SCRUM-120)
- `@/components/ui` (`Button`, `Modal`, `Spinner`)
- `types/database.types.ts`

## 12. Contratos externos

- Tablas `lists`, `list_items` (004), con RLS del dueño.
- **(SCRUM-66)** `list_items.checked_at timestamptz null`, `list_items.checked_by uuid null → auth.users`, y el trigger que los llena (015).
- RPC `add_item_to_general_list(target_variant_id)` (004; **015** reabre una fila tachada).
- RPC `change_item_quantity(target_item_id, quantity_delta)` (005).
- RPC `add_units_to_list_item(...)` y `add_recipe_to_general_list(target_recipe_id)` (013, SCRUM-97; **015** les aplica las reglas 8 y 11).
- **(SCRUM-66)** RPC `set_list_item_checked(target_item_id, is_checked)` (015).
- **(SCRUM-67)** Tabla `purchase_sessions` (016): `owner_id`, `household_id` (null), `list_id` (null), `store_id`, `started_at`, `closed_at`, `total_amount`; RLS del dueño.
- **(SCRUM-67)** `list_items.purchase_session_id` (→ `purchase_sessions`) y `list_items.quantity_bought` (≥ 1), validados y limpiados por el trigger de 015, que 016 extiende.
- **(SCRUM-67)** RPC `start_purchase_session(target_store_id, local_day_start)`, `check_list_item_in_session(target_item_id, target_session_id)`, `change_bought_quantity(target_item_id, quantity_delta)`, `close_purchase_session(target_session_id, spent_total)` (016).
- **(SCRUM-67)** Migración `018` (revisión de seguridad): borrar una compra deja sus filas sin compra ni lo comprado (antes fallaba), `closed_at` lo pone la base, una compra cerrada no cambia lo comprado de sus filas y el total no acepta NaN. Va con el número 018 porque el 017 lo reservó otra historia.
- Política de borrado de `list_items` (012).
- Lectura del catálogo: `search_catalog`, `product_catalog_variants`, `product_brands`, vista `latest_prices`, `stores`.

## 13. Casos de aceptación

HU-36a
- [x] CA-01: hay una barra de búsqueda en la parte superior de la lista general.
- [x] CA-02: al escribir, se muestran en tiempo real los productos del catálogo que coinciden.
- [x] CA-03: al seleccionar un resultado, se añade a la lista con cantidad 1.
- [x] CA-04: el producto aparece de inmediato como fila (sección "Pendientes"), sin recargar.

HU-36b
- [x] CA-01: cada fila muestra "+" y "−" junto a la cantidad.
- [x] CA-02: "+" suma 1.
- [x] CA-03: "−" resta 1 y no baja de 1.
- [x] CA-04: el cambio se ve de inmediato, sin confirmación, y tocar los controles no tacha la fila.
  - Cómo se cumple: la cantidad cambia en cuanto responde la base (sin diálogo ni recarga); mientras tanto los botones de esa fila quedan deshabilitados. No es actualización optimista (ver [plan.md](plan.md)).

HU-36c
- [x] CA-01: el detalle se abre con un botón específico al final de la fila; tocar la fila no lo abre.
- [x] CA-02: el detalle muestra marca, presentación/variante y precio de referencia por supermercado, si existe.

HU-36d
- [x] CA-01: cada producto de la lista tiene una acción de eliminar.
- [x] CA-02: al eliminar, el producto se quita de la lista de inmediato.
- [x] CA-03: aparece un toast breve "Producto eliminado" con opción de deshacer.

HU-36e
- [x] CA-01: no hay checkbox ni ícono de estado; la fila (nombre y tamaño) es un solo botón. *Cubierto por:* revisión en el navegador.
- [x] CA-02: tocar la fila fuera de cantidad, detalle y eliminar la tacha; tocarla de nuevo la destacha. Tocar esos controles no la tacha. *Cubierto por:* E2E-LISTA-04 (tachar/destachar) + revisión en el navegador (controles).
- [x] CA-03: el único indicador visible es el texto tachado y atenuado. *Cubierto por:* revisión en el navegador.
- [x] CA-04: la lista tiene "Pendientes" arriba y "Tachados hoy" abajo; la fila cambia de sección sin recargar y las demás no se reordenan. *Cubierto por:* unitario (`shopping-list.reducer.test.ts`, orden) + E2E-LISTA-04.
- [x] CA-05: "Tachados hoy" solo muestra lo tachado hoy; lo tachado otro día no aparece en la lista. *Cubierto por:* unitario (`startOfLocalDay.test.ts`) + revisión de la petición en el navegador (el filtro `checked_at.gte` lleva la medianoche local). No se puede fabricar una fila "de ayer": el trigger de 015 no acepta fechas del cliente.
- CA-06: la división aplica a otras listas con tachado (sublistas, privadas, modo compra). Hoy solo existe la lista general; el resto la hereda al reusar esta feature (§14). Modo compra (SCRUM-67) la hereda: es la misma pantalla.

HU-36f
- [x] CA-01: en la lista general hay un botón "Iniciar compra". *Cubierto por:* E2E-LISTA-05 + revisión en el navegador.
- [x] CA-02: al iniciar, primero se elige el supermercado; después es la misma lista (Pendientes / Tachados hoy), sin controles nuevos. *Cubierto por:* E2E-LISTA-05, `tests/useStorePicker.test.ts`.
- [x] CA-03: tachar funciona igual: toda la fila, sin checkbox. *Cubierto por:* E2E-LISTA-05, `tests/useShoppingList.test.ts`.
- [x] CA-04: al tachar se guarda quién, cuándo y en qué súper; lo comprado se ajusta en la misma lista con el "−"/"+". *Cubierto por:* `supabase/tests/016_create_purchase_sessions.test.sql`, reducer, `useShoppingList.test.ts`, E2E-LISTA-05 ("Pedido 1").
- [x] CA-05: con una compra abierta hoy en ese súper, se retoma en vez de crear otra. *Cubierto por:* prueba SQL de 016 + E2E-LISTA-05 (mismo id) + revisión en la base (una compra por usuario y súper).
- [x] CA-06: se puede salir en cualquier momento sin perder lo tachado. *Cubierto por:* E2E-LISTA-05 + `tests/usePurchaseSession.test.ts`.
- [x] CA-07: al tachar lo último pendiente, se sugiere cerrar la compra e ingresar el total. *Cubierto por:* `tests/useClosePurchase.test.ts`, `tests/parseSpentTotal.test.ts`, E2E-LISTA-05 + revisión en la base (cerrada con y sin total).
- CA-08: listas privadas: fuera de alcance (no existen). El modelo ya trae `list_id` y `household_id` para cuando existan (§14).

Casos límite que se validan con tests o en el navegador:

- Tachar, recargar: sigue en "Tachados hoy". Destachar, recargar: sigue en "Pendientes".
- Tachar: la fila cambia de sección antes de que responda la base. *Cubierto por:* `tests/useShoppingList.test.ts`.
- Error al tachar: la fila se ve en la sección nueva mientras espera, vuelve a la original cuando llega el error y aparece el mensaje. *Cubierto por:* `tests/useShoppingList.test.ts`.
- Doble toque rápido en la fila: el segundo se ignora mientras espera (botón deshabilitado).
- Añadir desde el buscador un producto tachado: vuelve a "Pendientes" con cantidad 1.
- Agregar una receta que pide 2 unidades de un producto comprado ayer (3 unidades): falta 1 unidad, y la fila vuelve a "Pendientes" con 1. *Cubierto por:* `supabase/tests/015_check_list_items.test.sql`.
- Eliminar una fila tachada: funciona igual que una pendiente.
- Usuario escribe rápido en el buscador: solo cuenta la última búsqueda.
- Abrir un detalle, cerrarlo y abrir otro antes de que responda el primero: solo se muestra el segundo.
- Eliminar mientras otro tiene el toast: el anterior se borra en ese momento.
- Volver a añadir un producto con el toast de eliminado: se cancela el borrado y se le suma 1.
- Salir de la pantalla con un toast activo: el borrado se manda en ese momento.

## 14. Casos fuera de alcance

- Historial de compras (ver lo tachado en días anteriores): es otra historia. Hasta entonces, lo tachado antes de hoy queda guardado en la base pero no se muestra.
- **(SCRUM-67)** Listas privadas (HU-36f CA-08), sublistas e "Iniciar compra" desde una sublista: esas listas no existen todavía. `purchase_sessions.list_id` y `household_id` quedan en `null` hasta entonces.
- **(SCRUM-67)** Historial de compras y dashboard financiero (leer las compras cerradas): otras historias. Esta solo las guarda.
- **(SCRUM-67)** Recordar una compra que quedó sin total, cambiar el súper de una compra ya iniciada y el inventario doméstico al tachar (documento-proyecto §6): fuera de esta historia.
- **(SCRUM-67)** Cambiar la variante comprada ("1 galón" en vez de "2 cajas"): solo se ajusta la cantidad.
- **(SCRUM-67) Pendiente para Historial de compras:** una fila comprada en una compra que **ya se cerró** sigue en "Tachados hoy" el resto del día. Desde la migración `018` su compra y lo comprado ya no se pueden cambiar ni pasar a otra compra, pero destacharla o volver a añadirla (regla 8 de SCRUM-66) todavía la saca de esa compra cerrada: bloquearlo impediría volver a comprar el producto. La historia de historial tiene que decidir dónde guardar lo comprado para que no dependa de la fila de la lista.
- Sublistas y listas privadas: no existen todavía; cuando existan reusan esta división (CA-06).
- Mover de sección una fila tachada a las 23:59 cuando pasa la medianoche con la pantalla abierta: se corrige al recargar.
- **Deuda (revisión de seguridad, 2026-10-08):** el trigger `stamp_list_item_check` (015) conserva `checked_by` cuando la fila ya estaba tachada, incluso en el `set null` que hace la FK al borrar un usuario: la fila queda apuntando a un usuario borrado. Hoy no ocurre (solo el dueño tacha y sus listas se borran en cascada con él). Se cierra en la migración que abra las listas de household a otros miembros: en ese caso del trigger conservar solo `checked_at`.
- Salir de la pantalla en los milisegundos entre tocar una fila y que la base confirme: con el tachado optimista la fila ya se vio tachada, pero si el navegador corta la petición, el tachado no se guarda. Mientras tanto la fila se ve deshabilitada; avisar al salir con escrituras pendientes queda para modo compra si hace falta.
- Tiempo real entre dispositivos (ver lo que tacha otro miembro sin recargar): llega con listas de household.
- **Pendiente para SCRUM-98** (depende de esta historia): al reabrir una fila tachada, sus registros viejos de `list_item_recipe_requirements` (lo que pidieron recetas anteriores, ya comprado) siguen colgados de ella y vuelven a contar como pedidos. El error es conservador: la lista puede decir que falta más de lo que falta, nunca menos. Ejemplo: receta A pidió 500 ml, se compró y se tachó; al reabrir la fila (1 L) y agregar la receta B (600 ml), se calcula disponible 500 en vez de 1000 y se marca un faltante de 100 que no existe. Y si se agrega otra vez la receta A, su registro acumula sobre el viejo. No se resolvió acá porque borrar esos registros pide abrir `delete` en `list_item_recipe_requirements` (013 le quita todo a `authenticated` menos select/insert/update) y decidir si destachar a mano (un tachado por error) también los borra; las dos cosas son de recetas.
- Animación de tachado progresivo (documento-proyecto §7): retoque visual posterior.
- Toast compartido para otras pantallas: se promueve a `components/ui` con el segundo consumidor real.
- Garantizar el borrado si se cierra la pestaña antes de que venza el toast.
- Filtrar precios por las tiendas del household.
- Detalle desde el catálogo (HU-53).
- Listas de household: por ahora `household_id` siempre es `null`.

## 15. Notas de implementación

`ItemRow` de `components/ui` no se usa: dibuja un checkbox indicador (contra CA-01) y es un `<button>` que envuelve toda la fila, así que los controles de cantidad quedarían anidados. Ver [plan.md](plan.md), SCRUM-66.

## 16. SCRUM-114: aviso pasivo de faltante

Decidido con el responsable el 2026-10-29 (lo que HU-76 no cierra): el aviso sale en **pendientes y tachados**, con **una línea por receta**, y en la lista de la familia cada miembro ve **el nombre de la receta de otro miembro** que dejó el faltante. Para eso la base expone solo ese nombre, sin abrir la RLS de `recipes` ([16.12](#1612-notas-de-implementación)).

### 16.1 Objetivo

Que el usuario vea, bajo el producto de su lista, cuánto más necesita para una receta o para el plan semanal que agregó, sin que la app lo interrumpa ni decida por él qué comprar (documento-proyecto §4.9.1, paso 2). Resolver ese faltante al tachar es SCRUM-115.

### 16.2 Alcance

- Bajo el nombre y el tamaño de cada fila de la lista general, un texto chico y secundario por cada receta que dejó un faltante en esa fila: **"+ 600 ml necesarios para Tres leches"**.
- Los faltantes ya existen: los registran "Agregar receta a lista" (SCRUM-97) y "Agregar semana a la lista" (SCRUM-101) en `list_item_recipe_requirements`. Esta historia solo los **muestra**; no cambia cómo se calculan.
- Se cargan junto con la lista, al abrir `/lista`.
- Migración nueva con una RPC de solo lectura que devuelve los faltantes de la lista general de quien llama con el nombre de su receta ([16.10](#1610-contratos-externos)).

Lo que no incluye está en [16.11](#1611-casos-fuera-de-alcance).

### 16.3 Entradas

| Entrada | Tipo | De dónde |
|---|---|---|
| Faltantes de la lista general | `list_item_id`, nombre de la receta, `quantity_missing`, `quantity_unit` (`ml` / `g`) | RPC nueva, leída al cargar la lista |
| Filas de la lista | `ShoppingListItem[]` | la carga que ya existe (`getGeneralList`) |

El usuario no ingresa nada: el aviso es solo lectura.

### 16.4 Salidas

- Cada `ShoppingListItem` lleva sus faltantes (`recipeShortfalls`, vacío si no tiene).
- La fila dibuja una línea por faltante, debajo del producto.
- No escribe nada en la base.

### 16.5 Reglas de negocio

22. **Qué es un aviso.** Un registro de `list_item_recipe_requirements` con `quantity_missing` mayor que 0 (regla 23 de la [SPEC de recetas](../../recipes/specs/SPEC.md)). Un registro con faltante 0 no se muestra.
23. **Solo volumen o peso (CA-03).** Solo los registros en `ml` o `g`. Un registro en `unidad` (ingrediente de conteo cuyo producto se vende en otra unidad, regla 22 de recetas) no se muestra: HU-76 excluye los ingredientes de conteo.
24. **Solo recetas y plan semanal (CA-03).** Los únicos que escriben registros son agregar una receta (SCRUM-97) y agregar la semana (SCRUM-101). Añadir desde el buscador, y en el futuro desde sublistas o grupos, suma directo y nunca deja registro, así que nunca deja aviso.
25. **Una línea por receta.** Cada registro es por receta (regla 24 de recetas), así que cada uno es su propia línea, en el orden en que se registraron. No se suman faltantes de recetas distintas ni se mezclan `ml` con `g`.
26. **Texto (CA-01):** "+ {faltante con su unidad} necesarios para {receta}". La cantidad va con coma decimal, como en el resto de recetas ("+ 250,5 ml necesarios para Flan"). Una receta del plan semanal se nombra igual: el registro no guarda si vino de una receta suelta o de la semana.
27. **Puramente informativo (CA-02).** El aviso no es un botón, no está dentro del botón de tachar y no dispara nada: tocarlo no tacha la fila ni abre nada.
28. **Pendientes y tachados.** El aviso sale en las dos secciones. Hasta que SCRUM-115 resuelva el faltante al tachar, en la base el faltante sigue registrado; es el mismo criterio que "Te falta comprar 600 ml" del panel "Ver qué falta" (SCRUM-98, regla 30 de recetas).
29. **Lista de la familia.** Si la lista general es de la familia (SCRUM-59), cada miembro ve todos los avisos de la lista, con el nombre de la receta aunque sea de otro miembro. Solo se expone el nombre: la receta no aparece en el catálogo ni en el planificador de los demás, y sus ingredientes siguen privados.
30. **Solo la lista que se ve.** La RPC devuelve los faltantes de la lista general de quien llama (la de su familia si es miembro, si no la personal), la misma que dibuja la pantalla. "Mi lista personal" (la que se mantuvo al unirse a una familia, sección de solo lectura) no muestra avisos.
31. **Se calcula en la base.** El cliente no decide qué registros son aviso: la RPC ya aplica las reglas 22 y 23. El cliente solo arma el texto.
32. **Cambios en la fila no tocan el aviso.** Cambiar la cantidad, tachar, destachar o volver a añadir el producto desde el buscador no cambia los registros en la base (regla 23 de recetas: el faltante no se recalcula), así que el aviso de la fila se conserva. Borrar la fila borra sus registros (cascada) y con ella el aviso.

### 16.6 Estados

No hay estados nuevos. Los faltantes llegan con la carga de la lista (`loading` → `ready` | `loadError`): si la RPC falla, falla la carga entera con el mismo mensaje, porque mostrar la lista sin avisos diría que no falta nada sin saberlo.

### 16.7 Errores

| Caso | Qué se muestra |
|---|---|
| Falla la RPC de faltantes al cargar | "No se pudo cargar tu lista. Intenta de nuevo." (el error de carga que ya existe) |
| La receta se borra después de cargar | Nada hasta recargar; al recargar el aviso ya no está (cascada) |
| Otra pestaña agrega una receta | Nada hasta recargar (la lista no tiene tiempo real) |

### 16.8 UI esperada

- Debajo del botón de la fila (nombre y tamaño), alineado con el nombre, una línea por aviso en texto chico (`text-xs`) y color secundario (`text-tacha-textsec`), sin ícono ni fondo.
- En una fila tachada el aviso **no** se tacha: lo tachado es el producto, el faltante sigue pendiente.
- Sin aviso, la fila se ve exactamente como antes.

### 16.9 Accesibilidad

- El aviso es texto, fuera del botón de tachar: no cambia el nombre accesible del botón ni se enfoca con Tab.
- El botón de tachar lo referencia con `aria-describedby`, así que el lector de pantalla lo lee como descripción del producto ("Leche 1000 ml, presionado, + 600 ml necesarios para Tres leches").
- Varias líneas son una lista (`<ul>`), para que el lector anuncie cuántas son.

### 16.10 Contratos externos

- **RPC nueva `get_general_list_shortfalls() returns table (list_item_id uuid, recipe_name text, quantity_missing numeric, quantity_unit text)`**, de solo lectura (`stable`), `security definer` y `search_path` vacío.
  - Sin sesión: `42501`.
  - La lista sale de `find_general_list_id()` (024), que filtra por `auth.uid()` y no por RLS, así que funciona igual dentro de una función `security definer`. Sin lista general devuelve 0 filas.
  - Devuelve solo los registros de los ítems de esa lista con `quantity_missing > 0` y `quantity_unit` en `ml` o `g` (reglas 22, 23 y 30), en el orden de la fila y del registro.
  - `execute` solo para `authenticated` (los usuarios anónimos de Supabase también lo son); `anon` y `public` sin permiso.
- **No cambia** ninguna tabla, política ni función existente: `recipes` sigue siendo solo de su dueño para cualquier otra lectura.
- **Migración `032`** (la `031` es de la rama de SCRUM-87), con su prueba SQL en `supabase/tests/`.
- **`docs/documento-proyecto.md`** (§4.9.1 y §6) se actualiza en este PR: el aviso ya se muestra y el nombre de la receta es visible para la familia.

### 16.11 Casos fuera de alcance

- **Resolver el faltante al tachar ("¿Qué hiciste?") y recalcularlo si cambia la lista:** SCRUM-115.
- **Avisos en "Mi lista personal"** (la que se mantuvo al unirse a una familia): es de solo lectura y no es la lista a la que se agregan recetas.
- **Tiempo real:** ver avisos nuevos de otra pestaña o de otro miembro sin recargar. Llega con el tiempo real de la lista.
- **Decir si el faltante vino de una receta suelta o del plan semanal:** el registro no lo guarda; agregarlo cambiaría las funciones de SCRUM-97 y SCRUM-101.
- **Avisos de sublistas, grupos o ingredientes de conteo:** por diseño no existen (CA-03).
- **Deuda de SCRUM-66 que sigue igual:** al reabrir una fila tachada (volver a añadirla), sus registros viejos siguen pegados y su aviso también. Se corrige con SCRUM-115.

### 16.12 Notas de implementación

- **Por qué una RPC `security definer` y no abrir la RLS de `recipes`.** El catálogo `/recetas`, el planificador y el editor leen `recipes` sin filtrar por dueño: lo decide la RLS (regla 1 de recetas). Una política que dejara a un miembro leer la receta de otro la haría aparecer en su catálogo y en el diálogo de asignar del planificador, y abriría su fila completa. La RPC devuelve solo cuatro columnas y solo de la lista general de quien llama.
- **Por qué no embebida en la consulta de la lista.** `list_item_recipe_requirements(recipes(name))` funciona para el dueño, pero en la lista de la familia el nombre de la receta de otro miembro llega `null` por la RLS de `recipes`. La consulta de la lista no cambia; la RPC va en paralelo.
- **Contrato de SCRUM-97 cumplido:** la SPEC de recetas (§15) dejó para esta historia traer el registro con la lista, un campo en `ShoppingListItem` y un componente chico en `features/shopping-list/components/`, con revisión de Marcos.
- **`formatRecipeQuantity` se promueve a `utils/`.** Recetas y la lista escriben cantidades de receta con coma decimal: segundo consumidor real (component-architecture §1). Sus etiquetas de unidad y el separador decimal pasan a `constants/`, y `features/recipes/constants/recipes.constants.ts` los reexporta para no tocar sus imports.
- **Restricciones:** las de la sección 10, sin librerías nuevas. Skills: `component-architecture`, `constants-standards`, `project-structure`, `security-practices` (RPC `security definer`), `unit-testing-standards`, `playwright-e2e`, `gitflow`.

### 16.13 Casos de aceptación (HU-76, SCRUM-114)

- [ ] CA-01: una fila con un faltante de receta muestra debajo del producto "+ 600 ml necesarios para Tres leches", en texto chico y secundario.
- [ ] CA-02: el aviso no es un botón: tocarlo no tacha la fila ni abre nada, y no se enfoca con Tab.
- [ ] CA-03: un ingrediente de conteo, un registro con faltante 0 y un producto añadido desde el buscador no muestran aviso.
- [ ] Un faltante que viene de "Agregar semana a la lista" se muestra igual, con el nombre de la receta.
- [ ] Dos recetas con faltante sobre el mismo producto: dos líneas, una por receta.
- [ ] El aviso sigue en la fila al tacharla (sin tachar el texto del aviso) y al destacharla.
- [ ] Cambiar la cantidad o volver a añadir el producto desde el buscador no quita el aviso.
- [ ] Borrar la receta (SCRUM-96) y recargar: el aviso ya no está.
- [ ] En la lista de la familia, otro miembro ve el aviso con el nombre de la receta, y esa receta no aparece en su `/recetas` ni en el planificador.
- [ ] Otro usuario fuera de la familia no recibe faltantes de mi lista; sin sesión, `42501`; `anon` no puede llamar a la RPC.
- [ ] Falla la RPC al cargar: "No se pudo cargar tu lista. Intenta de nuevo."
- [ ] El lector de pantalla lee el aviso como descripción del botón de la fila.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm test` pasan.
