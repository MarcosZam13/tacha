# Plan: ProductGroups

## HU-72 — Ver "Mis grupos" (SCRUM-109)

### Archivos

| Archivo | Nuevo/toca | Responsabilidad |
|---|---|---|
| `supabase/migrations/054_create_product_groups.sql` | nuevo | Tablas, índices, checks, RLS de lectura, permisos |
| `supabase/tests/054_create_product_groups.test.sql` | nuevo | Visibilidad, permisos, checks y cascadas (transacción + rollback) |
| `types/database.types.ts` | toca | Regenerado después de aplicar 054 |
| `constants/routes.constants.ts` | toca | `APP_ROUTE.LIST_GROUPS = "/lista/grupos"` |
| `app/(app)/lista/grupos/page.tsx` | nuevo | Solo ruta + `metadata` |
| `features/product-groups/ProductGroups.tsx` | nuevo | Vista: volver, título, estados, grilla |
| `features/product-groups/components/ProductGroupCard.tsx` (+ props) | nuevo | `group-card`: nombre, conteo, "Compartido" |
| `features/product-groups/components/ProductGroupsEmptyState.tsx` | nuevo | CA-02 |
| `features/product-groups/constants/product-groups.constants.ts` | nuevo | `PRODUCT_GROUPS_DB`, `PRODUCT_GROUPS_STATUS`, `PRODUCT_GROUP_COUNT_LABEL`, `PRODUCT_GROUPS_TEXT` |
| `features/product-groups/models/product-groups.interfaces.ts` | nuevo | `ProductGroupSummary`, `ProductGroupCardData`, `ProductGroupsViewModel` |
| `features/product-groups/services/product-groups.service.ts` | nuevo | `listProductGroups()` |
| `features/product-groups/utils/toProductGroupCards.ts` | nuevo | Adapter: resumen → tarjeta ("1 producto" / "N productos") |
| `features/product-groups/hooks/useProductGroupsViewModel.ts` | nuevo | Carga al montar + `reload` |
| `features/product-groups/tests/*` | nuevo | Servicio y vista (Page Object) |
| `features/shopping-list/ShoppingListInner.tsx` + constantes | toca | Link "Gestionar mis grupos" en la cabecera |
| `e2e/features/product-groups/*` | nuevo | `E2E-GRUPOS-01`, `-02` |
| `docs/documento-proyecto.md` §6 | toca | Tablas implementadas (054) |

### Datos
- `product_groups` y `product_group_items` según SPEC §12.
- Índices: `product_groups(owner_id)`, `product_groups(household_id)`, `product_group_items(product_catalog_variant_id)` (lo usará el chequeo de "producto en uso" al eliminar un producto personal). El `unique (group_id, product_catalog_variant_id)` ya cubre la FK de `group_id`.
- RLS activada en las dos; `revoke all` a `public, anon, authenticated` y `grant select` a `authenticated` (patrón de `027_spending_budgets.sql`). Una política de lectura por tabla, ninguna de escritura.
- Sin trigger de `updated_at`: no existe una función genérica en el esquema, y el único camino de escritura van a ser las funciones de HU-73/HU-75, que lo fijan.

### Flujo
`/lista` → "Gestionar mis grupos" → `/lista/grupos` → `useProductGroupsViewModel` → `listProductGroups()` (`ensureSession` + PostgREST, la RLS filtra) → `toProductGroupCards` → `ProductGroups` dibuja el estado.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Ruta `/lista/grupos` | Ítem propio en el menú | `docs/DESIGN.md` §3.1: no es destino de navegación primario. Con `isRouteActive`, "General" queda marcado solo |
| Mismo predicado de RLS que `lists` | Solo el dueño | `docs/documento-proyecto.md` §4.11 pide el patrón de listas; si no, compartir con la familia (HU-73 CA-03) no tendría efecto |
| Solo políticas de lectura; escribir por funciones | Políticas de INSERT/UPDATE | Una política de UPDATE no ve el valor anterior: no puede impedir que un miembro se ponga como dueño y después deje de compartir el grupo |
| `household_id` con `on delete set null` | `cascade` (como `lists`) o sin FK (como `recipes`) | Si la familia se borra, los grupos no se pierden: vuelven a su dueño, igual que recetas y planes (`release_household_personal_data`) |
| Items ligados a la presentación (variante) con cantidad entera | Ligados al producto con medida (como `recipe_ingredients`) | Un producto de grupo ya es una unidad de compra (`docs/documento-proyecto.md` §6); se agrega a la lista sin convertir nada |
| `count` embebido de PostgREST | RPC `list_product_groups` | Una sola consulta con la RLS aplicada; no hay lógica que justifique una función |
| `ensureSession()` antes de leer | Leer con la sesión que haya | Entrando directo a `/lista/grupos` puede no haber sesión todavía y la consulta saldría como `anon` |
| Sin botón de crear en esta historia | Botón que lleva a una ruta que todavía no existe | No dejar links rotos entre PRs |

## HU-73 — Crear un grupo de productos (SCRUM-110)

### Archivos

| Archivo | Nuevo/toca | Responsabilidad |
|---|---|---|
| `supabase/migrations/056_create_product_group.sql` | nuevo | `search_catalog_including_own`, `create_product_group`; `get_personal_product_usage` y `delete_personal_product` cuentan grupos |
| `supabase/tests/056_create_product_group.test.sql` | nuevo | Prueba de las 4 piezas (transacción + rollback) |
| `supabase/seed-demo-groups.sql` | nuevo | Grupos de ejemplo para un usuario de demo (no es migración) |
| `types/database.types.ts` | toca | Bloques de las 2 funciones nuevas y del retorno nuevo de `get_personal_product_usage`, a mano (como en 054) |
| `utils/toCatalogSearchResults.ts` | mueve | Antes en `features/shopping-list/utils/`: una opción por variante. Refactor aparte, mismo nombre |
| `types/catalog.types.ts` | toca | `CatalogSearchResult` (antes en `features/shopping-list/models/`); `isPersonal` opcional en `CatalogProduct` y en `CatalogSearchResult` |
| `hooks/useProductSearch.ts` | toca | Parámetro opcional `searchFn` (por defecto `searchCatalog`) |
| `constants/catalog.constants.ts` | toca | `CATALOG_DB.RPC.SEARCH_CATALOG_INCLUDING_OWN` |
| `services/catalog.service.ts` | toca | `searchCatalogIncludingOwn(term)`, reusa `toCatalogProducts` |
| `constants/routes.constants.ts` | toca | `APP_ROUTE.LIST_GROUP_NEW = "/lista/grupos/nuevo"` |
| `app/(app)/lista/grupos/nuevo/page.tsx` | nuevo | Solo ruta + `metadata` → `<ProductGroupEditor />` |
| `features/product-groups/constants/product-group-editor.constants.ts` | nuevo | `PRODUCT_GROUP_LIMIT`, `PRODUCT_GROUP_EDITOR_TEXT`, `PRODUCT_GROUP_EDITOR_STATUS`, acciones del reducer |
| `features/product-groups/models/product-group-editor.interfaces.ts` + `.types.ts` | nuevo | `ProductGroupEditorItem`, `ProductGroupEditorValues`, `ProductGroupEditorErrors`, `ProductGroupEditorState`; unión de acciones |
| `features/product-groups/utils/validateProductGroupForm.ts` | nuevo | Reglas 1, 2 y 7 (las mismas que la base); la 3 y el tope de 50 los garantiza el reducer |
| `features/product-groups/utils/product-group-editor.reducer.ts` | nuevo | Reducer puro del grupo en armado (agregar o sumar, quitar, cambiar cantidad, errores, guardado), mismo patrón que `recipe-editor.reducer.ts` |
| `features/product-groups/utils/toProductGroupItemLabel.ts` | nuevo | "Leche — 1 L" para anuncios y nombres accesibles |
| `features/product-groups/hooks/useProductGroupEditor.ts` | nuevo | `useReducer` + guardar (como `useRecipeEditor`) |
| `features/product-groups/hooks/useProductGroupEditorViewModel.ts` | nuevo | Fachada: nombre, filas, búsqueda, compartir, guardar, cambios sin guardar |
| `features/product-groups/ProductGroupEditor.tsx` | nuevo | Vista del editor (HU-75 la reutiliza para editar) |
| `features/product-groups/components/ProductGroupItemRow.tsx` (+ props) | nuevo | Fila compacta: nombre, tamaño, stepper, "Quitar" |
| `features/product-groups/components/ProductGroupEditorActions.tsx` (+ props) | nuevo | "Guardar grupo" / "Cancelar" |
| `features/product-groups/services/product-groups.service.ts` | toca | `createProductGroup(draft)` |
| `features/product-groups/constants/product-groups.constants.ts` | toca | `PRODUCT_GROUPS_DB.RPC.CREATE_PRODUCT_GROUP`, textos de los botones de crear |
| `features/product-groups/ProductGroups.tsx`, `components/ProductGroupsEmptyState.tsx` | toca | "+ Crear grupo" y "Crear tu primer grupo" |
| `features/my-products/...` (aviso de uso) | toca | El aviso de eliminar suma los grupos |
| `features/product-groups/tests/*`, `utils/tests/*`, `services/tests/*` | nuevo/toca | Unitarios |
| `e2e/features/product-groups/*` | toca | `E2E-GRUPOS-03` a `-05` |
| `docs/documento-proyecto.md` §4.11 y §6 | toca | Crear grupo implementado; función de búsqueda nueva |

### Datos: migración 056
1. **`search_catalog_including_own`**: copia de `search_catalog` (031) con la misma forma de retorno, la misma agregación de marcas y precios y el mismo mínimo de 2 caracteres. Cambios:
   - En `matching_products`, `where pc.archived_at is null` en lugar de `pc.household_id is null and pc.owner_id is null`.
   - Cada producto devuelve además `is_personal = (pc.owner_id is not null)`.
   - Es invoker y `stable`: la RLS de `product_catalog` (032) ya limita a global + mío + mi familia.
   - Ejecución solo para `authenticated`. Los usuarios anónimos de Supabase entran como `authenticated`; sin sesión no hay productos propios.
2. **`create_product_group`** (`security definer`, `search_path = ''`):
   - `auth.uid()` nulo → `42501`.
   - Nombre (btrim, 1-60), `jsonb_array_length` entre 1 y 50, cada `quantity` entre 1 y 99 y entera, sin `variant_id` repetidos → `22023`.
   - Cada variante tiene que existir, con su producto sin archivar y visible para el usuario (global, `owner_id` = él, o `household_id` = su familia). Como `security definer` se saltea la RLS, la visibilidad se valida a mano → `P0002`.
   - `household_id` = su familia si pidió compartir y es miembro; si no, `null`.
   - Regla 7: si queda compartido, ninguna variante puede ser de un producto con `owner_id` no nulo → `22023`, con los nombres en el mensaje.
   - Inserta el grupo (`updated_at = now()`) y los items (`position` = índice en el array). Devuelve el `id`.
3. **`get_personal_product_usage`**: `drop` + `create`, porque cambia el tipo de retorno. Agrega `group_count = count(distinct pgi.group_id)` de los items que apuntan a variantes del producto. Mismos grants que en la 052.
4. **`delete_personal_product`**: `create or replace` (misma firma), con un `or exists` más sobre `product_group_items` en `is_in_use`.

### Flujo
1. "+ Crear grupo" lleva a `/lista/grupos/nuevo`.
2. `useProductGroupEditorViewModel` arma la búsqueda: `useProductSearch(searchCatalogIncludingOwn)` → `toCatalogSearchResults`.
3. Al elegir una opción, el reducer agrega la fila o le suma 1. El stepper cambia la cantidad y "Quitar" saca la fila.
4. "Guardar grupo" → `validateProductGroupForm` → `createProductGroup` (RPC) → `router.push(APP_ROUTE.LIST_GROUPS)`.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Función nueva `search_catalog_including_own` | Un parámetro nuevo en `search_catalog` | SCRUM-131 fijó que `search_catalog` no cambia de firma ni de contrato; es el mismo camino que `list_catalog_by_category`. Costo: SQL duplicado |
| `searchFn` inyectable en `useProductSearch` | Copiar el hook | Reusa el debounce y el descarte de respuestas viejas; el valor por defecto deja igual a los otros consumidores |
| `create_product_group` como `security definer`, validando la visibilidad a mano | Invoker + políticas de INSERT | Una política no impide falsear `owner_id`/`household_id` ni meter un producto ajeno en un grupo compartido |
| Editor en una página | Un modal | Mismo patrón que recetas; HU-75 lo reabre por URL para editar |
| Reducer puro para el grupo en armado | `useState` sueltos | Las reglas de sumar y quitar se prueban sin React |
| Promover el aplanado de variantes a `utils/` | Importarlo desde `features/shopping-list` | Lo que comparten dos features no vive dentro de una de ellas (project-structure) |
| Ampliar las funciones de la 052 en esta historia | Un ticket aparte | Sin esto, eliminar un producto que está en un grupo fallaría por la FK de `product_group_items` |
| `is_personal` en la búsqueda | Consultar cada producto al guardar | La regla 7 se puede avisar en el cliente antes de guardar; la base la vuelve a validar igual |
