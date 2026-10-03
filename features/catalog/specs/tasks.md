# Tareas: catálogo — buscar productos

Deriva de [plan.md](plan.md). Cada tarea se valida antes de pasar a la siguiente.

## SCRUM-83: buscar productos en el catálogo global

- [ ] 0. Sincronizar la rama con `develop` (31 commits detrás al 2026-10-03). Merge de `origin/develop`, sin forzar push.
- [ ] 1. **Commit de refactor aparte, sin cambio de comportamiento:** mover `CATALOG_BASE_UNIT_LABEL` y `PRICE_FORMAT` a `constants/catalog.constants.ts`; mover `formatSizeLabel` y `formatPriceRange` a `utils/` (raíz); que `formatPriceRange` reciba `{ minPrice, maxPrice }`; actualizar los 3 imports de `features/shopping-list/` y retirar lo movido. *Validación: `tsc`, `lint`, `build` y `/lista` igual que antes.*
- [ ] 2. Constantes de la feature (`constants/catalog-search.constants.ts`): textos, tabs, estados, ruta, columnas de la grilla.
- [ ] 3. Modelos: `CatalogCardData`, `CatalogSearchState`, `CatalogSearchViewModel` y las props de los componentes.
- [ ] 4. Ampliar `types/catalog.types.ts` (con `PriceRange`) y `services/catalog.service.ts` (foto y precios por tienda). Solo aditivo. *Validación: lista y recetas siguen compilando sin tocarlas.*
- [ ] 5. Utils puros de la feature: `getOverallPriceRange`, `toCatalogCards`.
- [ ] 6. `useCatalogSearchViewModel`: envuelve `useProductSearch` y deriva `status` y tarjetas.
- [ ] 7. Presentación: `CatalogTabs`, `CatalogCard`, `CatalogEmptyState`, `CatalogSearch` y la ruta `app/catalogo/page.tsx`.
- [ ] 8. Validar CA-01 a CA-04 y los casos adicionales de la SPEC en el navegador; `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- [ ] 9. Subagentes `code-reviewer` y `qa-checker`; completar la descripción del PR (pasos de prueba manual, evidencia, captura).

## Comunicación al equipo

- [x] Marcos (2026-10-03): de acuerdo con ampliar `searchCatalog` y los tipos; sin ramas que los toquen. Pidió mover `formatSizeLabel` a compartido en un commit de refactor aparte. Mensaje guía aprobado.
- [x] Roberto (2026-10-03): su rama no toca esos archivos; pueden hacerse los cambios.
- [ ] Aviso a Marcos: `formatPriceRange` (suyo, SCRUM-64) y `PRICE_FORMAT` también se mueven a compartido, con el mismo refactor.
- [ ] Mencionar en Developer Notes de la PR: el commit de refactor aparte, su validación, el parpadeo conocido con la mejora sugerida a QA, y la nota neutral sobre SCRUM-126 (nombres con marca).

Pendiente de otros:

- [ ] Enganchar `/catalogo` al sidebar cuando exista (ver SPEC, fuera de alcance).
- [ ] Conectar el sub-tab "Mis productos" y la sugerencia del estado vacío cuando exista esa historia.
- [ ] SCRUM-84: listado inicial con una RPC nueva para listar por categoría (respuesta de Marcos).
- [ ] Revisar nombres en la tarjeta cuando se resuelva SCRUM-126 (qué son las "madres").
- [ ] El PR #34 de Marcos también toca `shopping-list.constants.ts`: quien mergee segundo trae `develop` y resuelve.

## Pendiente cuando el proyecto tenga runner de tests

El runner está en la rama `ticket/SCRUM-128-runner-de-tests`, sin mergear a `develop` al 2026-10-03.

- [ ] Tests unitarios de `utils/getOverallPriceRange.ts` y `utils/toCatalogCards.ts`, y de `utils/formatPriceRange.ts` ya promovido, según unit-testing-standards (camino feliz + sin precios, sin foto, mínimo = máximo).
