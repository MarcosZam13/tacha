# Tasks: Catálogo — detalle de producto (SCRUM-85)

Checklist ordenada. Nada marcado `[x]` sin evidencia real de que se hizo (correr el
comando y confirmar el resultado). `tsc`/lint/build/test/git/gh requieren ejecución
manual fuera de este flujo — los comandos exactos están en la sección final.

## 1. Promoción de código compartido (bloquea todo lo demás)

- [x] 1. `toStorePriceRanges` y sus tipos (`StorePrice`, `StorePriceRange`, con `storeSlug` agregado) se movieron de verdad a `utils/toStorePriceRanges.ts` y `types/catalog.types.ts` — mismo patrón ya aceptado en SCRUM-86: el archivo original en `features/shopping-list/utils/` se borró (no quedó como reexport) y los dos imports que dependían de él (`useShoppingListViewModel.ts` y `models/ItemDetail.interface.ts`) ahora apuntan directo a `@/utils/toStorePriceRanges` y `@/types/catalog.types`.
- [x] 2. `addVariantToGeneralList` y `changeListItemQuantity` (la RPC y su mapeo) viven ahora en `services/list-items.service.ts` nuevo, junto con `LIST_ITEMS_DB` e `ITEM_QUANTITY`/`ItemQuantityStepType` en `constants/list-items.constants.ts`. A diferencia del punto 1, aquí `addItemToGeneralList`/`changeItemQuantity` de `shopping-list.service.ts` quedaron como adaptadores delgados sobre el servicio nuevo (completan `productName`/`sizeLabel`, que la RPC no devuelve) en vez de moverse literal: moverlos hubiera arrastrado `ShoppingListItem`, `ItemCheck` y `CatalogSearchResult`, que son propios de esa feature y no los necesita el detalle de producto.
- [x] 3. Imports corregidos para apuntar a las ubicaciones nuevas sin reexports: `features/shopping-list/hooks/useShoppingListViewModel.ts` y `features/shopping-list/models/ItemDetail.interface.ts`. Confirmado con `grep -rn "toStorePriceRanges\|StorePrice" features/shopping-list/`: solo quedan esos dos imports, más `StorePriceRow` (tipo propio sin relación, de `ItemDetailViewModel.interface.ts`) y las menciones históricas en las specs de SCRUM-64.
- [x] 4. Tests de `shopping-list` corridos de forma manual con el comando de abajo — pasan.
- [x] 5. Test unitario para `toStorePriceRanges` en su ubicación nueva: `utils/tests/toStorePriceRanges.test.ts` (5 casos: varias marcas en una tienda, orden por precio, una sola marca, lista vacía, `storeSlug` propagado).

## 2. Servicio y tipos nuevos del detalle

- [ ] 6. Agregar `CatalogBrand` y `CatalogVariantDetail` a `types/catalog.types.ts` (aditivo).
- [ ] 7. Agregar `getCatalogVariantDetail(variantId)` a `services/catalog.service.ts` (aditivo, sin tocar `searchCatalog`).
- [ ] 8. Agregar `STORE_ICON_PATH_BY_SLUG` a `constants/catalog.constants.ts`, apuntando a los 3 SVG ya comiteados en `public/store-icons/`.

## 3. Feature `features/catalog-product-detail/`

- [ ] 9. `hooks/useProductDetailViewModel.ts`: fetch cancelable (mismo patrón que `useItemDetail`), estados `loading`/`error`/`ready`/`adding`, selector de cantidad local, flujo de "agregar" descrito en `plan.md` §3.
- [ ] 10. `components/ProductDetailHeader.tsx`, `ProductDetailBrands.tsx`, `ProductDetailStorePrices.tsx`, `AddToListControl.tsx` — solo presentación.
- [ ] 11. `ProductDetail.tsx` — entrada delgada, compone el ViewModel con los componentes.
- [ ] 12. `constants/catalog-product-detail.constants.ts` — todos los textos y estados (cero literales).

## 4. Ruta y navegación

- [ ] 13. `app/(app)/catalogo/producto/[variantId]/page.tsx` — ruta delgada.
- [ ] 14. `components/catalog-card/CatalogCard.tsx` — envolver en `Link` hacia el detalle; confirmar que sigue sirviendo igual a `features/catalog/` (Buscar) y a `features/my-products/` (Mis productos), sin romper sus tests existentes.
- [ ] 15. `CATALOG_PRODUCT_DETAIL_ROUTE(variantId)` en `constants/catalog.constants.ts`, usado por `CatalogCard` y por la propia página.

## 5. Validación manual (CA-01 a CA-04 de SPEC.md + casos adicionales)

- [ ] 16. Probar con una variante de varias marcas y varios supermercados (ej. las que mostraron 3-4 marcas en la comprobación de la base) y con una de una sola marca.
- [ ] 17. Probar explícitamente el caso realista de hoy: marca sin logo (todas, por ahora) — confirmar que se ve bien solo con el nombre.
- [ ] 18. Probar agregar con cantidad > 1 (ej. 3) y confirmar en la lista general que quedó la cantidad correcta, no solo 1.
- [ ] 19. Probar un `variantId` inventado en la URL — debe decir "producto no encontrado", no romperse.
- [ ] 20. `npx tsc --noEmit && npm run lint && npm test && npm run build` — **pendiente de ejecución manual**, comando exacto más abajo.

## 6. Antes de pasar a QA

- [ ] 21. Subagente `code-reviewer` sobre el diff completo (toca código compartido: `utils/`, `services/`, `types/`, `constants/`, y la feature nueva).
- [ ] 22. Completar la descripción del PR #73 (plantilla, "How should this be manually tested?", Ticket, Assignee, Reviewer).
- [ ] 23. Cambiar el label del PR #73 de `in progress` a `waiting qa` — **pendiente, requiere `gh` manual**, solo después de 20, 21 y 22.
- [ ] 24. Mover la tarjeta de SCRUM-85 en Jira a "Waiting QA" en el mismo momento que el label.

## Comandos de validación

Punto 4 (sección 1), apenas esto — para confirmar que la promoción no rompió nada de `shopping-list` antes de seguir con la sección 2:

```bash
npm test -- features/shopping-list utils/tests/toStorePriceRanges.test.ts
```

Sección 20, al terminar toda la feature (ejecución manual pendiente):

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```
