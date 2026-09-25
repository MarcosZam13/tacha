# Tareas: lista general

Deriva de [plan.md](plan.md). Cada tarea se valida antes de pasar a la siguiente. Las tareas 1-8 son SCRUM-62; la 9 es SCRUM-63 (rama propia, sale de `develop` cuando SCRUM-62 esté mergeado).

## SCRUM-62: buscar y añadir

- [x] 1. Constantes de la feature (`constants/shopping-list.constants.ts`).
- [ ] 2. Modelos: item, resultado de búsqueda aplanado, acciones del reducer.
- [ ] 3. Migración `004_create_lists.sql` (tablas, RLS, RPC) y aplicarla. *Bloqueado: acceso a la base.*
- [ ] 4. Cliente de Supabase + sesión anónima (`services/supabase.client.ts`). *Bloqueado: sesiones anónimas habilitadas.*
- [ ] 5. Servicios: `catalog.service.ts` (búsqueda) y `shopping-list.service.ts` (cargar, añadir).
- [ ] 6. Reducer puro + `useShoppingList` (carga inicial, añadir).
- [ ] 7. `useProductSearch` (debounce + descartar respuestas viejas) y `useShoppingListViewModel`.
- [ ] 8. Presentación: `ProductSearch`, `ShoppingListRow` (sin controles aún), `ShoppingListEmptyState`, `ShoppingList`, ruta `app/lista/page.tsx`. Validar CA-01..04 de HU-36a; `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## SCRUM-63: ajustar cantidad

- [ ] 9. `updateQuantity()` en el servicio, acción `quantityChanged` en el reducer, `QuantityStepper` dentro de `ShoppingListRow`. Validar CA-01..04 de HU-36b.

Tareas 1, 2, 6 (reducer) y la parte de búsqueda de 5 y 7 no dependen de la base nueva y se pueden adelantar.
