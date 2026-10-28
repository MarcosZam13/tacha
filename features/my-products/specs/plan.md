# Plan: MyProducts (SCRUM-86)

## Árbol de archivos

### Nuevos — `features/my-products/`

```
features/my-products/
  MyProducts.tsx                        Entrada: título + CatalogTabs + estados (ViewModel → UI)
  components/
    MyProductsEmptyState.tsx            CA-02: texto exacto del ticket
  constants/
    my-products.constants.ts            Texto de la pantalla, estados, nombre/columnas de household_members
  hooks/
    useMyProductsViewModel.ts           Llama a listMyProducts, deriva estado, adapta a tarjetas
  models/
    my-products.interfaces.ts           MyProductsViewModel
  services/
    my-products.service.ts             listMyProducts(): resuelve household, consulta product_catalog
  specs/
    SPEC.md / plan.md / tasks.md
  tests/
    MyProducts.page.ts
    MyProducts.test.tsx
    my-products.service.test.ts
```

### Promovidos (segundo consumidor real: "Mis productos")

| De | A | Por qué |
|---|---|---|
| `features/catalog/components/CatalogTabs.tsx` + `models/CatalogTabsProps.interface.ts` | `components/catalog-tabs/CatalogTabs.tsx` (+ su interface) | Ahora lo usan dos features (`catalog`, `my-products`), igual que `RecipesTabs` en `components/recipes-tabs/` |
| `CATALOG_TAB`, `CATALOG_TABS`, `CATALOG_TABS_TEXT.TABS_LABEL`, `CATALOG_TEXT.COMING_SOON` (hoy en `features/catalog/constants/catalog-search.constants.ts`) | `constants/catalog-tabs.constants.ts` (nuevo, exportado desde el barrel) | Mismo patrón que `constants/recipes-tabs.constants.ts`; `CATALOG_TABS` pasa a tener `href` por tab (como `RECIPES_TABS`) en vez de `isAvailable` |
| `features/catalog/components/CatalogCard.tsx` + `models/CatalogCardProps.interface.ts` | `components/catalog-card/CatalogCard.tsx` | Ahora lo usan `catalog` y `my-products`; se le agrega un prop opcional `badgeLabel` |
| `features/catalog/utils/toCatalogCards.ts` y `CATALOG_CARD`/`CatalogCardData` | `utils/toCatalogCards.ts` (raíz) y constante/tipo movidos junto | Mismo motivo; `toCatalogCards` recibe un segundo parámetro opcional `badgeLabel` |

Lo que **no** se toca: `features/catalog/CatalogSearch.tsx` sigue siendo dueño de su propio estado de búsqueda; solo cambia de dónde importa `CatalogTabs`/`CatalogCard`/`toCatalogCards` y deja de pasar `isAvailable` (ahora todo tab es link).

### Constantes compartidas que se tocan

- `constants/routes.constants.ts`: se agrega `APP_ROUTE.CATALOG_MY_PRODUCTS = "/catalogo/mis-productos"`.
- `constants/index.ts`: se agrega el export de `catalog-tabs.constants.ts`.

### Ruta Next.js

- `app/(app)/catalogo/mis-productos/page.tsx` (nueva, delgada, igual forma que `app/(app)/catalogo/page.tsx`): renderiza `<MyProducts />`.

## Datos

Verificado contra el patrón ya usado en el repo para este tipo de consulta (no es nuevo: `features/household/services/household.service.ts`, `features/recipes/services/recipes.service.ts`, `features/shopping-list/constants/shopping-list.constants.ts` ya hacen exactamente esto) — una constante `*_SELECT` con el string de embed de Supabase, y toda columna usada en `.eq()`/`.order()` como constante propia porque el genérico `Database` no las valida ahí (sí valida el `.select()`). Sin RPC nueva ni policy nueva en ningún caso: `product_catalog`, `product_catalog_variants` y `household_members` ya tienen la lectura que hace falta.

1. **Household del usuario actual** — tabla `household_members`, no `product_catalog`:
   ```ts
   getSupabaseClient()
     .from(MY_PRODUCTS_DB.TABLE.HOUSEHOLD_MEMBERS)      // "household_members"
     .select(MY_PRODUCTS_DB.COLUMN.HOUSEHOLD_ID)          // "household_id"
     .eq(MY_PRODUCTS_DB.COLUMN.USER_ID, session.user.id)  // "user_id"
     .maybeSingle();
   ```
   RLS de `household_members` ya limita a la fila propia (confirmado en `household.service.ts`, mismo comportamiento que usa `getHouseholdMembership`). No se reutiliza esa función porque solo expone `householdName`/`role` (ver `household.service.ts:getHouseholdMembership`), no el `id` — cambiar su contrato tocaría `features/household/`, fuera de esta historia. Si no hay sesión o `householdId` sale `null`, no se hace la consulta 2: se resuelve directo a `empty` (regla de negocio §5 de `SPEC.md`).

2. **Productos manuales del household** — se consulta desde `product_catalog` (no desde `product_catalog_variants`): `source` y `household_id` son columnas propias de `product_catalog`, así que filtrar ahí evita cualquier ambigüedad de cómo Supabase filtra por una columna de una relación embebida (que sí existiría si se consultara desde `variants`). Mismo criterio de embed que ya usa `GENERAL_LIST_SELECT` en `shopping-list.constants.ts` (ahí es `product_catalog_variants(..., product_catalog(name))`; acá es al revés porque lo que se filtra es el padre):
   ```ts
   getSupabaseClient()
     .from(MY_PRODUCTS_DB.TABLE.PRODUCT_CATALOG)                     // "product_catalog"
     .select(MY_PRODUCTS_DB.SELECT)
     // MY_PRODUCTS_DB.SELECT = "id, name, product_catalog_variants(id, base_unit, base_quantity, image_url)"
     .eq(MY_PRODUCTS_DB.COLUMN.SOURCE, CATALOG_SOURCE.MANUAL)        // "source", "manual"
     .eq(MY_PRODUCTS_DB.COLUMN.HOUSEHOLD_ID, householdId)            // "household_id"
     .order(MY_PRODUCTS_DB.COLUMN.NAME);                              // "name"
   ```
   `CATALOG_SOURCE` es constante nueva y **compartida** en `constants/catalog.constants.ts` (no en `my-products/`): `source` es una columna de `product_catalog`, mismo dominio que `CATALOG_BASE_UNIT` que ya vive ahí — no inventar un segundo lugar para constantes del mismo dominio (constants-standards §4). El resto (`MY_PRODUCTS_DB.TABLE.*`, `.COLUMN.*`, `.SELECT`) queda en `features/my-products/constants/`: nadie más lo usa todavía.
3. Cada fila (`{ id, name, product_catalog_variants: [...] }`) se mapea a `CatalogProduct` (`productId`, `productName`, `variants` con `priceRangeByStore: {}` — no hay RPC de precio para manual, y `toCatalogCards` ya sabe mostrar "Sin precio disponible" cuando el rango viene vacío).

## Flujo

1. `MyProducts.tsx` monta → `useMyProductsViewModel` dispara el fetch en un `useEffect` (patrón servicio + efecto de `nextjs-enterprise-patterns §3`, mismo que `useProductSearch`).
2. `useMyProductsViewModel` llama a `listMyProducts()` → éste resuelve la sesión, busca `household_id`, y si existe consulta `product_catalog`.
3. El resultado (`CatalogProduct[]`) se adapta con `toCatalogCards(products, MY_PRODUCTS_BADGE_LABEL)`.
4. El ViewModel deriva el estado (`loading | error | empty | ready`) según haya o no tarjetas y error.
5. `MyProducts.tsx` renderiza `CatalogTabs`, y según el estado: `Spinner`, mensaje de error, `MyProductsEmptyState`, o la grilla de `CatalogCard`.

## Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Filtrar por `household_id = household del usuario`, nunca solo por `source = 'manual'` | Filtrar solo por `source = 'manual'` | La segunda trae los 12 productos madre curados en SCRUM-131 (`household_id = null`), que no son de ningún usuario — se verían con la etiqueta "Agregado por mí" sin serlo |
| Sin household → siempre estado vacío, sin tocar el esquema | Agregar `owner_id` a `product_catalog` en esta misma historia | SCRUM-86 es de solo lectura; agregar una columna es una decisión de modelo de datos que afecta a HU-56 también, no solo a esta pantalla — se deja anotado en `SPEC.md §15` para esa historia |
| Consulta propia y mínima a `household_members` en `my-products.service.ts`, sin importar `features/household/services/household.service.ts` | Reutilizar `getHouseholdMembership()` | Esa función devuelve `householdName`/`role`, no el `id`; cambiarla para exponer el `id` tocaría `features/household/`, fuera del alcance de este ticket |
| Promover `CatalogTabs`, `CatalogCard`, `toCatalogCards` a compartido | Duplicarlos dentro de `features/my-products/` | `component-architecture §1` pide promover recién con el segundo consumidor real — que es exactamente esta historia — y evita que "Buscar" y "Mis productos" diverjan en cómo se ve una tarjeta |
| Una tarjeta por variante (mismo criterio que "Buscar") | Una tarjeta por producto madre | Mantiene la misma gramática visual del catálogo; CA-01 no pide agrupar por producto madre |

## Dependencias verificadas

- Sin dependencia real de SCRUM-131 (ya mergeado a `develop`), SCRUM-84, SCRUM-85, SCRUM-59 ni SCRUM-28 para esta historia.
- Nota aparte, no bloqueante: la migración `024_household_lists.sql` (rama `SCRUM-59` sin mergear) ya está aplicada en la base compartida pero no existe en `develop`. No toca `product_catalog`; queda fuera de alcance de SCRUM-86.
