# Plan técnico: catálogo — buscar productos

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md).

> **Verificado el 2026-10-03** contra `develop` (316f74b, ya con SCRUM-64): no existe ruta de catálogo (solo `/lista`, `/recetas`, `/registro`, `/login`); `services/catalog.service.ts`, `types/catalog.types.ts` y `constants/catalog.constants.ts` no cambiaron desde SCRUM-120; la RPC `search_catalog` ya devuelve `image_url` y `price_ranges`, pero `searchCatalog` los descarta al mapear; lista ya tiene su `formatPriceRange` (SCRUM-64, de Marcos) y existe un `utils/` en la raíz.

## Archivos

```
features/catalog/
  CatalogSearch.tsx                    entrada ("use client"): tabs + barra + estados + grilla (solo presentación)
  components/
    CatalogTabs.tsx                    sub-tabs "Buscar" / "Mis productos"
    CatalogCard.tsx                    una tarjeta: foto o marcador, nombre + tamaño, rango de precio
    CatalogEmptyState.tsx              sin resultados + sugerencia de "Mis productos"
    models/CatalogCardProps.interface.ts
    models/CatalogTabsProps.interface.ts
  hooks/
    useCatalogSearchViewModel.ts       envuelve useProductSearch, deriva el estado y las tarjetas
  models/
    catalog-search.interfaces.ts       CatalogCardData (tarjeta lista para dibujar) y CatalogSearchViewModel (lo que el ViewModel entrega)
  utils/
    toCatalogCards.ts                  adapter puro: CatalogProduct[] → CatalogCardData[] (una por variante)
    getOverallPriceRange.ts            rango por tienda → { minPrice, maxPrice } global (null si no hay tiendas)
    getCatalogSearchStatus.ts          deriva el estado idle / loading / error / empty / ready (en ese orden de prioridad: error, loading, empty, ready, idle)
  constants/
    catalog-search.constants.ts        textos, tabs, estados (y su tipo CatalogSearchStatusType), ruta; la grilla se define con clases en CatalogSearch.tsx
  specs/  SPEC.md · plan.md · tasks.md

app/(app)/catalogo/page.tsx                  ruta delgada: solo renderiza <CatalogSearch />

Código compartido que se toca
  services/catalog.service.ts          aditivo: el mapeo suma imageUrl y priceRangeByStore
  types/catalog.types.ts               aditivo: 2 campos en variante y en la fila de la RPC, y el tipo PriceRange
  constants/catalog.constants.ts       recibe CATALOG_BASE_UNIT_LABEL y PRICE_FORMAT (movidos desde lista)
  utils/formatSizeLabel.ts             movido desde features/shopping-list/utils/
  utils/formatPriceRange.ts            movido desde features/shopping-list/utils/; recibe { minPrice, maxPrice }

Lista: solo imports (commit de refactor aparte)
  features/shopping-list/constants/shopping-list.constants.ts   se retiran CATALOG_BASE_UNIT_LABEL y PRICE_FORMAT
  features/shopping-list/hooks/useShoppingListViewModel.ts      import de formatPriceRange
  features/shopping-list/services/shopping-list.service.ts      import de formatSizeLabel
  features/shopping-list/utils/toCatalogSearchResults.ts        import de formatSizeLabel
```

Sin migraciones, sin cambios a la RPC, sin escrituras en la base.

## Datos

Se lee con `searchCatalog(term)`, que llama a la RPC `search_catalog` sin `household_id` (todas las tiendas). Forma de cada variante en el `jsonb`:

```
{ variant_id, name, base_unit, base_quantity, image_url, brands, price_ranges }
price_ranges = { "<slug-tienda>": { min: number | null, max: number | null } } | null
```

Cambios aditivos a los tipos compartidos:

```ts
// CatalogSearchVariantRow (forma de la RPC): + dos campos
image_url: string | null;
price_ranges: Record<string, { min: number | null; max: number | null }> | null;

// CatalogProductVariant (lo que devuelve searchCatalog): + dos campos
imageUrl: NullableRef<string>;
priceRangeByStore: Record<string, PriceRange>;   // el servicio descarta las tiendas con min o max nulos
```

`CatalogSearchPriceRangeRow { max, min }` (ambos `number | null`) describe cada tienda en la fila de la RPC.

Lista y recetas no leen los campos nuevos, así que no cambian de comportamiento.

## Flujo

1. El usuario escribe en la barra → `setQuery` de `useProductSearch`.
2. El hook recorta el término; si es buscable (≥ 2) espera 300 ms sin teclas y llama a `searchCatalog(term)`.
3. `searchCatalog` llama a la RPC y mapea cada producto madre y cada variante (ahora con foto y precios por tienda, sin las tiendas de precio nulo).
4. `useCatalogSearchViewModel` toma `results` y los pasa por `toCatalogCards` (una tarjeta por variante: tamaño con el formateador, rango global con `getOverallPriceRange` + `formatPriceRange`, inicial para el marcador).
5. El ViewModel deriva `status` con `getCatalogSearchStatus` a partir de lo que ya expone el hook; `CatalogSearch.tsx` dibuja según ese estado.
6. Un término nuevo cancela el timer y descarta la respuesta vieja (comportamiento del hook).

## Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Feature propia `features/catalog/` con ruta `/catalogo` | Meter la pantalla en `components/product-search/` | `ProductSearch` es un desplegable de opciones para añadir a una lista; el catálogo es una pantalla con tarjetas y sub-tabs. Mezclarlos llenaría de props un componente compartido |
| Reusar `useProductSearch` tal cual | Escribir un hook propio con su debounce | Es el código compartido que SCRUM-120 extrajo justo para esto; duplicarlo repetiría el bug de respuestas tardías que el hook ya resuelve |
| Ampliar `searchCatalog` de forma aditiva (foto y precios por tienda) | Llamar a la RPC desde la feature con otro servicio | Un solo punto que conoce la forma de la RPC; si cambia el contrato se arregla en un lugar. Aditivo, así lista y recetas no se enteran |
| Guardar `priceRangeByStore` y agregar el rango global en la feature | Que el servicio devuelva solo el rango global | SCRUM-85 necesita el desglose por tienda; el servicio no lo pierde y la regla "mínimo de mínimos" (de negocio) vive en `utils/` de la feature |
| Una tarjeta por variante, aplanando en la feature | Una tarjeta por producto madre | CA-02 pide "producto + tamaño" en cada tarjeta, y el detalle (SCRUM-85) es por producto |
| `status` como unión derivada de constantes | Varios booleanos (`isSearching`, `hasNoResults`...) | Se pueden contradecir; la unión obliga a decidir qué se dibuja en cada caso (component-architecture §5, State) |
| Marcador con la inicial cuando no hay foto, como recetas | Imagen genérica | Es el patrón ya aceptado en recetas y evita descargar un asset más |
| `next/image` con `unoptimized` como en `RecipeCard` | Configurar dominios en `next.config.ts` | Las URLs vienen del scraping de varias tiendas; configurar cada dominio es frágil y queda fuera de alcance |
| Sub-tab "Mis productos" deshabilitado y sugerencia solo en texto | Botón o enlace a una ruta que no existe | Un enlace roto es peor que ninguno; se conecta cuando exista esa historia |
| Rango en una sola línea tipo "₡800 – ₡1 200" (formato de `docs/DESIGN.md` §7.1) | Separador de miles | Es el ejemplo del diseño; si el equipo prefiere miles, es un cambio en `formatPriceRange` |

### Orden de commits

1. `refactor(SCRUM-83): move size and price formatters to shared code` — solo movimientos e imports, sin cambio de comportamiento. Validación: `/lista` se ve y funciona igual; `tsc`, `lint` y `build` pasan.
2. Los commits de la feature (`feat(SCRUM-83): ...`).

### Decisiones del 2026-10-03

Tomadas por Daniel (orquestador) tras valorar su impacto en el resto del proyecto. Avisos y respuestas del equipo en [tasks.md](tasks.md#comunicación-al-equipo).

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Promover `formatSizeLabel` (con `CATALOG_BASE_UNIT_LABEL`) a código compartido en un commit de refactor aparte | Copia local con un ticket de unificación | Marcos, dueño de lista, lo pidió: es lo que se hizo con el buscador en SCRUM-120 y con el PR #24; con el segundo consumidor real se sube a la raíz. Una copia la marcaría QA o el profe como duplicado. El commit aparte, sin cambio de comportamiento, mantiene el diff revisable |
| Promover también `formatPriceRange` (con `PRICE_FORMAT`) y reutilizarlo | Formateador propio con el formato del diseño ("₡800–₡1200") | Lista ya formatea rangos con `Intl` (es-CR, sin decimales). Dos formatos para lo mismo en la app serían inconsistentes. Su entrada pasa de `StorePriceRange` a `{ minPrice, maxPrice }`: `StorePriceRange` sigue siendo compatible, así que lista no cambia |
| Ampliar `searchCatalog` y los tipos de forma aditiva | Servicio propio de catálogo | Un solo punto conoce la forma de la RPC. Marcos y Roberto confirmaron que no tienen ramas que toquen esos archivos |
| Aceptar el parpadeo de `useProductSearch` y documentarlo; sugerir a QA la mejora (opción apagada por defecto) | Cambiar el hook compartido; copiar el hook | Cambiar el hook afecta a lista y recetas, fuera del alcance. Copiarlo duplica la lógica de cancelación de respuestas tardías |
| Mensaje guía antes de escribir. El listado inicial va en SCRUM-84 con una RPC nueva | Cambiar el contrato de `search_catalog` | Respuesta de Marcos: HU-51 no pide listado inicial, y "ver todo Lácteos" sin texto es otra consulta |
| No tocar `docs/documento-proyecto.md` | Documentar la ruta y la regla de 2 letras | No cambia el modelo de datos ni una decisión de producto nueva |
| Nota neutral sobre SCRUM-126 en Developer Notes de la PR | Omitirla | Evita que QA reporte por error la marca en el nombre como defecto de CA-02 |

### Desviaciones respecto al plan original (2026-10-03, durante la implementación)

El comportamiento y los criterios de la SPEC no cambiaron; solo la forma interna. Se registran para que el plan describa lo que realmente hay en el repo.

| Plan original | Implementado | Por qué |
|---|---|---|
| Un archivo por modelo (`CatalogCardData.interface.ts`, `CatalogSearchState.type.ts`, …) | Un solo `models/catalog-search.interfaces.ts` con `CatalogCardData` y `CatalogSearchViewModel` | Es la convención de agrupar por pantalla que ya usa recetas. Los tipos de las props siguen en `components/models/` |
| `CatalogSearchState` como tipo propio en `models/` | `CatalogSearchStatusType` derivado de `CATALOG_SEARCH_STATUS` en las constantes | `constants-standards`: los tipos de unión se derivan del objeto `as const` con `typeof/keyof`, no se escriben a mano |
| `priceRangeByStore` nullable; `getOverallPriceRange` ignora los `null` | El servicio descarta las tiendas con `min` o `max` nulos, así `priceRangeByStore` es `Record<string, PriceRange>` sin nulos | El dato nulo se resuelve una sola vez, en el adapter, y el resto del código no necesita revisarlo. SCRUM-85 recibe el mismo dato ya limpio |
| El ViewModel deriva `status` en línea | `utils/getCatalogSearchStatus.ts`, función pura | Es una regla con prioridades (error, loading, empty, ready, idle); aislada se puede probar sin React |
| `CatalogCardData` incluía ya el rango como objeto | Incluye `priceLabel` (texto ya formateado) y `placeholderInitial` | La tarjeta solo dibuja; el formato queda en el adapter |

## Qué skills aplican

`component-architecture` (feature con ViewModel y specs), `constants-standards` (textos, estados, rutas), `project-structure` (ruta delgada, alias `@/`), `clean-code-practices`, `nextjs-enterprise-patterns` (tipos nullable, reutilización), `unit-testing-standards` (cuando exista runner). `security-practices` no aplica: solo lectura, sin auth, formularios ni RLS nuevos.

---

## HU-52 (SCRUM-84): filtrar catálogo por categoría

Deriva de [SPEC.md](SPEC.md), secciones marcadas "HU-52". No modifica nada de lo de arriba (HU-51/SCRUM-83, ya implementado y en `waiting qa`).

> **Verificado el 2026-10-20** contra la rama `ticket/SCRUM-84-filter-catalog-by-category`, rebaseada con `develop`: SCRUM-131 ya está mergeado (migraciones `020_curated_mothers.sql` y `021_harden_search_cache_log.sql` presentes); `categories` tiene 7 filas y las 12 madres curadas tienen `category_id`. SCRUM-86 ya está mergeado a esta rama: no quedan imports a las rutas viejas de `features/catalog/components/CatalogTabs|CatalogCard` ni `features/catalog/utils/toCatalogCards|getOverallPriceRange` (verificado con `grep`, 0 resultados). `search_catalog` sigue en `supabase/migrations/001_add_search_catalog_rpc.sql`, sin cambios desde SCRUM-131.

### Archivos nuevos/tocados (HU-52)

```
supabase/migrations/029_list_catalog_by_category.sql   nuevo — RPC list_catalog_by_category (número confirmado, 2026-10-20)
supabase/tests/029_list_catalog_by_category.test.sql    nuevo — mismo patrón que 020/021

features/catalog/
  CatalogSearch.tsx                     tocado: agrega <CatalogCategoryChips /> y decide, junto con el ViewModel, cuál RPC llamar
  components/
    CatalogCategoryChips.tsx            nuevo — presentación: fila de chips, "Todas" + una por categoría
    models/CatalogCategoryChipsProps.interface.ts   nuevo
  hooks/
    useCatalogSearchViewModel.ts        tocado: agrega activeCategoryId, categories, onCategoryChange; decide search_catalog vs list_catalog_by_category vs idle
  models/
    catalog-search.interfaces.ts        tocado: CatalogSearchViewModel gana activeCategoryId, categories, onCategoryChange
  utils/
    toCatalogCards.ts                   sin cambios (sigue aplanando CatalogProduct[] → CatalogCardData[]; no necesita saber de categoría)
  constants/
    catalog-search.constants.ts         tocado: textos nuevos (aria-label de los chips, mensaje de categoría vacía)
  specs/  SPEC.md · plan.md · tasks.md  (este PR)

components/ui/
  Chip.tsx (o chip-label/)              nuevo si no existe ya un primitivo de chip en el design system — compartido, no local a catálogo

constants/
  catalog.constants.ts                  tocado: + CATALOG_DB.RPC.LIST_CATALOG_BY_CATEGORY

services/
  catalog.service.ts                    tocado, aditivo:
                                           - searchCatalog() deja de descartar product.category (lo mapea a CatalogProduct.category)
                                           - nueva función listCatalogByCategory(categoryId: string | null)
                                           - nueva función getCategories() (select directo a categories, sin RPC)

types/
  catalog.types.ts                      tocado, aditivo: CatalogProduct gana category: string; nuevo Category { id: string; name: string }
```

### Datos (HU-52)

`categories`, lectura directa (sin RPC):

```ts
// select id, name from categories order by name
interface Category { id: string; name: string }
```

RPC nueva, mismo shape de fila que `search_catalog` (reusa sus mismos CTE de `variant_brands`/`variant_prices` internamente, cambiando solo el filtro de `matching_products`):

```sql
list_catalog_by_category(category_id uuid default null, household_id uuid default null)
returns table (product_catalog_id uuid, name text, category text, variants jsonb)
```

- `category_id is null` → todo el catálogo global (`household_id is null`).
- `category_id` con valor → solo `product_catalog.category_id = category_id`.
- Mismo cálculo de `visible_store_ids` por `household_id` que `search_catalog`: se duplica ese bloque pequeño dentro de la función nueva (ver Decisiones) — no se toca el cuerpo de `search_catalog` para nada, ni siquiera para extraer un helper.

Cambio aditivo a `CatalogProduct` (hoy descarta `category`, viene de SPEC.md regla 12):

```ts
export interface CatalogProduct {
  category: string;   // nuevo — antes se descartaba al mapear
  productId: string;
  productName: string;
  variants: CatalogProductVariant[];
}
```

### Flujo (HU-52)

1. Al entrar a `/catalogo`, el ViewModel pide `getCategories()` una vez (para los chips) y arranca en `idle` si no hay texto ni categoría — sin cambios de comportamiento respecto a HU-51 (decidido con el responsable de la historia, 2026-10-20).
2. El usuario toca un chip → `onCategoryChange(categoryId | null)`.
   - Si no hay término buscable: llama a `listCatalogByCategory(categoryId)` (null = "Todas").
   - Si hay término buscable (≥2 caracteres): no se repite la llamada a búsqueda; se filtran en memoria los resultados que ya tiene `search_catalog` por `product.category === categoryName` (SPEC regla 12).
3. El usuario escribe texto (con categoría activa o no) → `useProductSearch` sigue igual (debounce, mínimo 2, descarta respuestas viejas); al llegar la respuesta, si hay categoría activa se filtra igual que en el punto 2.
4. Tocar el mismo chip activo (o "Todas") limpia `activeCategoryId` → vuelve al flujo sin filtro de categoría.
5. `getCatalogSearchStatus` no cambia su firma (loading/error/empty/ready/idle); solo cambian las condiciones que lo disparan (ahora también por categoría, no solo por `isSearching`/`hasNoResults` de `useProductSearch`).

### Qué RPC decide el ViewModel (tabla de casos)

| Texto ≥2 chars | Categoría activa | RPC / fuente | Filtro adicional |
|---|---|---|---|
| No | No | ninguna (idle) | — |
| No | Sí | `listCatalogByCategory(categoryId)` | — |
| Sí | No | `searchCatalog(term)` | — |
| Sí | Sí | `searchCatalog(term)` | cliente: `product.category === categoryName` |

### Decisiones (HU-52)

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| RPC nueva `list_catalog_by_category`, sin tocar `search_catalog` | Agregar `category_id` opcional a `search_catalog` | `search_catalog` tiene su contrato congelado desde SCRUM-131 (SPEC.md §15); tocarlo afecta a lista y recetas, que ya lo llaman hoy |
| Filtrar en el cliente cuando hay categoría + búsqueda (caso 4 de la tabla) | Pasarle `category_id` también a `search_catalog` | Mismo motivo — `search_catalog` ya devuelve `category`, filtrar 1-12 filas en memoria no pesa nada y no toca el RPC congelado |
| `categories` se lee directo (PostgREST), sin RPC | Una RPC `list_categories()` | Ya tiene policy de lectura pública; una RPC solo para esto sería una capa de más sin nada que agregar |
| Chips muestran las 7 categorías siempre, no solo las que tienen producto | Calcular "categorías con producto" en la RPC nueva | Ninguna CA de HU-52 lo pide; además esa misma lectura la va a reusar el selector de SCRUM-87 (avisado en su Jira) |
| `idle` se mantiene igual que en HU-51; solo un chip activo saca de `idle` sin texto | Retirar `idle`: listar todo el catálogo al entrar | Decidido con el responsable de la historia (2026-10-20): no tocar el comportamiento ya validado por QA en SCRUM-83 sin confirmación explícita |
| Duplicar el bloque `visible_store_ids` dentro de la función nueva | Extraer una función auxiliar compartida y hacer que `search_catalog` la llame | Evita volver a tocar el cuerpo de `search_catalog`, ya aprobado por QA, por una historia que no es la suya. Son ~6 líneas; si se duplica la lógica otra vez en el futuro, ahí sí se extrae un helper en un ticket propio |
| Componente `Chip` nuevo en `components/ui/` si no existe ya uno | Botones sueltos con clases repetidas en `CatalogCategoryChips` | Un chip de selección es un primitivo reusable (ya lo prevé `docs/DESIGN.md` §6, "chip / badge"); evita que el próximo filtro de categoría (ej. historial de compras, documento-proyecto §4.6) reinvente el estilo |

### Orden de commits (HU-52)

Continúa después de los commits ya mergeados de SCRUM-83 (`refactor(SCRUM-83): ...`, `feat(SCRUM-83): ...`):

1. `feat(SCRUM-84): add list_catalog_by_category RPC` — solo la migración `029` y su test SQL. Sin UI. Se aplica antes de pasar a `waiting qa`, con aviso al grupo (`supabase/README.md#migraciones`).
2. `refactor(SCRUM-84): stop discarding category in catalog.service` — aditivo: `CatalogProduct.category`, `getCategories()`, `listCatalogByCategory()`. Sin cambio de comportamiento visible todavía.
3. `feat(SCRUM-84): add category chips and filter catalog by category` — `CatalogCategoryChips`, el ViewModel, `CatalogSearch.tsx`, constantes y textos.
4. (Si hace falta) `feat(SCRUM-84): add Chip primitive to design system` — antes del commit 3, si no existe ya un primitivo de chip.

### Qué skills aplican (HU-52)

Los mismos de HU-51 (`component-architecture`, `constants-standards`, `project-structure`, `clean-code-practices`, `nextjs-enterprise-patterns`, `unit-testing-standards`), más **`security-practices`**: esta historia sí agrega una migración y una función nueva — revisar que quede `security invoker` (como `search_catalog`, no `security definer`: es lectura pública, no necesita saltarse RLS) y con `search_path` fijo, mismo patrón que dejó SCRUM-131.
