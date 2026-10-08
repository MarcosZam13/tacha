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

app/catalogo/page.tsx                  ruta delgada: solo renderiza <CatalogSearch />

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
