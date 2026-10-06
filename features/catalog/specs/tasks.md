# Tareas: catálogo — buscar productos

Deriva de [plan.md](plan.md). Cada tarea se valida antes de pasar a la siguiente.

## SCRUM-83: buscar productos en el catálogo global

- [x] 0. Sincronizar la rama con `develop` (31 commits detrás al 2026-10-03). Merge de `origin/develop`, sin forzar push.
- [x] 1. **Commit de refactor aparte, sin cambio de comportamiento:** mover `CATALOG_BASE_UNIT_LABEL` y `PRICE_FORMAT` a `constants/catalog.constants.ts`; mover `formatSizeLabel` y `formatPriceRange` a `utils/` (raíz); que `formatPriceRange` reciba `{ minPrice, maxPrice }`; actualizar los 3 imports de `features/shopping-list/` y retirar lo movido. *Validación: `tsc`, `lint`, `build` y `/lista` igual que antes.*
- [x] 2. Constantes de la feature (`constants/catalog-search.constants.ts`): textos, tabs, estados, ruta, columnas de la grilla.
- [x] 3. Modelos: `CatalogCardData` y `CatalogSearchViewModel` (en un solo archivo) y las props de los componentes. El estado quedó como `CatalogSearchStatusType` en las constantes (ver plan.md, desviaciones).
- [x] 4. Ampliar `types/catalog.types.ts` (con `PriceRange`) y `services/catalog.service.ts` (foto y precios por tienda). Solo aditivo. *Validación: lista y recetas siguen compilando sin tocarlas.*
- [x] 5. Utils puros de la feature: `getOverallPriceRange`, `toCatalogCards` y `getCatalogSearchStatus` (este último no estaba en el plan inicial).
- [x] 6. `useCatalogSearchViewModel`: envuelve `useProductSearch` y deriva `status` y tarjetas.
- [x] 7. Presentación: `CatalogTabs`, `CatalogCard`, `CatalogEmptyState`, `CatalogSearch` y la ruta `app/catalogo/page.tsx`.
- [x] 8a. Validación manual en el navegador (`npm run dev`, hecha por Daniel el 2026-10-03): CA-01, CA-03 y CA-04 y los casos de borde de búsqueda (vacío, 1 letra, texto largo, tecleo rápido) pasan; el parpadeo es imperceptible. **Con límites de datos:** la BD actual solo tiene productos individuales (no hay madres ni variantes), con un precio único (las tiendas coinciden) y todos con foto y precio. No se pudieron probar con datos reales: el rango de precio con mínimo distinto del máximo (CA-02), una tarjeta sin foto, una sin precio ni varias variantes de un producto.
- [x] 8b. `npx tsc --noEmit`, `npm run lint`, `npm run build`: pasan (ejecutados por Daniel el 2026-10-03).
- [ ] 8c. Cubrir lo no probable con datos: los tests unitarios de `toCatalogCards` y `getOverallPriceRange` (sin foto, sin precio, mínimo ≠ máximo, varias variantes) lo verifican sin depender de la BD; pendientes del runner.
- [ ] 9. Subagentes `code-reviewer` y `qa-checker`; completar la descripción del PR (pasos de prueba manual, evidencia, captura).

## Comunicación al equipo

- [x] Marcos (2026-10-03): de acuerdo con ampliar `searchCatalog` y los tipos; sin ramas que los toquen. Pidió mover `formatSizeLabel` a compartido en un commit de refactor aparte. Mensaje guía aprobado.
- [x] Roberto (2026-10-03): su rama no toca esos archivos; pueden hacerse los cambios.
- [x] Aviso a Marcos: `formatPriceRange` (suyo, SCRUM-64) y `PRICE_FORMAT` también se mueven a compartido, con el mismo refactor. Sin respuesta al 2026-10-03; Daniel lo autorizó y quedó hecho en el commit de refactor.
- [ ] Mencionar en Developer Notes de la PR: el commit de refactor aparte, su validación, el parpadeo conocido con la mejora sugerida a QA, y la nota neutral sobre SCRUM-126 (nombres con marca) y los límites de la prueba manual por falta de datos (ver 8a), para que QA no los tome por defectos.

Pendiente de otros:

- [ ] Enganchar `/catalogo` al sidebar cuando exista (ver SPEC, fuera de alcance).
- [ ] Conectar el sub-tab "Mis productos" y la sugerencia del estado vacío cuando exista esa historia.
- [ ] SCRUM-84: listado inicial con una RPC nueva para listar por categoría (respuesta de Marcos).
- [ ] Revisar nombres en la tarjeta cuando se resuelva SCRUM-126 (qué son las "madres").
- [ ] El PR #34 de Marcos también toca `shopping-list.constants.ts`: quien mergee segundo trae `develop` y resuelve.

## Pendiente cuando el proyecto tenga runner de tests

El runner está en la rama `ticket/SCRUM-128-runner-de-tests`, sin mergear a `develop` al 2026-10-03.

- [ ] Tests unitarios de `utils/getOverallPriceRange.ts` y `utils/toCatalogCards.ts`, y de `utils/formatPriceRange.ts` ya promovido, según unit-testing-standards (camino feliz + sin precios, sin foto, mínimo = máximo).
