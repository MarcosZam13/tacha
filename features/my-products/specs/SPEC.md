# Feature: MyProducts

Historia: [SCRUM-86 / HU-55](https://tacha.atlassian.net/browse/SCRUM-86): ver mis productos personalizados. Sprint actual.

Historias relacionadas que NO se hacen acá: SCRUM-87 / HU-56 (crear producto personalizado), HU-57 (tienda y precio de referencia), HU-58 (editar/eliminar). Esta historia es de solo lectura.

---

## 1. Objetivo

Que el usuario vea, dentro de la sección Catálogo, los productos que él mismo (o su household) agregó al catálogo porque no estaban en el catálogo global — para poder reutilizarlos más adelante sin crearlos de nuevo.

## 2. Alcance

Incluye:

- Ruta `/catalogo/mis-productos`, como segundo sub-tab navegable de la sección Catálogo (el primero es "Buscar", `features/catalog`).
- Promover `CatalogTabs` de `features/catalog/components/` a `components/catalog-tabs/`, igual que `RecipesTabs`, para que ambos sub-tabs lo compartan como links reales (hoy "Mis productos" se ve pero no navega).
- Listar los productos con `product_catalog.source = 'manual'` que pertenecen al household del usuario actual (ver §12, contrato de datos).
- Una tarjeta por variante (mismo criterio visual que "Buscar": `features/catalog` ya resuelve "producto + tamaño"), con la etiqueta "Agregado por mí" (CA-01) superpuesta.
- Estado vacío con el texto exacto del ticket: "Agregá productos que no encontrás en el catálogo" (CA-02), sin acción real todavía — HU-56 (el formulario) no existe.
- Estados: cargando, error, vacío, con resultados.

No incluye (ver §14):

- Crear, editar, tienda/precio o eliminar un producto personalizado (HU-56, HU-57, HU-58).
- Resolver qué pasa cuando un usuario sin household pueda tener un producto personal propio (hoy la tabla no tiene esa columna; ver §12).
- Cambiar el modelo de datos de `product_catalog` (no se agrega ninguna columna ni migración).

## 3. Entradas

- Sesión del usuario actual (para resolver su household, si tiene).
- Resultado de `listMyProducts()`: `CatalogProduct[]` (mismo tipo que ya usa "Buscar", reutilizado).

## 4. Salidas

- Una tarjeta por variante de cada producto personalizado del household del usuario, con la etiqueta "Agregado por mí".
- Estado vacío con el texto de CA-02 si no hay ninguno (incluye el caso "el usuario no tiene household").
- Mensaje de carga o de error según corresponda.

## 5. Reglas de negocio

- Se muestra una fila de `product_catalog` si y solo si `source = 'manual'` **y** `household_id` es igual al household del usuario actual (nunca por `source = 'manual'` solo: eso incluiría los "productos madre" curados globalmente por el equipo en SCRUM-131, que tienen `household_id = null` y no fueron agregados por ningún usuario).
- Si el usuario no pertenece a ningún household, la pantalla siempre muestra el estado vacío (CA-02): hoy `product_catalog` no tiene una columna de dueño individual (`owner_id`), así que no hay dónde buscar un producto "solo mío" sin household. Esto es una limitación conocida del modelo de datos, no un bug — ver §15.
- El orden de las tarjetas es alfabético por nombre de producto, igual que no hay orden especial pedido en el ticket.
- La etiqueta "Agregado por mí" se muestra en todas las tarjetas de esta pantalla (no depende de qué miembro del household la agregó, porque la tabla no guarda eso).

## 6. Estados

- `loading`
- `error`
- `empty`
- `ready`

(Misma unión de estados que ya usa `features/catalog` para "Buscar", con los mismos nombres de `CATALOG_SEARCH_STATUS` salvo que acá no hay estado `idle`: la pantalla busca sola al montar, no espera que el usuario escriba nada.)

## 7. Errores

- Falla la consulta a `household_members` o a `product_catalog` (red, error de Supabase): mensaje de error genérico, igual look & feel que "Buscar" (`role="alert"`).
- Sin sesión: no debería poder llegar a esta ruta (el guard de sesión ya protege `(app)/`); si pasara, se trata igual que "sin household" → estado vacío.

## 8. UI esperada

- Título "Catálogo" + `CatalogTabs` (ahora como links) con "Mis productos" activo.
- Grilla de tarjetas (2 columnas en móvil, 4 en escritorio — mismo layout que "Buscar").
- Tarjeta: foto o inicial, "{producto} — {tamaño}", precio (o "Sin precio disponible"), y la etiqueta "Agregado por mí" como badge visible.
- Estado vacío: mensaje de CA-02, centrado, mismo estilo que `CatalogEmptyState`.

## 9. Accesibilidad

- El badge "Agregado por mí" es texto real (no solo color), legible por lector de pantalla.
- Mismas reglas que "Buscar": error con `role="alert"`, tabs con `aria-current="page"`.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`.
- Reutilizar `CatalogProduct`, `toCatalogCards` y `CatalogCard` en vez de duplicar el mapeo de producto→tarjeta.
- Sin librerías nuevas.
- Separar UI (`MyProducts.tsx`) de lógica (`hooks/useMyProductsViewModel.ts`), sin fetch ni `useEffect` en el `.tsx`.
- Sin RPC nueva: `product_catalog`/`product_catalog_variants` ya tienen policy de lectura pública (`using (true)`), así que una consulta directa desde el cliente alcanza — no se toca RLS ni se agrega ninguna policy.

## 11. Dependencias

- `@/types/catalog.types` (`CatalogProduct`)
- `features/catalog/utils/toCatalogCards` y `features/catalog/components/CatalogCard` (promovidos a compartido, ver `plan.md`)
- `components/catalog-tabs/CatalogTabs` (promovido desde `features/catalog/components/CatalogTabs`)
- `services/supabase.client`
- `@/components/ui` (Spinner)

## 12. Contratos externos

- Tabla `product_catalog` (columnas: `id`, `name`, `category_id`, `household_id`, `source`) — policy `"public read product_catalog" using (true)`, ya existente, sin cambios.
- Tabla `product_catalog_variants` — policy `"public read variants" using (true)`, ya existente, sin cambios.
- Tabla `household_members` (columnas `user_id`, `household_id`) para resolver el household del usuario actual — misma tabla que ya usa `features/household`, consulta propia y mínima (solo `household_id`), sin importar el servicio de esa feature (ver `plan.md`, decisión 4).
- No se crea ninguna migración ni política nueva.

## 13. Casos de aceptación

- Caso 1 (CA-01): el usuario tiene household y ese household tiene productos `source='manual'` → se ven con la etiqueta "Agregado por mí".
- Caso 2 (CA-02): el household del usuario no tiene productos manuales (o el usuario no tiene household) → estado vacío con el texto del ticket.
- Caso 3: falla la consulta → mensaje de error.
- Caso 4: los productos madre curados globalmente (`household_id = null`, `source = 'manual'`) nunca aparecen acá, sin importar cuántos existan.

## 14. Casos fuera de alcance

- Crear un producto personalizado (HU-56/SCRUM-87).
- Tienda y precio de referencia manual (HU-57).
- Editar o eliminar (HU-58).
- Soporte para "producto personal sin household" (requiere decisión de modelo de datos fuera de esta historia).
- Cualquier cambio a `docs/documento-proyecto.md` §4.5.1 (la sección asume un patrón `owner_id` que la tabla no tiene; se deja como está, documentado acá para quien trabaje HU-56).

## 15. Notas de implementación

- `docs/documento-proyecto.md` §4.5.1 dice que un producto personalizado sigue "el mismo patrón `owner_id` + `household_id` nullable que las listas", pero `product_catalog` real (confirmado contra la base: `id, name, category_id, household_id, source, created_at`) no tiene `owner_id`. La sección §6 del mismo documento, en cambio, define `household_id` como "NULL = catálogo global, con valor = producto propio" — que es lo que efectivamente se implementó (y lo que usó SCRUM-131 para los 12 productos madre curados). Esta historia sigue §6 y la implementación real, no §4.5.1. Queda para quien trabaje HU-56 decidir si hace falta `owner_id` para soportar productos personales sin household.
