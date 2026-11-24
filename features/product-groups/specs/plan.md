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
