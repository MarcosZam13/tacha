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

- [x] Tests unitarios de `utils/shopping-list.reducer.ts` (función pura): `tests/shopping-list.reducer.test.ts`, SCRUM-128.
- [ ] Tests de `hooks/useProductSearch.ts` (debounce y descarte de respuestas viejas), con fake timers, según unit-testing-standards.

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

## SCRUM-66: tachar/destachar producto

- [x] 22. Migración `015_check_list_items.sql` (aplicada por Marcos con su fila `015`) (columnas, trigger, grant, RPC, reabrir en `add_item_to_general_list` y `add_units_to_list_item`, lo tachado no cuenta en `add_recipe_to_general_list`).
- [x] 22b. Prueba `supabase/tests/015_check_list_items.test.sql` (pasó en un ensayo antes de aplicar 015). **No se aplica sola:** se avisa al grupo y la aplica Marcos en una transacción con su fila `015` (`supabase/README.md#migraciones`). Bloquea la 28 (prueba en el navegador).
- [x] 23. `types/database.types.ts` a mano (columnas y RPC nuevas); regenerados con el MCP después de aplicar 015: lo escrito a mano coincide; se agregaron `add_units_to_list_item` y `pick_recipe_variant`, que faltaban desde 013.
- [x] 24. Constantes (textos de secciones y error, RPC, acciones) y modelos (`checkedAt`, acciones, `checkErrorMessage`).
- [x] 25. Reducer: `CHECK_TOGGLE_STARTED` / `CHECK_TOGGLED` / `CHECK_TOGGLE_FAILED`, con tests primero en `tests/shopping-list.reducer.test.ts`.
- [x] 26. Servicio: `setItemChecked()`, `checked_at` en la carga y en añadir, filtro de "hoy" con `utils/startOfLocalDay.ts` (con test).
- [x] 27. `toggleChecked` en `useShoppingList`; secciones, `onToggleChecked` y reabrir al añadir en el ViewModel.
- [x] 28. Presentación: botón de tachar en `ShoppingListRow`, `ShoppingListSection`, dos secciones en `ShoppingList`. Validar CA-01..05 de HU-36e en el navegador con una cuenta QA; `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test`.
- [x] 30. Tachado optimista (`useOptimistic`, 2026-10-09): test del hook primero (se ve antes de la respuesta, vuelve si falla), después `useShoppingList`. Repetir `tsc`, lint, build, tests y E2E-LISTA-04.
  - Hecho: test del hook, implementación, `tsc`, lint, build, 83 tests unitarios y prueba manual (tachar, destachar y que se guarde). E2E: 6/6 dos veces seguidas con el servidor ya compilado (2026-10-09), después de que se liberó el límite de Supabase.
- [x] 29. E2E: escenario E2E-LISTA-04 en `specs/E2E.md` y su test (pasa en chromium y mobile-chrome). Pendiente: repetir la prueba manual con una cuenta QA cuando exista el ambiente de pruebas.

Tareas 1, 2, 6 (reducer) y la parte de búsqueda de 5 y 7 no dependen de la base nueva y se pueden adelantar.
