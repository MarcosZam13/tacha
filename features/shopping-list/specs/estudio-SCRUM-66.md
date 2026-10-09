# Guía de estudio: SCRUM-66 (HU-36e, tachar/destachar)

Para defender el código en vivo. El contrato está en [SPEC.md](SPEC.md) y las decisiones con su alternativa en [plan.md](plan.md#scrum-66-tachardestachar-producto).

## 1. Cómo se demuestra

1. `npm run dev` → `/lista` con una lista que tenga 2 o 3 productos.
2. Tocar "+" y "Ver detalle" de una fila: no se tacha (CA-02).
3. Tocar el nombre de una fila: pasa a "Tachados hoy", con el texto tachado y atenuado (CA-03, CA-04). Las otras filas no se mueven.
4. Recargar: sigue tachada (se guardó en la base).
5. Tocarla otra vez: vuelve a "Pendientes" y a su lugar original.
6. Tachar todo: "Pendientes" queda arriba con "Todo tachado. No queda nada pendiente."
7. Con algo tachado, buscarlo en el buscador y elegirlo: vuelve a "Pendientes" con cantidad 1.
8. DevTools → Network → la petición a `lists`: lleva `list_items.or=(checked_at.is.null,checked_at.gte.<medianoche local en UTC>)` (CA-05).

## 2. Recorrido de un toque (mapa del flujo)

Tocar la fila →
`components/ShoppingListRow.tsx` (`<button aria-pressed onClick={onToggleChecked}>`) →
`ShoppingList.tsx` (`renderRow` conecta `onToggleChecked={() => viewModel.onToggleChecked(id)}`) →
`hooks/useShoppingListViewModel.ts` `onToggleChecked`: busca el item, ignora si la fila está pendiente, calcula el estado nuevo `item.checkedAt === null` →
`hooks/useShoppingList.ts` `toggleChecked`: `dispatch(CHECK_TOGGLE_STARTED)` → `startTransition` → `setOptimisticCheck` (`useOptimistic`): **la fila ya se ve en la otra sección** →
`services/shopping-list.service.ts` `setItemChecked` → RPC `set_list_item_checked` →
base: `update list_items set checked_at = ...` → trigger `stamp_list_item_check` pone `now()` y `auth.uid()` → devuelve la fila →
`dispatch(CHECK_TOGGLED, checkedAt)` → `utils/shopping-list.reducer.ts` guarda la hora real → termina la transición y React deja de mostrar el valor optimista (ya coincide con el real).
Si la base falla: `CHECK_TOGGLE_FAILED` guarda el error; al terminar la transición React descarta el valor optimista y la fila vuelve sola.
En cada render el ViewModel calcula `pendingRows` / `checkedRows` filtrando por `isChecked` sobre los items que devuelve el hook (los optimistas).

## 3. Archivos que cambiaron

| Archivo | Qué hace |
|---|---|
| `supabase/migrations/015_check_list_items.sql` | Columnas `checked_at`/`checked_by`, trigger, grant, RPC `set_list_item_checked`, reabrir al añadir (buscador y recetas), lo comprado no cuenta en recetas |
| `supabase/tests/015_check_list_items.test.sql` | Prueba SQL de 015 en una transacción con `rollback` |
| `types/database.types.ts` | Tipos regenerados con las columnas y la RPC |
| `constants/shopping-list.constants.ts` | Textos de secciones y error, RPC, acciones del reducer, `checked_at` en la consulta |
| `models/*` | `checkedAt` en el item, `isChecked`/`canToggleChecked` en la fila, 3 acciones, `checkErrorMessage` |
| `utils/shopping-list.reducer.ts` | `CHECK_TOGGLE_STARTED` / `CHECK_TOGGLED` / `CHECK_TOGGLE_FAILED` |
| `utils/startOfLocalDay.ts` | Medianoche local en ISO (el "hoy") |
| `services/shopping-list.service.ts` | `setItemChecked`, filtro de "hoy" al cargar, `checkedAt` al añadir |
| `hooks/useShoppingList.ts` | `toggleChecked` (mismo patrón que `changeQuantity`) |
| `hooks/useShoppingListViewModel.ts` | `onToggleChecked`, secciones, reabrir desde el buscador |
| `components/ShoppingListRow.tsx` | El nombre y el tamaño son el botón de tachar |
| `components/ShoppingListSection.tsx` | Encabezado + `<ul>`, recibe las filas como `children` |
| `components/ShoppingListAllChecked.tsx` | El `<li>` de "Todo tachado" |
| `ShoppingList.tsx` | Dos secciones |
| `tests/*.test.ts`, `e2e/features/shopping-list/*` | 6 tests del reducer, 2 de la medianoche, E2E-LISTA-04 |

## 4. Decisiones X vs Y (las que más van a preguntar)

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| `useReducer` para la lista | `useState` por campo | Tachar agrega 3 acciones a las 9 que había. Todas las reglas quedan en una función pura que se testea sin React |
| La fila es un `<button>` y el detalle/cantidad/eliminar son **hermanos** | Envolver toda la fila en un botón, o `onClick` en el `<li>` | Un botón dentro de otro es HTML inválido y el click de "+" también tacharía. Un `<li>` con `onClick` no se puede enfocar con Tab ni activar con Enter |
| `aria-pressed` | Un checkbox escondido o `role="checkbox"` | CA-01 prohíbe el checkbox. `aria-pressed` le dice al lector de pantalla "presionado" sin dibujar nada |
| Una columna `checked_at` nullable | `is_checked boolean` + fecha | Con dos columnas puede quedar "no tachado con fecha". Con una sola no se pueden contradecir |
| Trigger que pone la hora y el usuario | Que el cliente los mande | Cualquiera puede llamar la API con la anon key: podría tachar con fecha vieja o a nombre de otro |
| La RPC recibe el estado deseado (`is_checked`) | Una RPC "toggle" | Si dos pestañas mandan "tachar", las dos quieren lo mismo; con toggle la segunda lo destacharía. Es al revés que la cantidad, donde cada toque sí suma (delta) |
| Tachado **optimista** con `useOptimistic` | Esperar a la base (como la cantidad) | Tachar es lo que más se toca y en el súper cada espera se nota. React muestra el valor optimista mientras dura la transición y lo descarta al terminar: si la base falla, la fila vuelve sin escribir rollback. La cantidad no es optimista porque el número final lo decide la base (suma de deltas) |
| Secciones **derivadas** de `checkedAt` | Dos arreglos en el estado | Un solo arreglo ordenado: destachar devuelve la fila a su lugar y no hay dos listas que se desincronicen |
| Medianoche local calculada en el navegador | `current_date` en la base | La base está en UTC: en Costa Rica su "hoy" cambia a las 6 p. m. |
| Reabrir una fila tachada al añadirla | Sumarle como antes | `unique (list_id, variant)` obliga a reusar la fila; si estaba tachada ayer, sumarle la dejaría escondida |
| `ShoppingListSection` con `children` | Pasarle los 5 handlers | Composición: la sección no necesita saber qué hace cada fila, y sirve para sublistas (CA-06) |

## 5. Conceptos nuevos

- **Trigger `before insert or update`**: función que corre antes de guardar cada fila y puede cambiar `new`. Ver `stamp_list_item_check` en 015: `old` es la fila antes y `new` la que se va a guardar.
- **Grant por columna**: `grant update (checked_at)` deja escribir esa columna y ninguna otra. Por eso un PATCH a `checked_by` da 42501.
- **`aria-pressed`**: botón de dos estados para lectores de pantalla.
- **Filtro sobre una tabla embebida** (PostgREST): `.or(..., { referencedTable: "list_items" })` filtra los items, no la lista.

## 6. Preguntas trampa (con respuesta)

<details><summary>"¿Dónde está el código que devuelve la fila si falla el tachado optimista?"</summary>

No existe (premisa falsa). `useOptimistic` solo muestra el valor optimista mientras dura la transición de `toggleChecked`. Si la base falla, el reducer nunca cambió `checkedAt`, así que al terminar la transición React vuelve a mostrar el valor confirmado. Lo prueba `tests/useShoppingList.test.ts`.
</details>

<details><summary>"Si es optimista, ¿para qué sigue deshabilitada la fila?"</summary>

Para que no viajen dos escrituras de la misma fila a la vez: podrían terminar en desorden y la base quedaría con la que llegó última, no con la que tocó el usuario. Es la regla de toda la lista (`pendingItemIds`, también para la cantidad).
</details>

<details><summary>"¿Por qué hay un `startTransition` dentro de otro?"</summary>

`useOptimistic` necesita una transición (la de afuera). Después de un `await`, React ya no sabe que el código sigue en esa transición, así que el `dispatch` del final se envuelve de nuevo para que sea parte de la misma.
</details>

<details><summary>"¿Por qué guardaste las secciones Pendientes y Tachados en el estado del reducer?"</summary>

No están en el estado (premisa falsa). El reducer guarda un solo arreglo `items`; las secciones se derivan en el ViewModel con dos `filter` por `isChecked`. Guardarlas sería estado duplicado que se puede desincronizar.
</details>

<details><summary>"¿Por qué el cliente manda la hora en que se tachó?"</summary>

No la manda (premisa falsa). El cliente solo manda `is_checked`. La hora (`now()`) y el usuario (`auth.uid()`) los pone el trigger en la base, y aunque alguien mande una fecha con un PATCH directo, el trigger la reemplaza. Lo prueba `supabase/tests/015_check_list_items.test.sql`.
</details>

<details><summary>"¿Por qué usaste un `useEffect` para mover la fila de sección?"</summary>

No hay `useEffect` para eso (premisa falsa). Mover es consecuencia de `CHECK_TOGGLED` en el reducer más la derivación en el ViewModel en cada render. El único `useEffect` de `useShoppingList` es la carga inicial.
</details>

<details><summary>"¿Qué pasa si toco la fila dos veces muy rápido?"</summary>

El primer toque hace `CHECK_TOGGLE_STARTED`: el id entra a `pendingItemIds`, `canToggleChecked` pasa a `false` y el botón queda `disabled`. El segundo toque no hace nada. Además `onToggleChecked` revisa `pendingItemIds` por si acaso.
</details>

<details><summary>"Si tacho algo hoy y mañana lo vuelvo a añadir, ¿se suma a lo de ayer?"</summary>

No. `add_item_to_general_list` (015) ve que la fila está tachada y la reabre con cantidad 1 y `checked_at = null`. Lo mismo `add_units_to_list_item` cuando viene de una receta. Y la receta no cuenta lo comprado como "ya en la lista".
</details>

<details><summary>"¿Por qué no reusaste `ItemRow` de `components/ui`?"</summary>

`ItemRow` dibuja un checkbox (CA-01 lo prohíbe) y es un `<button>` que envuelve toda la fila, así que la cantidad, el detalle y eliminar quedarían anidados.
</details>

## 7. Drills de cambio en vivo

| Pedido | Dónde | Meta |
|---|---|---|
| "Cambia el texto 'Tachados hoy' por 'Comprados hoy'" | `constants/shopping-list.constants.ts` `CHECKED_SECTION` (y el E2E, que lo fija por su cuenta) | 1 min |
| "Que lo tachado no se tache, solo se atenúe" | `components/ShoppingListRow.tsx` `checkedTextClass`: quitar `line-through` | 1 min |
| "Que 'Tachados hoy' quede arriba" | `ShoppingList.tsx`: mover el bloque de `hasCheckedRows` antes del de Pendientes | 2 min |
| "Que no se pueda eliminar algo tachado" | `useShoppingListViewModel.ts` en `rows`: `canRemove: !isPending && item.checkedAt === null` | 3 min |
| "Que las tachadas vayan ordenadas por hora de tachado" | `useShoppingListViewModel.ts`: `checkedRows` con `.toSorted((a, b) => (a.item.checkedAt ?? "").localeCompare(b.item.checkedAt ?? ""))`; explicar que rompe "vuelve a su lugar" solo dentro de Tachados | 5 min |

## 8. Puntos débiles

Se llena en el simulacro.
