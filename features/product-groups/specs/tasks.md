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
- [ ] 5.5 Descripción de la PR y paso a `waiting qa`
