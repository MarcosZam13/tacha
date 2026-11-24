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

## HU-74 — Agregar un grupo a la lista (SCRUM-111)

### Archivos

| Archivo | Nuevo/toca | Responsabilidad |
|---|---|---|
| `supabase/migrations/057_add_group_to_general_list.sql` | nuevo | RPC + grant |
| `supabase/tests/057_add_group_to_general_list.test.sql` | nuevo | Casos 2-8 en SQL |
| `types/database.types.ts` | toca | Bloque de la función nueva, a mano (como en 054 y 056) |
| `features/product-groups/constants/product-groups.constants.ts` | toca | `PRODUCT_GROUPS_DB.RPC.ADD_TO_LIST`, textos, `PRODUCT_GROUP_ADD_STATUS` |
| `features/product-groups/services/product-groups.service.ts` | toca | `addGroupToList(groupId) → { added, skipped }` |
| `features/product-groups/hooks/useProductGroupListAddition.ts` | nuevo | Estado por tarjeta + mensaje (patrón de `features/recipes/hooks/useRecipeListAddition.ts`) |
| `features/product-groups/hooks/useProductGroupsViewModel.ts` | toca | Expone `onAddToList(groupId)` y el resultado |
| `features/product-groups/components/ProductGroupCard.tsx` | toca | Botón "Agregar a lista" |
| `features/product-groups/components/ProductGroupAddResult.tsx` | nuevo | Mensaje + link "Ver lista" |
| `docs/DESIGN.md` §7.6 | toca | Quitar "dispara la reconciliación de cantidades (7.3)" |
| tests + E2E-GRUPOS-06..08 | nuevo | |

### Datos: migración 057
```sql
create or replace function public.add_group_to_general_list(target_group_id uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare
  found_group_id uuid;
  general_list_id uuid;
  group_item record;
  added_names text[] := '{}';
  skipped_names text[] := '{}';
begin
  if auth.uid() is null then raise exception '...' using errcode = '42501'; end if;
  select g.id into found_group_id from public.product_groups g where g.id = target_group_id; -- RLS
  if found_group_id is null then raise exception 'Grupo no encontrado' using errcode = 'P0002'; end if;
  general_list_id := public.ensure_general_list_id();
  perform pg_advisory_xact_lock(hashtextextended(general_list_id::text, 0));
  for group_item in
    select gi.product_catalog_variant_id, gi.quantity, pc.name as product_name, pc.archived_at,
           (v.id is not null) as is_visible
    from public.product_group_items gi
    left join public.product_catalog_variants v on v.id = gi.product_catalog_variant_id  -- RLS
    left join public.product_catalog pc on pc.id = v.product_catalog_id
    where gi.group_id = found_group_id
    order by gi.position
  loop
    if not group_item.is_visible or group_item.archived_at is not null then
      skipped_names := array_append(skipped_names, coalesce(group_item.product_name, '…'));
      continue;
    end if;
    perform public.add_units_to_list_item(general_list_id, group_item.product_catalog_variant_id, group_item.quantity);
    added_names := array_append(added_names, group_item.product_name);
  end loop;
  return jsonb_build_object('added', to_jsonb(added_names), 'skipped', to_jsonb(skipped_names));
end $$;
grant execute on function public.add_group_to_general_list(uuid) to authenticated;
```
- **Invoker**, como `add_recipe_to_general_list`: la RLS de `product_groups`, `product_catalog_variants` y `list_items` hace el trabajo. `ensure_general_list_id` ya es definer.
- ⟳ Nombre del producto saltado cuando la variante no es visible: no se puede leer el nombre (RLS). Usar el texto genérico "un producto que ya no está disponible" (constante en la función).
- ⟳ Antes de crear la migración, confirmar que `add_units_to_list_item` y el índice de 035 siguen iguales en `develop`.

### Flujo
Tarjeta → `onAddToList(id)` → `useProductGroupListAddition` (`adding`) → `addGroupToList` (RPC) → `added` + mensaje → link a `APP_ROUTE.LIST`.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Una RPC en una transacción | Llamar `add_item_to_general_list` N veces desde el cliente | Todo o nada; una ida y vuelta; esa RPC suma de a 1 |
| Reusar `add_units_to_list_item` | `insert ... on conflict` propio | Ya implementa CA-02/CA-03 y la regla de filas tachadas (035) |
| Mismo advisory lock que recetas | Sin lock | Dos agregados simultáneos (grupo + receta) no se pisan |
| Quedarse en "Mis grupos" con link "Ver lista" | Navegar a `/lista` sola | Permite agregar varios grupos seguidos |
| Saltar archivados y no visibles | Fallar todo | Un producto archivado no debería bloquear el resto del grupo (D12) |
