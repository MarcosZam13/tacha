# Tasks: MyProducts (SCRUM-86) + Crear producto personalizado (SCRUM-87 / HU-56)

Secciones 1-5: SCRUM-86 (ya Done/mergeado, se dejan como referencia histórica, sin
volver a marcarlas). Sección 6 en adelante: SCRUM-87 / HU-56.

## 1. Promociones a compartido (SCRUM-86, ya hecho)

- [X] 1.1 Mover `features/catalog/components/CatalogTabs.tsx` + su interface a `components/catalog-tabs/`, como `RecipesTabs`
- [X] 1.2 Crear `constants/catalog-tabs.constants.ts` (`CATALOG_TAB`, `CATALOG_TAB_LABEL`, `CATALOG_TABS` con `href`, `CATALOG_TABS_TEXT`), exportarlo desde `constants/index.ts`; quitar lo equivalente de `features/catalog/constants/catalog-search.constants.ts`
- [X] 1.3 Agregar `APP_ROUTE.CATALOG_MY_PRODUCTS` en `constants/routes.constants.ts`
- [X] 1.4 Mover `CatalogCard` + su interface a `components/catalog-card/`, agregar prop opcional `badgeLabel`
- [X] 1.5 Mover `toCatalogCards`, `CATALOG_CARD`, `CatalogCardData` a compartido (`utils/toCatalogCards.ts` + constante/tipo junto), con segundo parámetro opcional `badgeLabel`
- [X] 1.6 Actualizar `features/catalog/CatalogSearch.tsx` y sus tests para los nuevos imports (sin cambio de comportamiento)

## 2. Servicio y ViewModel (SCRUM-86, ya hecho)

- [X] 2.1 `features/my-products/constants/my-products.constants.ts`
- [X] 2.2 `features/my-products/services/my-products.service.ts`: `listMyProducts()`
- [X] 2.3 `features/my-products/models/my-products.interfaces.ts`: `MyProductsViewModel`
- [X] 2.4 `features/my-products/hooks/useMyProductsViewModel.ts`

## 3. UI (SCRUM-86, ya hecho)

- [X] 3.1 `features/my-products/components/MyProductsEmptyState.tsx` (CA-02)
- [X] 3.2 `features/my-products/MyProducts.tsx` (título + `CatalogTabs` + estados)
- [X] 3.3 `app/(app)/catalogo/mis-productos/page.tsx`

## 4. Tests (SCRUM-86, ya hecho)

- [X] 4.1 `my-products.service.test.ts`
- [X] 4.2 `MyProducts.page.ts` (Page Object)
- [X] 4.3 `MyProducts.test.tsx`
- [X] 4.4 Ajuste de tests existentes tras la promoción

## 5. Cierre (SCRUM-86, ya hecho)

- [X] 5.1 Validar contra los 4 casos de aceptación de `SPEC.md §13` (de entonces)
- [X] 5.2 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`
- [X] 5.3 Subagente `code-reviewer`
- [X] 5.4 Comunicar el impacto del PR a SCRUM-84/85 (comentarios en Jira y PR de GitHub)
- [X] 5.5 Descripción del PR y paso a `waiting qa`

---

## 6. Decisión de arquitectura y aviso al equipo (SCRUM-87, antes de tocar el esquema)

- [X] 6.1 Registrar la decisión de agregar `owner_id` a `product_catalog` en `docs/documento-proyecto.md §6` con fecha (regla de `modos/arquitectura.md`: una decisión de modelo de datos se registra ahí antes/junto con la spec, no dentro de ella)
- [X] 6.2 Coordinar con el equipo el número de migración (próximo libre verificado: 031) y avisar que se va a tocar `product_catalog`, tabla que SCRUM-86 ya construyó encima

## 7. Migración y RPC nueva

- [X] 7.1 `supabase/migrations/031_create_personal_product.sql`: `ALTER TABLE product_catalog ADD COLUMN owner_id uuid NULL REFERENCES auth.users(id) ON DELETE CASCADE` + índice en `owner_id`
- [X] 7.2 Función `security definer` nueva (`create_personal_product`) — resuelve household internamente vía `auth.uid()`, inserta producto + variante (+ marca si hay) en una transacción, valida nombre/categoría/unidad/cantidad del lado del servidor, devuelve el `id` del producto creado
- [X] 7.3 `grant execute` de la función solo a `authenticated` (mismo patrón que `ensure_general_list_id`/`find_general_list_id`)
- [X] 7.4 Test SQL de la función (`supabase/tests/031_create_personal_product.test.sql`: sin sesión, nombre/categoría/unidad/cantidad inválidos, sin household, con household sin compartir, con household compartiendo, con marca) — mismo criterio que los tests SQL ya existentes para `029`/`030`

## 8. Servicios y hook del formulario

- [ ] 8.1 `services/category.service.ts`: `listCategories()` (lectura directa de `categories`)
- [ ] 8.2 `services/personal-product.service.ts`: `createPersonalProduct(input)` (llama al RPC nuevo)
- [ ] 8.3 `constants/create-product-form.constants.ts`: textos, tabla/columnas, estados del formulario
- [ ] 8.4 `hooks/useCreateProductForm.ts`: estado (`idle`/`open`/`submitting`/`success`/`error`), validación de nombre/categoría (CA-02), llamada al servicio

## 9. UI del formulario y conexión con las dos pantallas

- [ ] 9.1 `components/create-product-form/CreateProductForm.tsx` — nombre, marca, categoría (select de `listCategories()`), unidad + cantidad de tamaño, checkbox "Compartir con mi household" (visible solo si el usuario tiene uno)
- [ ] 9.2 `features/my-products/MyProducts.tsx`: botón "+ Agregar producto" en la cabecera, abre `CreateProductForm`, refresca el listado al guardar con éxito
- [ ] 9.3 `features/catalog/components/CatalogEmptyState.tsx` (CA-04): agregar el enlace/botón que abre el mismo `CreateProductForm`
- [ ] 9.4 `features/my-products/services/my-products.service.ts` → extender `listMyProducts()` de forma aditiva (también por `owner_id` cuando no hay household, o además del household si el usuario tiene productos propios sin compartir)

## 10. Tests

- [ ] 10.1 `personal-product.service.test.ts` — éxito (con/sin household, con/sin compartir), nombre/categoría inválidos, error del RPC
- [ ] 10.2 `category.service.test.ts`
- [ ] 10.3 `useCreateProductForm.test.ts` — validación, transición de estados
- [ ] 10.4 `CreateProductForm.test.tsx` — casos de aceptación §13 de `SPEC.md` (CA-01, CA-02, CA-03 con sus 3 variantes, CA-04)
- [ ] 10.5 Ajustar `my-products.service.test.ts` existente para la extensión aditiva (sin romper los casos de SCRUM-86 ya cubiertos)

## 11. Cierre

- [ ] 11.1 Validar contra los 9 casos de aceptación de `SPEC.md §13` (los 4 de SCRUM-86 siguen pasando + los 5 nuevos de HU-56)
- [ ] 11.2 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` (los corre Daniel, no Claude)
- [ ] 11.3 Subagente `code-reviewer` (siempre) y `security-reviewer` (toca auth/household/formularios — obligatorio según `AGENTS.md`)
- [ ] 11.4 Comentario en Jira SCRUM-88 (HU-57) señalando dónde quedó el formulario, para cuando se agreguen los campos de tienda/precio
- [ ] 11.5 Descripción del PR (incluyendo "How should this be manually tested?") y paso de label `in progress` → `waiting qa`
