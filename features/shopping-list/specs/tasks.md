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

## Pendiente cuando el proyecto tenga runner de tests

- [ ] Tests unitarios de `utils/shopping-list.reducer.ts` (función pura) y de `useProductSearch` (debounce y descarte de respuestas viejas), según unit-testing-standards.

## SCRUM-63: ajustar cantidad

- [ ] 9. `updateQuantity()` en el servicio, acción `quantityChanged` en el reducer, `QuantityStepper` dentro de `ShoppingListRow`. Validar CA-01..04 de HU-36b.

Tareas 1, 2, 6 (reducer) y la parte de búsqueda de 5 y 7 no dependen de la base nueva y se pueden adelantar.
