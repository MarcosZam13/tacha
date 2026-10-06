# Feature: Catálogo — buscar productos

Historias:
- [SCRUM-83 / HU-51](https://tacha.atlassian.net/browse/SCRUM-83): buscar productos en el catálogo global. Sprint 2.

Historias que se apoyan en esta pantalla (no se hacen acá): SCRUM-84 (filtro por categoría), SCRUM-85 (detalle del producto), SCRUM-86, SCRUM-87 (crear producto).

---

## 1. Objetivo

Que el usuario encuentre rápido un producto del catálogo global, estilo Uber Eats: escribe en una barra de búsqueda y ve tarjetas con foto, producto + tamaño ("Leche — 1L", sin marca) y el precio aproximado como rango.

## 2. Alcance

Incluye:

- Ruta `/catalogo` con la barra de sub-tabs de la sección: "Buscar" (activo) y "Mis productos" (visible pero deshabilitado).
- Barra de búsqueda arriba y resultados en tarjetas, en cuadrícula (2 columnas en móvil, 4 en escritorio, como pide `docs/DESIGN.md` §7.1).
- Una tarjeta por **variante** (producto madre + tamaño): foto, nombre + tamaño, rango de precio.
- Filtrado en tiempo real mientras se escribe (con debounce).
- Estados: guía inicial, cargando, error, sin resultados, con resultados.
- Ampliar el mapeo de `searchCatalog` para traer `image_url` y `price_ranges`, que la RPC ya devuelve.
- Promover a código compartido `formatSizeLabel` y `formatPriceRange` (con sus constantes), hoy en `features/shopping-list/`, en un commit de refactor aparte y sin cambio de comportamiento. Lo pidió Marcos, dueño de lista, con el precedente de SCRUM-120.

No incluye: ver la sección 14.

## 3. Entradas

- `query: string` — lo que escribe el usuario en la barra de búsqueda.
- Resultado de `searchCatalog(term)`: `CatalogProduct[]` (productos madre con sus variantes).

## 4. Salidas

- Una tarjeta por variante de cada producto encontrado.
- Cada tarjeta muestra: foto (o marcador con la inicial), `"{producto} — {tamaño}"` y el rango de precio.
- Mensaje de guía, de carga, de error o de "sin resultados" según el estado.

## 5. Reglas de negocio

1. Se busca en el catálogo **global** a través de `search_catalog(search_term, household_id)`. El contrato de la RPC no cambia.
2. Se busca con el buscador compartido que dejó SCRUM-120 (`useProductSearch`): mínimo 2 caracteres, máximo 80, debounce de 300 ms. Esas cifras vienen de `constants/catalog.constants.ts`, no se repiten.
3. **La tarjeta no muestra la marca** (documento-proyecto §4.5: la marca es un detalle del producto, no parte de su identidad).
4. Una tarjeta es una variante: un producto con 3 tamaños genera 3 tarjetas.
5. **Rango de precio** (documento-proyecto §4.5, "rango, no promedio"): mínimo de los mínimos y máximo de los máximos entre todas las tiendas visibles. Si mínimo y máximo son iguales se muestra un solo precio. Los precios `null` se ignoran.
6. Si la variante no tiene ningún precio, la tarjeta dice que no hay precio disponible; no muestra "₡0" ni queda en blanco.
7. Si la variante no tiene foto, se muestra un marcador con la inicial del producto (como las recetas), nunca una imagen rota (`docs/DESIGN.md` §6).
8. Con menos de 2 caracteres no se llama a la base: se muestra el mensaje de guía.
9. Una respuesta tardía de un término viejo no pisa la del término actual (ya lo garantiza `useProductSearch`; esta feature no lo rompe).
10. El frontend no filtra por dueño ni por household: la RPC decide qué devuelve.

## 6. Estados

Unión derivada de constantes (no varios booleanos):

- `idle` — todavía no hay término buscable (vacío o menos de 2 caracteres).
- `loading` — hay término buscable y la respuesta aún no llega.
- `error` — la búsqueda falló.
- `empty` — la búsqueda respondió sin coincidencias.
- `ready` — hay tarjetas.

## 7. Errores

- Falla la red o la RPC: mensaje de error (`PRODUCT_SEARCH_TEXT.SEARCH_ERROR`), no "sin resultados", porque no se sabe si es cierto.
- La RPC devuelve una variante sin `price_ranges` o con precios `null`: no es un error; se muestra "sin precio".
- La imagen no carga: se mantiene el `alt`; la ausencia de URL ya tiene su marcador.

## 8. UI esperada

- Título de la sección "Catálogo" y barra de sub-tabs: "Buscar" (activo, subrayado teal) · "Mis productos" (deshabilitado, "Próximamente").
- Barra de búsqueda con etiqueta y placeholder ("Busca un producto, ej. leche").
- Cuadrícula de tarjetas: foto arriba, nombre + tamaño, precio en terracota ("₡800 – ₡1 200").
- Estado `idle`: mensaje guía ("Escribe al menos 2 letras para buscar").
- Estado `loading`: spinner.
- Estado `empty`: mensaje "No encontramos productos con ese nombre" **y** la sugerencia de crearlo en "Mis productos" (solo texto, sin enlace).
- Estado `error`: mensaje de error con `role="alert"`.

## 9. Accesibilidad

- La barra de búsqueda tiene `label` asociado (lo da el primitivo `Input`).
- El `nav` de sub-tabs tiene `aria-label`; el tab activo lleva `aria-current="page"` y el deshabilitado `aria-disabled="true"`.
- Cada foto tiene `alt` con el nombre del producto; el marcador con inicial es decorativo (`aria-hidden`).
- El error se anuncia con `role="alert"`; el spinner no depende solo del color.
- El precio no se comunica solo con color: lleva texto.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`; el `jsonb` de `variants` se tipa con el contrato de la RPC (como ya hace `CatalogSearchVariantRow`).
- Tailwind con los tokens `tacha-*`; sin CSS Modules.
- ViewModel (`hooks/`) con la lógica; los `.tsx` solo presentan; funciones flecha con tipo de retorno explícito.
- Cero literales: textos, límites, estados, rutas y nombres en `constants/` (constants-standards).
- `app/` solo la ruta delgada; la UI vive en `features/catalog/`.
- Los cambios a `services/catalog.service.ts` y `types/catalog.types.ts` son **solo aditivos**: lista y recetas siguen compilando y funcionando igual.
- La promoción de `formatSizeLabel` y `formatPriceRange` va en un commit propio, sin cambio de comportamiento: lista solo actualiza sus imports y su pantalla se ve igual.
- No se modifica la RPC `search_catalog`, ni migraciones, ni datos.

## 11. Dependencias

- `hooks/useProductSearch.ts`, `services/catalog.service.ts`, `types/catalog.types.ts`, `constants/catalog.constants.ts` (SCRUM-120).
- `@/components/ui` (`Input`, `Spinner`).
- Tablas/RPC de lectura: `search_catalog` (y, detrás, `product_catalog`, `product_catalog_variants`, `latest_prices`, `stores`).
- `utils/formatSizeLabel.ts` y `utils/formatPriceRange.ts` (raíz), más `CATALOG_BASE_UNIT_LABEL` y `PRICE_FORMAT` en `constants/catalog.constants.ts`: se mueven desde `features/shopping-list/` en esta PR (ver [plan.md](plan.md#decisiones)).

## 12. Contratos externos

`search_catalog(search_term text, household_id uuid)` devuelve `product_catalog_id`, `name`, `category`, `variants`. Cada elemento de `variants` trae (entre otros): `variant_id`, `base_unit`, `base_quantity`, `image_url`, `brands`, `price_ranges` (objeto por `slug` de tienda con `{ min, max }`). Este contrato **no se toca**.

Se lee con la sesión anónima actual (`getSupabaseClient`). No hay escrituras.

## 13. Casos de aceptación

HU-51
- [ ] CA-01: el sub-tab "Buscar" dentro de "Catálogo" muestra una barra de búsqueda arriba y los resultados en tarjetas, en una cuadrícula. *(Parcial por dependencia: vive en `/catalogo` hasta que exista el sidebar.)*
- [ ] CA-02: cada tarjeta muestra el producto y su tamaño (ej. "Leche — 1L"), sin marca, con el precio aproximado como rango.
- [ ] CA-03: los resultados se filtran en tiempo real a medida que el usuario escribe.
- [ ] CA-04: si no hay resultados, se muestra un estado vacío con sugerencia de crear el producto en "Mis productos".

Casos adicionales:
- [ ] Con 0 o 1 carácter no se llama a la base y se muestra la guía.
- [ ] Una variante sin foto muestra el marcador con la inicial.
- [ ] Una variante sin precios muestra "sin precio", no "₡0".
- [ ] Una variante con mínimo igual a máximo muestra un solo precio.
- [ ] Un error de red muestra el error, no "sin resultados".
- [ ] Escribir rápido no deja en pantalla la respuesta de un término viejo.
- [ ] Recargar la página con texto en la barra no rompe nada (la barra arranca vacía).

## 14. Casos fuera de alcance

- **Filtro por categoría** (SCRUM-84): hoy `categories` tiene 0 filas y ninguna madre tiene categoría.
- **Detalle del producto, marcas y precio por supermercado** (SCRUM-85).
- **Crear producto / "Mis productos"** (SCRUM-87 y la historia de Mis productos): el sub-tab queda deshabilitado y el estado vacío solo sugiere, sin enlace.
- **Agregar a la lista desde la tarjeta.**
- **Sidebar / shell de la app:** no existe; la ruta y los sub-tabs no cambian cuando se enganche.
- **Filtrar por household / tienda visible:** `searchCatalog` no envía `household_id` hoy; cuando exista `households` se resuelve para todas las pantallas a la vez.
- **Reescribir lista:** del lado de `features/shopping-list/` solo se actualizan imports y se retira lo que se mueve; nada de su comportamiento ni de su pantalla.
- **Cambios a la RPC, al esquema o a los datos**, y la decisión de qué son las "madres" del catálogo (SCRUM-126, de Marcos).

## 15. Notas de implementación

- **Limitación de datos conocida:** las 28 madres actuales son productos sueltos con marca y tamaño (ej. "Leche Dos Pinos…"), no "Leche". Mientras eso no se resuelva (SCRUM-126), el nombre en la tarjeta puede incluir la marca aunque la pantalla no la agregue. No se corrige acá.
- **Parpadeo conocido de `useProductSearch`:** al cambiar el término, la respuesta vieja se descarta hasta que llega la nueva (el estado pasa por `loading`). Es comportamiento del hook compartido; no se modifica en esta historia. **Mejora sugerida a QA** (que decide si la registra como ticket): agregar al hook una opción, apagada por defecto, que conserve los resultados anteriores mientras llega la respuesta nueva. Al ser opcional, lista y recetas no cambian de comportamiento.
- **Pantalla inicial sin tarjetas:** la RPC no devuelve filas con menos de 2 caracteres y su contrato no se toca, así que antes de escribir solo se muestra el mensaje guía. Marcos lo confirmó (2026-10-03): HU-51 no pide listado inicial. El listado inicial sí se espera (la navegación por categoría es de primer nivel, documento de proyecto §4.5) y va en SCRUM-84 con una RPC nueva para listar por categoría, sin cambiar `search_catalog`. Hoy un listado no tendría sentido: el catálogo aún tiene madres sueltas (SCRUM-126).
