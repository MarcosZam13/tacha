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
- [x] 7. Presentación: `CatalogTabs`, `CatalogCard`, `CatalogEmptyState`, `CatalogSearch` y la ruta `app/(app)/catalogo/page.tsx`.
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

## SCRUM-84: filtrar catálogo por categoría

Deriva de [plan.md](plan.md#hu-52-scrum-84-filtrar-catálogo-por-categoría). No modifica las tareas de SCRUM-83 arriba.

- [x] 0. Contextualizar: ticket en Jira, comentarios de SCRUM-84/85/87/131, `AGENTS.md` y skills aplicables, estado real del repo tras el rebase con `develop`. Confirmado: SCRUM-131 ya mergeado (`categories` con 7 filas, 12 madres con `category_id`), SCRUM-86 ya mergeado (sin imports a rutas viejas).
- [x] 1. SPEC.md actualizada de forma aditiva (HU-51 intacta, HU-52 agregada aparte); decisión de arquitectura (RPC nueva vs. extender `search_catalog`) resuelta con la decisión ya registrada en `supabase/specs/SCRUM-131/SPEC.md` §6, sin necesidad de volver a decidirla.
- [x] 2. Decisión de SPEC.md §6 (qué pasa al entrar a `/catalogo` sin texto y sin chip) resuelta: se mantiene `idle`.
- [x] 3. Aviso en Jira a SCRUM-85 y SCRUM-87 sobre la RPC nueva y la lectura directa de `categories`.
- [x] 4. plan.md actualizado de forma aditiva (archivos, datos, flujo, tabla de decisión por caso, decisiones, orden de commits, skills).
- [x] 5. Número de migración confirmado: `029` (2026-10-20). **`supabase/migrations/029_list_catalog_by_category.sql`:**
  - [x] 5a. Función `list_catalog_by_category(category_id uuid default null, household_id uuid default null)`: mismo shape de salida y misma agregación de marcas/precio que `search_catalog`, con el bloque de tiendas visibles duplicado (no extraído a helper — decisión revisada en plan.md) para no tocar `search_catalog`. `security invoker`, `search_path = public` fijo desde esta misma migración (no `''` — se corrigió para seguir el patrón real de la 020: `alter function ... set search_path = public`, sin calificar cada tabla con `public.`).
  - [x] 5b. `supabase/tests/029_list_catalog_by_category.test.sql`, mismo patrón que `020_curated_mothers.test.sql` (transacción con `rollback`): sin categoría devuelve todo el catálogo global, con categoría real ("Lácteos") solo esa, categoría sin productos (creada y descartada dentro de la misma transacción) devuelve 0 filas sin error.
  - [x] 5c. Aplicada en el SQL Editor (029 y, tras el bug, 030). Verificado de nuevo en esta sesión (chat nuevo) con `mcp__Supabase__get_advisors` y spot-check de conteos: sin alertas nuevas, una sola firma de la función, 40/7/55/29/11 consistentes con el test.
- [x] 6. `types/catalog.types.ts`: agregar `category: string` a `CatalogProduct`; agregar `Category { id: string; name: string }`. Aditivo, verificar que lista y recetas sigan compilando sin tocarlas.
- [x] 7. `services/catalog.service.ts`: `searchCatalog()` deja de descartar `product.category`; nuevas `listCatalogByCategory(categoryId)` y `getCategories()`. *Validación: `tsc`, `lint`, `build` (pendiente, los corre Daniel).*
- [x] 8. `constants/catalog.constants.ts`: `CATALOG_DB.RPC.LIST_CATALOG_BY_CATEGORY` (+ `CATALOG_CATEGORY_TEXT.UNASSIGNED`, no estaba en el plan: lo pidió el compilador al no tocar `features/my-products/`, ver tasks.local.md). `features/catalog/constants/catalog-search.constants.ts`: textos nuevos (aria-label de los chips, mensaje de categoría vacía).
- [x] 9. Primitivo `Chip` en `components/ui/` — ya existía (`components/ui/chip/Chip.tsx`, con `CHIP_TONE`); se reusa tal cual, sin crear uno nuevo.
- [x] 10. `features/catalog/components/CatalogCategoryChips.tsx` + su interface de props: presentación pura (chip "Todas" + uno por `Category`, `aria-pressed` en el activo). Cada chip es un `<button>` que envuelve el `Chip` compartido (no existía una variante clicable del primitivo).
- [x] 11. `hooks/useCatalogSearchViewModel.ts`: agregar `activeCategoryId`, `categories`, `onCategoryChange`; implementar la tabla de decisión de RPC del plan.md (idle / `listCatalogByCategory` / `searchCatalog` / `searchCatalog` + filtro en cliente). Mismo patrón de cancelación que `useProductSearch` (bandera `isCancelled`).
- [x] 12. `features/catalog/CatalogSearch.tsx`: renderizar `<CatalogCategoryChips />` conectado al ViewModel. `CatalogEmptyState` (no estaba en la lista de archivos tocados del plan.md) gana un `message` opcional para distinguir "sin resultados de texto" de "categoría sin productos" (CA adicional de HU-52).
- [ ] 13a. Validación manual en el navegador: CA-01, CA-02, CA-03 de HU-52, los casos adicionales de SPEC.md §13, y que HU-51 (búsqueda sin categoría) sigue igual que antes. **Pendiente — la corre Daniel (`npm run dev`).**
- [ ] 13b. `npx tsc --noEmit`, `npm run lint`, `npm run build`. **Pendiente — los corre Daniel** (comandos abajo, en tasks.local.md).
- [x] 14. Tests unitarios de lo nuevo — el runner ya está en `develop` (PR #36, `ticket/SCRUM-128-runner-de-tests`): `CatalogCategoryChips` (chip activo/aria-pressed, CA-01/CA-02), la tabla de decisión de RPC del ViewModel (idle, listado por categoría, búsqueda + filtro en cliente, categoría sin productos, error, respuesta tardía descartada — regla 15), `listCatalogByCategory`/`getCategories` del servicio. **Pendiente correr `npm test` (lo corre Daniel) para confirmar que pasan.**
- [ ] 15. Subagentes `code-reviewer`, `security-reviewer` (por la migración/RPC nueva) y `qa-checker`; completar la descripción del PR #66 (pasos de prueba manual, el aviso ya hecho a SCRUM-85/87, nota de Developer Notes sobre la RPC nueva).
- [ ] 16. Cambiar label del PR #66 cuando corresponda (hoy sigue en `on hold`, desactualizado — el bloqueo real con SCRUM-131 ya no existe).

## Pendiente de otros (sin cambios desde SCRUM-83)

- [ ] Enganchar `/catalogo` al sidebar cuando exista.
- [ ] SCRUM-85: detalle del producto — recibe el mismo `CatalogProduct`/`productId` sin importar de qué RPC vino (avisado en su Jira).
- [ ] SCRUM-87: selector de categoría del formulario — puede reusar `getCategories()` (avisado en su Jira).
- [ ] Revisar nombres en la tarjeta cuando se resuelva SCRUM-126/133 (marcas en el nombre de las madres viejas).
