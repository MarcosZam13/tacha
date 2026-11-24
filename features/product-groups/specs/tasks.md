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

## SCRUM-110 — HU-73 Crear un grupo de productos

### 7. Arranque
- [X] 7.1 Re-verificar: estado de las PRs #111 (89), #112 (109) y #101 (búsqueda); próximo número de migración libre en la base y en las ramas
- [X] 7.2 Rama `ticket/SCRUM-110-create-product-group` desde `develop`; PR con `on hold` mientras 109 y 89 no estén mergeadas
- [X] 7.3 Avisar al grupo: migración `056`, función de búsqueda nueva (`search_catalog` no cambia), parámetro opcional en `useProductSearch`, `delete_personal_product` cuenta grupos
- [X] 7.4 Con 109 en `develop`: secciones HU-73 en `SPEC.md`, `plan.md`, `tasks.md` y `E2E.md`

### 8. Refactor (commit aparte, sin cambio de comportamiento)
- [X] 8.1 Promover `features/shopping-list/utils/toCatalogSearchResults.ts` a `utils/` (mismo nombre) y `CatalogSearchResult` a `types/catalog.types.ts`; actualizar la lista general; test del util
- [X] 8.2 `useProductSearch(searchFn = searchCatalog)`; los tests existentes siguen verdes y se suma uno para la función inyectada

### 9. Base
- [X] 9.1 `supabase/migrations/056_create_product_group.sql` (plan, "Datos" 1-4)
- [X] 9.2 `supabase/tests/056_create_product_group.test.sql`:
  - búsqueda: global sí, mío sí, de mi familia sí, personal ajeno no, archivado no, menos de 2 letras vacío, `is_personal` correcto, `anon` sin permiso
  - `create_product_group`: sin sesión `42501`; nombre vacío o de 61; 0 o 51 productos; cantidad 0, 100 o con decimales; variante repetida → `22023`; variante ajena o archivada → `P0002`; sin familia + compartir → personal; con familia sin compartir → personal; compartiendo → familia; compartiendo con un producto personal sin compartir → `22023` (regla 7); con uno compartido de la familia → OK; `owner_id` = quien llama; posiciones en orden
  - 052 ampliada: un producto en un grupo → `archived` y `group_count = 1`; uno sin uso → `deleted`
- [X] 9.3 Con 109 y 89 mergeadas y autorización de Daniel: aplicar `056` con su fila del historial en una transacción; correr la prueba; agregar los tipos a mano
- [X] 9.4 `supabase/seed-demo-groups.sql` (mismo patrón que `seed-demo-recipes.sql`): un usuario de demo, 3 grupos con productos curados (uno compartido si tiene familia, uno con nombre largo), marcados con fecha `2000-01-01`, idempotente. Se corre solo si Daniel lo decide

### 10. Servicios y lógica pura
- [X] 10.1 `CATALOG_DB.RPC.SEARCH_CATALOG_INCLUDING_OWN` + `searchCatalogIncludingOwn` (+ `sortBySearchRelevance` si #101 ya está en `develop`)
- [X] 10.2 `product-group-editor.constants.ts` (`PRODUCT_GROUP_LIMIT`: nombre 60, productos 50, cantidad 1-99; textos; estados; acciones)
- [X] 10.3 `utils/validateProductGroupForm.ts`
- [X] 10.4 `utils/product-group-editor.reducer.ts` (reducer puro) + `utils/toProductGroupItemLabel.ts`; el hook `useProductGroupEditor` va con la 11
- [X] 10.5 `createProductGroup(values)` en el servicio de la feature. Si la base rechaza, se muestra el mensaje genérico de guardado: el cliente ya valida las mismas reglas

### 11. ViewModel y UI (con 109 en `develop`)
- [X] 11.1 `useProductGroupEditorViewModel.ts`: búsqueda, filas, compartir con `hasHousehold`, guardar, `useReportUnsavedChanges`
- [X] 11.2 `ProductGroupItemRow.tsx` y `ProductGroupEditorActions.tsx`, con sus props en `models/`
- [X] 11.3 `ProductGroupEditor.tsx` + `app/(app)/lista/grupos/nuevo/page.tsx` + `APP_ROUTE.LIST_GROUP_NEW`
- [X] 11.4 "+ Crear grupo" en `ProductGroups.tsx` y "Crear tu primer grupo" en el estado vacío
- [X] 11.5 "Mis productos" (con 89 en `develop`): el aviso de eliminar suma los grupos (`group_count`)

### 12. Tests
- [X] 12.1 Unitarios puros: reducer y validación
- [X] 12.2 Servicios: `searchCatalogIncludingOwn`, `createProductGroup` (RPC y errores)
- [X] 12.3 Editor con Page Object (casos 8, 10, 11, 12 y 15)
- [X] 12.4 "Mis productos": aviso con grupos (caso 17)
- [X] 12.5 `E2E-GRUPOS-03` a `-05`; regresión de "Mis productos" y de la lista general

### 13. Cierre
- [X] 13.1 Validar contra SPEC §13, casos 7 a 17
- [X] 13.2 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`
- [X] 13.3 Subagentes `code-reviewer`, `security-reviewer` (RPC `security definer`) y `qa-checker`
- [X] 13.4 `docs/documento-proyecto.md` §4.11 y §6
- [X] 13.5 Descripción de la PR y paso a `waiting qa`

## SCRUM-111 — HU-74 Agregar un grupo a la lista

> El código se armó sin la 110; con la 110 en `develop` se mergeó develop en la rama y se agregó el E2E.

### 14. Arranque
- [X] 14.1 Re-verificar: PR propia `in progress` = ninguna; próximo número de migración (057); `add_units_to_list_item` y `ensure_general_list_id` sin cambios (base, 2026-11-24).
- [X] 14.2 Rama `ticket/SCRUM-111-add-group-to-list` desde `develop`; PR con `in progress`.
- [ ] 14.3 Acordar con el grupo el número de migración (057) ANTES de crear el archivo; nueva forma de llenar la lista general (Marcos/Roberto: lista y faltantes; aclarar que no escribe `list_item_recipe_requirements`).
- [X] 14.4 Sección HU-74 en SPEC/plan/tasks/E2E del equipo.

### 15. Base
- [X] 15.1 `057_add_group_to_general_list.sql`.
- [X] 15.2 Prueba SQL: sin sesión 42501; grupo ajeno P0002; lista vacía → N filas con sus cantidades; misma variante pendiente → suma; dos veces → doble; otra variante → fila aparte; tachada → fila nueva; archivado → `skipped`; miembro con grupo compartido → lista de la familia; 0 filas en `list_item_recipe_requirements`.
- [X] 15.3 Daniel autoriza → aplicar (SQL del archivo + fila en `supabase_migrations.schema_migrations`, en una transacción); correr prueba; regenerar tipos.

### 16. Código
- [X] 16.1 Constantes y `addGroupToList` en el servicio.
- [X] 16.2 `useProductGroupListAddition.ts`.
- [X] 16.3 Botón en `ProductGroupCard` + `ProductGroupAddToListResult`.
- [X] 16.4 Cablear en `useProductGroupsViewModel` y `ProductGroups.tsx`.

### 17. Tests
- [X] 17.1 Servicio y hook (adding/added/error, mensaje con saltados).
- [X] 17.2 Vista con Page Object (botón deshabilitado mientras agrega, link "Ver lista").
- [X] 17.3 E2E-GRUPOS-06 (con la 110 en `develop`): crear grupo → agregar → filas en `/lista` → agregar otra vez suma sin filas nuevas. La otra presentación en fila aparte (CA-03) queda en la prueba SQL de la 057.

### 18. Cierre
- [ ] 18.1 Validar SPEC §13 casos 18-25.
- [X] 18.2 `docs/DESIGN.md` §7.6: corregir lo de "reconciliación".
- [X] 18.3 tsc, lint, test, build (Daniel autoriza).
- [ ] 18.4 `code-reviewer`, `security-reviewer` (RPC sobre listas compartidas), `qa-checker`.
- [ ] 18.5 Body de la PR → `waiting qa`; Jira (Daniel).
- [ ] 18.6 Actualizar should-know y progress.
