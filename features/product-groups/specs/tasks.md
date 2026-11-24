# Tasks: ProductGroups

## SCRUM-109 — HU-72 Ver "Mis grupos"

### 1. Base
- [X] 1.1 `supabase/migrations/054_create_product_groups.sql`
- [X] 1.2 `supabase/tests/054_create_product_groups.test.sql`
- [X] 1.3 Aplicar 054 en la base compartida (archivo + fila en `supabase_migrations.schema_migrations`) y correr la prueba
- [X] 1.4 Regenerar `types/database.types.ts` (solo se agregaron los bloques de `product_groups` y `product_group_items` de la salida generada: la base ya tiene objetos de otras PRs sin mergear)

### 2. Constantes, modelos, servicio
- [X] 2.1 `APP_ROUTE.LIST_GROUPS`
- [X] 2.2 `features/product-groups/constants/product-groups.constants.ts`
- [X] 2.3 `models/product-groups.interfaces.ts`
- [X] 2.4 `services/product-groups.service.ts` (`listProductGroups`) y `utils/toProductGroupCards.ts`

### 3. ViewModel y UI
- [X] 3.1 `hooks/useProductGroupsViewModel.ts`
- [X] 3.2 `components/ProductGroupCard.tsx`
- [X] 3.3 `components/ProductGroupsEmptyState.tsx`
- [X] 3.4 `ProductGroups.tsx` + `app/(app)/lista/grupos/page.tsx`
- [X] 3.5 "Gestionar mis grupos" en `ShoppingListInner.tsx`

### 4. Tests
- [X] 4.1 `tests/product-groups.service.test.ts`
- [X] 4.2 `tests/ProductGroups.page.ts` + `tests/ProductGroups.test.tsx`
- [X] 4.3 E2E `E2E-GRUPOS-01` y `-02` (necesita 054 aplicada)

### 5. Cierre
- [X] 5.1 Validar contra SPEC §13, casos 1-6
- [X] 5.2 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`
- [X] 5.3 Revisiones: `code-reviewer`, `security-reviewer`, `qa-checker`
- [X] 5.4 `docs/documento-proyecto.md` §6: tablas implementadas
- [X] 5.5 Descripción de la PR y paso a `waiting qa`

### 6. Ronda 1 de QA (qa denied)
- [X] 6.1 BUG-1: un nombre de 60 caracteres sin espacios desbordaba la tarjeta y la página. `min-w-0` en el `<li>` y `break-words` en el nombre (`ProductGroupCard.tsx`)
- [X] 6.2 Merge de `develop` (SCRUM-108): se conservan `LIST_GROUPS` y `LIST_SETTINGS` y todos los imports
- [X] 6.3 TC-07 y TC-09 reescritos en la PR: TC-07 corta la red con la app ya cargada; TC-09 suma un nombre con espacios
- [X] 6.4 `tsc`, lint, `npm test`, build; E2E-GRUPOS-01/02 y regresión de lista y shell
- [X] 6.5 Descripción de la PR actualizada y paso a `waiting qa`

## SCRUM-111 — HU-74 Agregar un grupo a la lista

> El código se arma sin la 110; el E2E, la QA y el merge esperan a que esté en `develop`.

### 14. Arranque
- [X] 14.1 Re-verificar: PR propia `in progress` = ninguna; próximo número de migración (057); `add_units_to_list_item` y `ensure_general_list_id` sin cambios (base, 2026-11-24).
- [X] 14.2 Rama `ticket/SCRUM-111-add-group-to-list` desde `develop`; PR con `in progress`.
- [ ] 14.3 Acordar con el grupo el número de migración (057) ANTES de crear el archivo; nueva forma de llenar la lista general (Marcos/Roberto: lista y faltantes; aclarar que no escribe `list_item_recipe_requirements`).
- [ ] 14.4 Sección HU-74 en SPEC/plan/tasks/E2E del equipo.

### 15. Base
- [X] 15.1 `057_add_group_to_general_list.sql`.
- [X] 15.2 Prueba SQL: sin sesión 42501; grupo ajeno P0002; lista vacía → N filas con sus cantidades; misma variante pendiente → suma; dos veces → doble; otra variante → fila aparte; tachada → fila nueva; archivado → `skipped`; miembro con grupo compartido → lista de la familia; 0 filas en `list_item_recipe_requirements`.
- [X] 15.3 Daniel autoriza → aplicar (SQL del archivo + fila en `supabase_migrations.schema_migrations`, en una transacción); correr prueba; regenerar tipos.

### 16. Código
- [X] 16.1 Constantes y `addGroupToList` en el servicio.
- [X] 16.2 `useProductGroupListAddition.ts`.
- [X] 16.3 Botón en `ProductGroupCard` + `ProductGroupAddResult`.
- [X] 16.4 Cablear en `useProductGroupsViewModel` y `ProductGroups.tsx`.

### 17. Tests
- [X] 17.1 Servicio y hook (adding/added/error, mensaje con saltados).
- [X] 17.2 Vista con Page Object (botón deshabilitado mientras agrega, link "Ver lista").
- [ ] 17.3 E2E: E2E-GRUPOS-06 (con la 110 en `develop`: crear grupo → agregar → filas en `/lista`), -07 (misma presentación suma), -08 (otra presentación, fila aparte).

### 18. Cierre
- [ ] 18.1 Validar SPEC §13 casos 1-8.
- [X] 18.2 `docs/DESIGN.md` §7.6: corregir lo de "reconciliación".
- [ ] 18.3 tsc, lint, test, build (Daniel autoriza).
- [ ] 18.4 `code-reviewer`, `security-reviewer` (RPC sobre listas compartidas), `qa-checker`.
- [ ] 18.5 Body de la PR → `waiting qa`; Jira (Daniel).
- [ ] 18.6 Actualizar should-know y progress.
