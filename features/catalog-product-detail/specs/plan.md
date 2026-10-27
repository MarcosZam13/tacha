# Plan: Catálogo — detalle de producto (SCRUM-85)

Cómo se implementa lo que describe `SPEC.md`. Supone comprobado contra la base real
(2026-10-21): 40 productos, 55 variantes (todas con foto), 68 marcas (ninguna con
logo), 92 precios, 3 tiendas fijas — ver `SPEC.md` §15.

## 1. Árbol de archivos

### 1.1 Código que se promueve a compartido (ya autorizado por Marcos, dueño del módulo)

Se mueve, no se duplica — mismo patrón que usó SCRUM-86 con `CatalogCard`.

| Archivo | Qué pasa |
|---|---|
| `features/shopping-list/utils/toStorePriceRanges.ts` | Se mueve a `utils/toStorePriceRanges.ts`. Misma lógica (agrupa precios por tienda a un rango min–max, ordenado de más barato a más caro); se le agrega `storeSlug` además de `storeName` para poder mapear el ícono. |
| `features/shopping-list/models/ItemDetail.interface.ts` (`StorePrice`, `StorePriceRange`) | Se mueven a `types/catalog.types.ts`, con `storeSlug` agregado. `ItemDetail` (lo que es propio de shopping-list) se queda donde está, importando los tipos desde `types/catalog.types.ts`. |
| `features/shopping-list/services/shopping-list.service.ts` (`addItemToGeneralList`, `changeItemQuantity`) | Se mueven a un archivo nuevo compartido `services/list-items.service.ts`. No cambia su lógica ni la RPC que llaman. |
| `features/shopping-list/hooks/useShoppingListViewModel.ts` | Actualiza sus imports: `toStorePriceRanges` desde `@/utils/...`, `addItemToGeneralList`/`changeItemQuantity` desde `@/services/list-items.service`. Sin cambio de comportamiento. |

### 1.2 Código nuevo, compartido

| Archivo | Responsabilidad |
|---|---|
| `types/catalog.types.ts` (ampliación aditiva) | `CatalogBrand` (`name`, `logoUrl` nullable), `CatalogVariantDetail` (`variantId`, `productName`, `sizeLabel`, `imageUrl`, `brands: CatalogBrand[]`, `storePriceRanges: StorePriceRange[]`). |
| `services/catalog.service.ts` (ampliación aditiva) | `getCatalogVariantDetail(variantId)`: una consulta directa a `product_catalog_variants` (mismo patrón que `getItemDetail` de SCRUM-64 — sin RPC), con `product_catalog(name)`, `product_brands(name, logo_url)` y `latest_prices(price, stores(slug, display_name))` embebidos. Arma el `CatalogVariantDetail` con `formatSizeLabel` (ya existe) y `toStorePriceRanges` (recién promovido). |
| `constants/catalog.constants.ts` (ampliación aditiva) | `STORE_ICON_PATH_BY_SLUG: Record<string, string>` → los 3 SVG ya comiteados en `public/store-icons/`. |

### 1.3 Feature nueva

```
features/catalog-product-detail/
  ProductDetail.tsx                        ← entrada: gate loading/error → Inner
  components/
    ProductDetailHeader.tsx                ← foto grande, nombre, tamaño
    ProductDetailBrands.tsx                ← sección "Marcas disponibles"
    ProductDetailStorePrices.tsx           ← sección "Precio aproximado por supermercado"
    AddToListControl.tsx                   ← selector de cantidad + botón "Agregar a mi lista"
  hooks/
    useProductDetailViewModel.ts           ← TODA la lógica: fetch, estados, cantidad, agregar
  constants/
    catalog-product-detail.constants.ts    ← textos, estados (igual que catalog-search.constants.ts)
  models/
    ProductDetailProps.interface.ts
  specs/
    SPEC.md · plan.md · tasks.md
  tests/
    (Page Objects + tests, unit-testing-standards)
```

### 1.4 Ruta y navegación

| Archivo | Cambio |
|---|---|
| `app/(app)/catalogo/producto/[variantId]/page.tsx` (nuevo) | Ruta delgada: lee `params.variantId`, renderiza `<ProductDetail variantId={variantId} />`. |
| `components/catalog-card/CatalogCard.tsx` (tocado) | Se envuelve en un `Link` hacia la ruta de detalle del `variantId` de la tarjeta. Afecta a los dos consumidores actuales por igual (Buscar y Mis productos) — HU-53 no distingue desde cuál sub-tab se llega. |
| `constants/catalog.constants.ts` (ampliación aditiva) | Ruta de detalle como función/constante (`CATALOG_PRODUCT_DETAIL_ROUTE(variantId)`), para no repetir el string de la URL. |

## 2. Datos

Solo lectura, sin ninguna RPC nueva ni migración:

- `product_catalog_variants` (id, name, base_unit, base_quantity, image_url) ← `product_catalog` (name) ← `product_brands` (name, logo_url) ← `latest_prices` (vista sobre `product_prices`, ya existente) ← `stores` (slug, display_name).
- RLS: las mismas políticas de lectura pública que ya usa `search_catalog`/`getItemDetail` — nada que crear.

Escritura, sin cambios:

- `add_item_to_general_list(target_variant_id uuid)` — RPC existente (migración 004/015/024), agrega 1 unidad.
- `change_item_quantity(target_item_id uuid, quantity_delta integer)` — RPC existente (migración 005). **Dato verificado en la base: esta función tiene un `check` propio que solo acepta `quantity_delta` igual a `-1` o `1`** (`raise exception 'La cantidad solo cambia de a 1'` si no). No se puede mandar la cantidad elegida de una sola vez.

## 3. Flujo

1. El usuario toca una `CatalogCard` (en `/catalogo` o `/catalogo/mis-productos`) → navega a `/catalogo/producto/[variantId]`.
2. La página lee `variantId` de la URL y renderiza `ProductDetail`.
3. `useProductDetailViewModel(variantId)` pide `getCatalogVariantDetail(variantId)` en un `useEffect` (cancelable, mismo patrón que `useItemDetail`): `loading` → `ready` (con marcas y precios ya armados) o `error`.
4. El usuario mueve el selector de cantidad — estado local, sin pegarle a la base todavía.
5. Al tocar "Agregar a mi lista": estado `adding` →
   a. `addItemToGeneralList({ variantId })` → la fila queda con cantidad 1, se obtiene su `itemId`.
   b. Si la cantidad elegida es mayor a 1: `changeItemQuantity(itemId, +1)` esa cantidad menos 1 veces, **en secuencia** (una espera a que la anterior responda, no en paralelo — la RPC solo acepta ±1 por llamada, y mandarlas en paralelo arriesga que se pisen).
   c. Si todo responde: confirmación visual, vuelve a `ready`.
   d. Si cualquier llamada falla a mitad de camino: estado `error` de "agregar" — la cantidad ya sumada en la base queda así (no se revierte), y se informa al usuario cuánto quedó realmente agregado.

## 4. Tabla de decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Ruta propia `/catalogo/producto/[variantId]` | Modal encima de `/catalogo` | `docs/DESIGN.md` §7.1b la describe como pantalla completa, no una confirmación; el único `Modal` del repo es para diálogos chicos; evita tener que decidir ahora el patrón de estado compartido de cliente que el equipo no ha resuelto (`nextjs-enterprise-patterns` §3). |
| El detalle se pide con una consulta directa a `product_catalog_variants` (como ya hace `getItemDetail` de SCRUM-64) | RPC nueva, ej. `get_product_detail(variant_id)` | Cero migraciones nuevas; reusa un patrón ya probado en producción; evita el riesgo de colisión de nombre de parámetro en plpgsql que causó el incidente 029/030 de SCRUM-84. |
| Promover `toStorePriceRanges`, `addItemToGeneralList` y `changeItemQuantity` a ubicaciones compartidas | Duplicarlas dentro de `features/catalog-product-detail/` | Mismo patrón ya aceptado por el equipo (SCRUM-86 con `CatalogCard`); evita dos copias de la misma regla de negocio (rango de precio, agregar a lista); autorizado por Marcos como dueño del código. |
| Ícono de supermercado por `slug`, SVG fijo en `public/store-icons/` (ya comiteado) | Columna `icon_url` en `stores` (migración nueva) | Solo 3 tiendas fijas y conocidas; cero necesidad de tocar la base para esto. |
| Cantidad al agregar = 1 llamada a `addItemToGeneralList` + `(cantidad − 1)` llamadas secuenciales a `changeItemQuantity` | Pasar la cantidad completa de una sola vez a una RPC nueva o modificada | `change_item_quantity` tiene un `check` en la base que solo acepta ±1 por llamada (migración 005); cambiarlo afecta una función que usa toda la lista de compras — fuera del alcance de este ticket. |
| `CatalogCard` se vuelve clickeable para los dos consumidores actuales (Buscar y Mis productos) por igual | Prop opcional que cada consumidor activa a su gusto | HU-53 dice "al tocar un producto en el catálogo" sin distinguir sub-tab; las dos pantallas deben llevar al mismo detalle. |
