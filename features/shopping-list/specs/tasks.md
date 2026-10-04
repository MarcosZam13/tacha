# Tareas: lista general

Deriva de [plan.md](plan.md). Cada tarea se valida antes de pasar a la siguiente. Las tareas 1-8 son SCRUM-62; la 9 es SCRUM-63 (rama propia, sale de `develop` cuando SCRUM-62 esté mergeado).

## SCRUM-62: buscar y añadir

- [x] 1. Constantes de la feature (`constants/shopping-list.constants.ts`).
- [x] 2. Modelos: item, resultado de búsqueda aplanado, acciones del reducer.
- [x] 3. Migración `004_create_lists.sql` (tablas, RLS, RPC) y aplicarla.
- [x] 4. Cliente de Supabase + sesión anónima (`services/supabase.client.ts`).
- [x] 5. Servicios en `features/shopping-list/services/`: `catalog.service.ts` (búsqueda) y `shopping-list.service.ts` (cargar, añadir).
- [x] 6. Reducer puro + `useShoppingList` (carga inicial, añadir).
- [x] 7. `useProductSearch` (debounce + descartar respuestas viejas) y `useShoppingListViewModel`.
- [x] 8. Presentación: `ProductSearch`, `ShoppingListRow` (sin controles aún), `ShoppingListEmptyState`, `ShoppingList`, ruta `app/lista/page.tsx`. Validar CA-01..04 de HU-36a; `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## SCRUM-120: buscador compartido

- [x] 12. Mover `useProductSearch`, `searchCatalog`, `ProductSearch` y sus constantes/tipos a `hooks/`, `services/`, `components/product-search/`, `constants/catalog.constants.ts` y `types/catalog.types.ts`. El servicio devuelve productos madre; la lista los aplana en `utils/toCatalogSearchResults.ts`. Sin cambio de comportamiento: validar de nuevo CA-01..04 de HU-36a; `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Pendiente cuando el proyecto tenga runner de tests

- [ ] Tests unitarios de `utils/shopping-list.reducer.ts` (función pura) y de `hooks/useProductSearch.ts` (debounce y descarte de respuestas viejas), según unit-testing-standards.

## SCRUM-63: ajustar cantidad

- [x] 9. Migración `005_change_item_quantity.sql` (RPC con delta) y aplicarla; regenerar `types/database.types.ts`.
- [x] 10. `changeItemQuantity()` en el servicio; acciones `QUANTITY_CHANGE_STARTED` / `QUANTITY_CHANGED` / `QUANTITY_CHANGE_FAILED` y `pendingItemIds` en el reducer; `changeQuantity` en `useShoppingList` y el ViewModel.
- [x] 11. `QuantityStepper` dentro de `ShoppingListRow`. Validar CA-01..04 de HU-36b; `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## SCRUM-64: ver detalle de producto

- [x] 13. Constantes (consulta del detalle, textos, formato de moneda) y modelos `ItemDetail`, `ItemDetailViewModel`.
- [x] 14. `getItemDetail()` en el servicio y utils puros `toStorePriceRanges` y `formatPriceRange`.
- [x] 15. `useItemDetail` (pide al cambiar el `variantId`, descarta respuestas viejas, carga derivada) y la fila abierta en el ViewModel.
- [x] 16. Botón de detalle en `ShoppingListRow`, `ShoppingListItemDetail` dentro del `Modal`. Validar CA-01..02 de HU-36c; `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## SCRUM-65: eliminar producto

- [x] 17. Migración `012_delete_list_items.sql` (política de borrado del dueño) y aplicarla; verificar con otro `sub` que borra 0 filas.
- [x] 18. Constantes (duración del toast, textos, acciones del reducer) y `deleteListItem()` en el servicio.
- [x] 19. Reducer: `ITEM_REMOVED` y `REMOVE_FAILED`; `removeItem` en `useShoppingList`.
- [x] 20. `useItemRemoval` (item pendiente, temporizador, deshacer, borrar el anterior, borrar al salir) y su uso en el ViewModel.
- [x] 21. Botón de eliminar en `ShoppingListRow` y `UndoToast`. Validar CA-01..03 de HU-36d; `npx tsc --noEmit`, `npm run lint`, `npm run build`.

Tareas 1, 2, 6 (reducer) y la parte de búsqueda de 5 y 7 no dependen de la base nueva y se pueden adelantar.
