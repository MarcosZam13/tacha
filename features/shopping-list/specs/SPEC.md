# Feature: ShoppingList

Historias: [SCRUM-62 / HU-36a](https://tacha.atlassian.net/browse/SCRUM-62) (buscar y añadir producto) · [SCRUM-63 / HU-36b](https://tacha.atlassian.net/browse/SCRUM-63) (ajustar cantidad). Sprint 1.

[SCRUM-64 / HU-36c](https://tacha.atlassian.net/browse/SCRUM-64) (ver detalle de producto) · [SCRUM-65 / HU-36d](https://tacha.atlassian.net/browse/SCRUM-65) (eliminar producto). Sprint 2.

[SCRUM-66 / HU-36e](https://tacha.atlassian.net/browse/SCRUM-66) (tachar/destachar producto). Sprint 3.

> Reescrita con la plantilla de 15 secciones en SCRUM-66 (component-architecture §2, "Specs existentes"): tachar cambia el comportamiento de la fila. El contenido de las historias anteriores se conserva, solo cambió de sección.

## 1. Objetivo

Que el usuario arme su lista general buscando productos del catálogo real, ajustando cuánto necesita, y que lleve control de lo que ya consiguió tachándolo con un toque, sin salir de la pantalla y con la lista guardada.

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
- **(SCRUM-66)** La lista se divide en dos secciones: "Pendientes" arriba y "Tachados hoy" abajo. Una fila pasa de una a otra en cuanto la base confirma el cambio.
- **(SCRUM-66)** La base guarda cuándo y quién tachó cada item (`list_items.checked_at`, `list_items.checked_by`, migración `015`).

No incluye: ver §14.

## 3. Entradas

Del usuario:

- texto del buscador: `string`
- variante elegida: `variantId: string`
- toque en "+" / "−" de una fila: `itemId: string`, `quantityStep: ItemQuantityStepType` (`1` | `-1`)
- toque en el botón de detalle: `itemId: string`
- toque en eliminar / "Deshacer": `itemId: string`
- **(SCRUM-66)** toque en la fila: `itemId: string`; el estado nuevo (`isChecked: boolean`) lo calcula el ViewModel a partir del que la fila tiene en pantalla.

De la base:

- `ShoppingListItem[]` de la lista general: `id`, `productName`, `sizeLabel`, `quantity`, `variantId`, **`checkedAt: string | null`**.

La pantalla no recibe props: `app/lista/page.tsx` solo renderiza `<ShoppingList />`.

## 4. Salidas

- Filas nuevas o con cantidad actualizada, tal como quedaron en la base.
- Modal de detalle con marcas y precios.
- Toast de eliminado con "Deshacer"; borrado en la base al vencer.
- **(SCRUM-66)** `list_items.checked_at` / `checked_by` escritos por la base al tachar (hora del servidor y `auth.uid()`), y en `null` al destachar.
- **(SCRUM-66)** La fila en la sección que corresponde, con el texto tachado y atenuado si está tachada.
- Mensajes de error por acción, sin que la lista quede en un estado inventado.

## 5. Reglas de negocio

1. Añadir la misma variante dos veces deja una sola fila con la suma (la decide la base).
2. La cantidad nunca baja de 1 (UI y `check` en la base).
3. Deshacer un eliminado no escribe en la base: el item sigue guardado y solo se oculta en pantalla.
4. Solo el dueño de la lista puede leer, añadir, cambiar, tachar o borrar sus items (RLS).
5. **(SCRUM-66)** Tocar una fila pendiente la tacha; tocar una fila tachada la destacha.
6. **(SCRUM-66)** Cuándo y quién tachó lo pone la base, nunca el cliente: el cliente solo dice "tachado" o "no tachado".
7. **(SCRUM-66)** "Tachados hoy" muestra solo lo tachado desde la medianoche del día local del usuario. Lo tachado antes no aparece en ninguna de las dos secciones (va a vivir en Historial de compras).
8. **(SCRUM-66)** Añadir desde el buscador un producto que está tachado lo devuelve a "Pendientes" con cantidad 1, en vez de sumarle a lo ya comprado: es una compra nueva.
9. **(SCRUM-66)** Dentro de cada sección las filas mantienen el orden en que se añadieron: destachar devuelve la fila a su lugar y el resto no se mueve.
10. **(SCRUM-66)** Mientras una fila espera respuesta de la base (cantidad o tachado), sus botones de tachar, cantidad y eliminar quedan deshabilitados.

## 6. Estados

De la lista (`ShoppingListState`, un reducer):

- `loading` → `ready` | `loadError`
- por fila: `idle` | `pending` (escritura de cantidad o tachado esperando respuesta)
- por fila **(SCRUM-66)**: `pending` (sección "Pendientes", `checkedAt === null`) | `checked` (sección "Tachados hoy")
- eliminar: `none` | `undoVisible` (toast) | `deleting`
- detalle: `closed` | `loading` | `ready` | `error`

Los estados vienen de datos (`checkedAt`, `pendingItemIds`, `undoItemId`), no de booleanos sueltos que puedan contradecirse.

## 7. Errores

- Texto de menos de 2 caracteres: no se busca, no se muestran resultados.
- Búsqueda sin resultados: mensaje "sin resultados".
- Error al cargar: mensaje y no se ofrece añadir (la pantalla mostraría solo lo recién añadido como si fuera toda la lista).
- Error al añadir, cambiar cantidad, eliminar o **tachar/destachar**: mensaje de error propio de esa acción; la fila queda como la confirmó la base por última vez (una fila que no se pudo tachar sigue en "Pendientes").
- Error al pedir el detalle: mensaje dentro del modal; la lista sigue igual.
- Error al borrar en la base: la fila vuelve y aparece un mensaje de error.

## 8. UI esperada

- Título "Lista general" y buscador arriba.
- Sección "Pendientes": filas sin tachar. Si todo está tachado, en su lugar un texto corto lo dice en vez de dibujar una sección vacía.
- Sección "Tachados hoy": filas tachadas hoy, con el nombre tachado y atenuado. Solo aparece si tiene filas.
- Cada fila: [botón de tachar con nombre y tamaño, ocupa todo el ancho libre] [− cantidad +] [detalle] [eliminar].
- Sin checkbox ni ícono de estado (HU-36e CA-01; reemplaza al checkbox indicador de DESIGN.md §2, que es anterior a la decisión del 2026-08-21).
- Estado de lista vacía, spinner al cargar, toast de eliminado, modal de detalle.

## 9. Accesibilidad

- El botón de tachar es un `<button>` con `aria-pressed`: el lector de pantalla anuncia "presionado" cuando está tachado, sin agregar nada visible (CA-03).
- Ningún botón dentro de otro botón (HTML inválido; el click de adentro dispararía también el de afuera).
- Los botones de solo símbolo ("−", "+", "i", "✕") tienen texto `sr-only`.
- Cada sección es una región con nombre (`<section aria-label>`) y un `<h2>` visible.
- Errores con `role="alert"`; toast con `role="status"`.
- Una fila que espera respuesta usa `disabled` nativo, que también la saca del foco con Tab.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`.
- Tailwind con tokens `tacha-*`.
- ViewModel + hooks: los `.tsx` solo presentan; el acceso a datos va en `services/`.
- Estado de la lista con `useReducer`: todas las reglas en un reducer puro y testeado.
- Cero literales: textos, tablas, RPC y acciones en `constants/`.
- Las búsquedas viejas nunca pisan a las nuevas; un detalle viejo nunca se muestra en otro producto.
- Migraciones según `supabase/README.md#migraciones` (número libre, transacción + fila del historial; nunca `apply_migration` del MCP).
- Skills: `component-architecture`, `constants-standards`, `project-structure`, `security-practices`, `unit-testing-standards`, `gitflow`.

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
- **(SCRUM-66)** RPC `set_list_item_checked(target_item_id, is_checked)` (015).
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
- [ ] CA-01: no hay checkbox ni ícono de estado; la fila (nombre y tamaño) es un solo botón.
- [ ] CA-02: tocar la fila fuera de cantidad, detalle y eliminar la tacha; tocarla de nuevo la destacha. Tocar esos controles no la tacha.
- [ ] CA-03: el único indicador visible es el texto tachado y atenuado.
- [ ] CA-04: la lista tiene "Pendientes" arriba y "Tachados hoy" abajo; la fila cambia de sección sin recargar y las demás no se reordenan.
- [ ] CA-05: "Tachados hoy" solo muestra lo tachado hoy; lo tachado otro día no aparece en la lista.
- CA-06: la división aplica a otras listas con tachado (sublistas, privadas, modo compra). Hoy solo existe la lista general; el resto la hereda al reusar esta feature (§14).

Casos límite que se validan con tests o en el navegador:

- Tachar, recargar: sigue en "Tachados hoy". Destachar, recargar: sigue en "Pendientes".
- Error al tachar: la fila sigue en su sección y aparece el mensaje.
- Doble toque rápido en la fila: el segundo se ignora mientras espera (botón deshabilitado).
- Añadir desde el buscador un producto tachado: vuelve a "Pendientes" con cantidad 1.
- Eliminar una fila tachada: funciona igual que una pendiente.
- Usuario escribe rápido en el buscador: solo cuenta la última búsqueda.
- Abrir un detalle, cerrarlo y abrir otro antes de que responda el primero: solo se muestra el segundo.
- Eliminar mientras otro tiene el toast: el anterior se borra en ese momento.
- Volver a añadir un producto con el toast de eliminado: se cancela el borrado y se le suma 1.
- Salir de la pantalla con un toast activo: el borrado se manda en ese momento.

## 14. Casos fuera de alcance

- Historial de compras (ver lo tachado en días anteriores): es otra historia. Hasta entonces, lo tachado antes de hoy queda guardado en la base pero no se muestra.
- Modo compra, supermercado de la compra y cantidad realmente comprada: HU-36f (SCRUM-67).
- Sublistas y listas privadas: no existen todavía; cuando existan reusan esta división (CA-06).
- Mover de sección una fila tachada a las 23:59 cuando pasa la medianoche con la pantalla abierta: se corrige al recargar.
- Tiempo real entre dispositivos (ver lo que tacha otro miembro sin recargar): llega con listas de household.
- Agregar una receta sobre un producto tachado: `add_recipe_to_general_list` (013, SCRUM-97) cuenta las filas tachadas como "ya está en la lista" y les suma sin reabrirlas. Arreglarlo cambia el cálculo de faltantes de recetas; queda anotado para quien lleva SCRUM-97.
- Animación de tachado progresivo (documento-proyecto §7): retoque visual posterior.
- Toast compartido para otras pantallas: se promueve a `components/ui` con el segundo consumidor real.
- Garantizar el borrado si se cierra la pestaña antes de que venza el toast.
- Filtrar precios por las tiendas del household.
- Detalle desde el catálogo (HU-53).
- Listas de household: por ahora `household_id` siempre es `null`.

## 15. Notas de implementación

`ItemRow` de `components/ui` no se usa: dibuja un checkbox indicador (contra CA-01) y es un `<button>` que envuelve toda la fila, así que los controles de cantidad quedarían anidados. Ver [plan.md](plan.md), SCRUM-66.
