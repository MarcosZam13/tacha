# Tasks: MyProducts (SCRUM-86)

Todas las tareas son de esta historia (no hay otro ticket agrupado acá).

## 1. Promociones a compartido (requisito de las tareas 2-4)

- [ ] 1.1 Mover `features/catalog/components/CatalogTabs.tsx` + su interface a `components/catalog-tabs/`, como `RecipesTabs`
- [ ] 1.2 Crear `constants/catalog-tabs.constants.ts` (`CATALOG_TAB`, `CATALOG_TAB_LABEL`, `CATALOG_TABS` con `href`, `CATALOG_TABS_TEXT`), exportarlo desde `constants/index.ts`; quitar lo equivalente de `features/catalog/constants/catalog-search.constants.ts`
- [ ] 1.3 Agregar `APP_ROUTE.CATALOG_MY_PRODUCTS` en `constants/routes.constants.ts`
- [ ] 1.4 Mover `CatalogCard` + su interface a `components/catalog-card/`, agregar prop opcional `badgeLabel`
- [ ] 1.5 Mover `toCatalogCards`, `CATALOG_CARD`, `CatalogCardData` a compartido (`utils/toCatalogCards.ts` + constante/tipo junto), con segundo parámetro opcional `badgeLabel`
- [ ] 1.6 Actualizar `features/catalog/CatalogSearch.tsx` y sus tests para los nuevos imports (sin cambio de comportamiento)

## 2. Servicio y ViewModel

- [ ] 2.1 `features/my-products/constants/my-products.constants.ts`: estados, textos (título ya existe como `CATALOG_TEXT.TITLE`, reusar), texto de CA-02, badge "Agregado por mí", nombre/columnas de `household_members`
- [ ] 2.2 `features/my-products/services/my-products.service.ts`: `listMyProducts()` (household_id → product_catalog + variants → `CatalogProduct[]`)
- [ ] 2.3 `features/my-products/models/my-products.interfaces.ts`: `MyProductsViewModel`
- [ ] 2.4 `features/my-products/hooks/useMyProductsViewModel.ts`

## 3. UI

- [ ] 3.1 `features/my-products/components/MyProductsEmptyState.tsx` (CA-02)
- [ ] 3.2 `features/my-products/MyProducts.tsx` (título + `CatalogTabs` + estados)
- [ ] 3.3 `app/(app)/catalogo/mis-productos/page.tsx`

## 4. Tests (unit-testing-standards)

- [ ] 4.1 `my-products.service.test.ts` — household con productos, household sin productos, sin household, error
- [ ] 4.2 `MyProducts.page.ts` (Page Object)
- [ ] 4.3 `MyProducts.test.tsx` — casos de aceptación §13 de `SPEC.md`: CA-01, CA-02, error, exclusión de productos madre globales
- [ ] 4.4 Ajustar tests existentes de `CatalogSearch`/`CatalogTabs`/`CatalogCard` tras la promoción (mismo comportamiento, solo cambia de dónde importan)

## 5. Cierre

- [ ] 5.1 Validar contra los 4 casos de aceptación de `SPEC.md §13`
- [ ] 5.2 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`
- [ ] 5.3 Subagente `code-reviewer`
- [ ] 5.4 Comunicar el impacto de este PR en el flujo de otros tickets: dejar un comentario en cada ticket de Jira correspondiente (al menos SCRUM-84 y SCRUM-85, que van a construir sobre `CatalogCard`/`CatalogTabs`/`toCatalogCards`) explicando qué se movió de `features/catalog/` a compartido y a qué ruta nueva; en el PR de GitHub de los tickets que ya tengan uno abierto (SCRUM-84), dejar el mismo aviso como comentario del PR, para que el cambio quede registrado tanto en Jira como en GitHub antes de que alguien retome esa historia
- [ ] 5.5 Completar la descripción del PR (How should this be manually tested?) y pasar a `waiting qa`
