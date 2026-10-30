# Feature: Catálogo — buscar productos

Historias:
- [SCRUM-83 / HU-51](https://tacha.atlassian.net/browse/SCRUM-83): buscar productos en el catálogo global. Sprint 2. **Implementado** (PR #67, `waiting qa`).
- [SCRUM-84 / HU-52](https://tacha.atlassian.net/browse/SCRUM-84): filtrar el catálogo por categoría. Sprint 3. **Esta historia** (secciones marcadas "HU-52" abajo; el resto es HU-51, sin cambios).

Historias que se apoyan en esta pantalla (no se hacen acá): SCRUM-85 (detalle del producto), SCRUM-86 (hecho, "Mis productos"), SCRUM-87 (crear producto).

---

## 1. Objetivo

Que el usuario encuentre rápido un producto del catálogo global, estilo Uber Eats: escribe en una barra de búsqueda y ve tarjetas con foto, producto + tamaño ("Leche — 1L", sin marca) y el precio aproximado como rango.

**HU-52:** además, que pueda navegar el catálogo organizado por categoría (fila de chips), sin depender solo de escribir texto, y que ambos filtros se puedan combinar.

## 2. Alcance

Incluye:

- Ruta `/catalogo` con la barra de sub-tabs de la sección: "Buscar" (activo) y "Mis productos" (hecho en SCRUM-86).
- Barra de búsqueda arriba y resultados en tarjetas, en cuadrícula (2 columnas en móvil, 4 en escritorio, como pide `docs/DESIGN.md` §7.1).
- Una tarjeta por **variante** (producto madre + tamaño): foto, nombre + tamaño, rango de precio.
- Filtrado en tiempo real mientras se escribe (con debounce).
- Estados: guía inicial, cargando, error, sin resultados, con resultados.
- Ampliar el mapeo de `searchCatalog` para traer `image_url` y `price_ranges`, que la RPC ya devuelve.
- Promover a código compartido `formatSizeLabel` y `formatPriceRange` (con sus constantes), hoy en `features/shopping-list/`, en un commit de refactor aparte y sin cambio de comportamiento. Lo pidió Marcos, dueño de lista, con el precedente de SCRUM-120.

**HU-52 (SCRUM-84) — añadido:**
- **Fila de chips de categoría encima de la cuadrícula de resultados** (`docs/DESIGN.md` §7.1; `documento-proyecto.md` §4.5), con un chip "Todas" más uno por cada fila de `categories`.
- El chip de la categoría activa se resalta en teal; tocarlo de nuevo (o tocar "Todas") quita el filtro.
- El filtro de categoría se combina con la búsqueda por texto (CA-03): con término buscable y categoría activa, se aplican los dos a la vez.
- Listar productos de una categoría cuando el usuario toca su chip, aunque no haya escrito texto (sin tocar `search_catalog`, ver §6 y §15). Al entrar a `/catalogo` sin texto y sin chip activo, se mantiene el `idle` actual (decidido con el responsable de la historia, 2026-10-20) — no se lista todo el catálogo de entrada.

No incluye: ver la sección 14.

## 3. Entradas

- `query: string` — lo que escribe el usuario en la barra de búsqueda.
- Resultado de `searchCatalog(term)`: `CatalogProduct[]` (productos madre con sus variantes).

**HU-52 — añadido:**
- `activeCategoryId: string | null` — la categoría del chip activo; `null` = "Todas"/sin filtro.
- `categories: Category[]` — las filas de `categories` (hoy 7), para dibujar los chips.
- Resultado de `listCatalogByCategory(categoryId)` (RPC nueva, §12): `CatalogProduct[]`.

## 4. Salidas

- Una tarjeta por variante de cada producto encontrado.
- Cada tarjeta muestra: foto (o marcador con la inicial), `"{producto} — {tamaño}"` y el rango de precio.
- Mensaje de guía, de carga, de error o de "sin resultados" según el estado.

**HU-52 — añadido:**
- Fila de chips de categoría, con el chip activo resaltado en teal.
- Cuando hay una categoría activa y un término buscado a la vez, el resultado respeta ambos (CA-03).

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

**HU-52 — añadido (11-15):**
11. **No se modifica `search_catalog`.** Decisión ya tomada y registrada en `supabase/specs/SCRUM-131/SPEC.md` §6 ("`search_catalog` no cambia de firma ni de contrato") y confirmada otra vez en el ticket de Jira de SCRUM-131 ("`search_catalog` keeps its contract"). El filtro por categoría nunca se le pasa como parámetro.
12. **Filtro de categoría sobre un término buscado (CA-03):** `search_catalog` ya devuelve `category` por producto desde que SCRUM-131 pobló `categories` (antes siempre era `null`), pero `searchCatalog()` lo descarta al mapear hoy. Con categoría activa y término buscable, se filtran en el cliente los resultados de `search_catalog` cuyo `category` coincida con el nombre de la categoría activa.
13. **Listado por categoría sin término buscable:** se usa `list_catalog_by_category(category_id, household_id)` (RPC nueva, §12 de Contratos), solo cuando hay un chip de categoría activo (`category_id` distinto de null). **El chip "Todas" nunca llama a esta RPC**: es una acción que limpia el filtro (`activeCategoryId = null`) y devuelve la pantalla al `idle` de siempre (ver §6) — por eso tampoco se resalta como si fuera un chip activo (ver §9). Entrar a `/catalogo` sin tocar ningún chip queda en ese mismo `idle` (decidido con el responsable de la historia, 2026-10-20).
14. **Las categorías se muestran siempre como chips** leyendo `categories` directo (lectura pública, sin RPC) — no solo las que tengan producto hoy. Mismo criterio que va a necesitar el selector de categoría de SCRUM-87 (HU-56 CA-01).
15. Cambiar de chip cancela la petición en curso igual que ya hace `useProductSearch` con la búsqueda — una respuesta tardía de un filtro viejo no pisa la del filtro actual.

## 6. Estados

Unión derivada de constantes (no varios booleanos):

- `idle` — todavía no hay término buscable (vacío o menos de 2 caracteres).
- `loading` — hay término buscable y la respuesta aún no llega.
- `error` — la búsqueda falló.
- `empty` — la búsqueda respondió sin coincidencias.
- `ready` — hay tarjetas.

**HU-52 — decidido con el responsable de la historia (2026-10-20):** la versión anterior de este documento (escrita durante SCRUM-83, §15) especulaba que SCRUM-84 reemplazaría `idle` por un catálogo completo al entrar a `/catalogo`. Esa nota nunca había sido confirmada con fecha, así que se preguntó en vez de asumirla. Se mantiene `idle` igual que hoy mientras no haya ni texto ni chip activo — no se toca el comportamiento ya validado por QA en SCRUM-83. Tocar un chip sí dispara `loading`/`ready` aunque no haya texto (cubre CA-01/CA-02).

## 7. Errores

- Falla la red o la RPC: mensaje de error (`PRODUCT_SEARCH_TEXT.SEARCH_ERROR`), no "sin resultados", porque no se sabe si es cierto.
- La RPC devuelve una variante sin `price_ranges` o con precios `null`: no es un error; se muestra "sin precio".
- La imagen no carga: se mantiene el `alt`; la ausencia de URL ya tiene su marcador.

**HU-52 — añadido:**
- Una categoría sin productos todavía (no pasa hoy con las 12 madres curadas) no es error: es `empty` con un mensaje propio.

## 8. UI esperada

- Título de la sección "Catálogo" y barra de sub-tabs: "Buscar" (activo, subrayado teal) · "Mis productos" (SCRUM-86).
- Barra de búsqueda con etiqueta y placeholder ("Busca un producto, ej. leche").
- Cuadrícula de tarjetas: foto arriba, nombre + tamaño, precio en terracota ("₡800 – ₡1 200").
- Estado `idle`: mensaje guía ("Escribe al menos 2 letras para buscar") — sin cambios con HU-52 (decidido, ver §6): solo se sale de `idle` al escribir texto buscable o al tocar un chip de categoría.
- Estado `loading`: spinner.
- Estado `empty`: mensaje "No encontramos productos con ese nombre" **y** la sugerencia de crearlo en "Mis productos" (solo texto, sin enlace).
- Estado `error`: mensaje de error con `role="alert"`.

**HU-52 — añadido:**
- Fila de chips horizontal debajo de la barra de búsqueda y encima de la cuadrícula: chip "Todas" + un chip por categoría, scroll horizontal si no caben en una línea. Chip activo con fondo/borde teal.

## 9. Accesibilidad

- La barra de búsqueda tiene `label` asociado (lo da el primitivo `Input`).
- El `nav` de sub-tabs tiene `aria-label`; el tab activo lleva `aria-current="page"` y el deshabilitado `aria-disabled="true"`.
- Cada foto tiene `alt` con el nombre del producto; el marcador con inicial es decorativo (`aria-hidden`).
- El error se anuncia con `role="alert"`; el spinner no depende solo del color.
- El precio no se comunica solo con color: lleva texto.

**HU-52 — añadido:**
- Fila de chips: contenedor con `role="group"` y `aria-label` (ej. "Filtrar por categoría"); cada chip es un botón con `aria-pressed` según si es el activo.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`; el `jsonb` de `variants` se tipa con el contrato de la RPC (como ya hace `CatalogSearchVariantRow`).
- Tailwind con los tokens `tacha-*`; sin CSS Modules.
- ViewModel (`hooks/`) con la lógica; los `.tsx` solo presentan; funciones flecha con tipo de retorno explícito.
- Cero literales: textos, límites, estados, rutas y nombres en `constants/` (constants-standards).
- `app/` solo la ruta delgada; la UI vive en `features/catalog/`.
- Los cambios a `services/catalog.service.ts` y `types/catalog.types.ts` son **solo aditivos**: lista y recetas siguen compilando y funcionando igual.
- La promoción de `formatSizeLabel` y `formatPriceRange` va en un commit propio, sin cambio de comportamiento: lista solo actualiza sus imports y su pantalla se ve igual.
- No se modifica la RPC `search_catalog`, ni migraciones, ni datos.

**HU-52 — añadido:**
- Reusar el componente `chip` del design system si ya existe uno en `components/ui`; si no, crear uno nuevo ahí (compartido, no local a esta feature).
- La RPC nueva (`list_catalog_by_category`) es de solo lectura, sin escrituras ni cambios a datos existentes.
- Migración nueva: `supabase/migrations/029_list_catalog_by_category.sql` (número confirmado, 2026-10-20).

## 11. Dependencias

- `hooks/useProductSearch.ts`, `services/catalog.service.ts`, `types/catalog.types.ts`, `constants/catalog.constants.ts` (SCRUM-120).
- `@/components/ui` (`Input`, `Spinner`).
- Tablas/RPC de lectura: `search_catalog` (y, detrás, `product_catalog`, `product_catalog_variants`, `latest_prices`, `stores`).
- `utils/formatSizeLabel.ts` y `utils/formatPriceRange.ts` (raíz), más `CATALOG_BASE_UNIT_LABEL` y `PRICE_FORMAT` en `constants/catalog.constants.ts`: se mueven desde `features/shopping-list/` en esta PR (ver [plan.md](plan.md#decisiones)).

**HU-52 — añadido:**
- `components/catalog-tabs/CatalogTabs.tsx`, `components/catalog-card/CatalogCard.tsx`, `utils/toCatalogCards.ts`, `utils/getOverallPriceRange.ts` (compartidos desde SCRUM-86).
- Tabla `categories` (lectura directa, sin RPC).
- RPC nueva `list_catalog_by_category` (§12).

## 12. Contratos externos

`search_catalog(search_term text, household_id uuid)` devuelve `product_catalog_id`, `name`, `category`, `variants` (cada variante con `variant_id`, `name`, `base_unit`, `base_quantity`, `image_url`, `brands`, `price_ranges`). Es de solo lectura. SCRUM-131 lo mantiene; su contrato **no se toca** en esta historia.

Se lee con la sesión anónima actual (`getSupabaseClient`). No hay escrituras.

**HU-52 — añadido:**
- `categories`: tabla de solo lectura pública (`select using (true)`), columnas `id`, `name`. Se lee directo vía PostgREST, sin RPC.
- **`list_catalog_by_category(category_id uuid default null, household_id uuid default null)` — RPC nueva.** Misma forma de retorno que `search_catalog` (misma agregación de marcas y rango de precio por tienda). Filtra tiendas visibles por `household_id` igual que `search_catalog`. Detalle de implementación en `plan.md`.

## 13. Casos de aceptación

HU-51
- [ ] CA-01: el sub-tab "Buscar" dentro de "Catálogo" muestra una barra de búsqueda arriba y los resultados en tarjetas, en una cuadrícula. *(Parcial por dependencia: vive en `/catalogo` hasta que exista el sidebar.)*
- [ ] CA-02: cada tarjeta muestra el producto y su tamaño (ej. "Leche — 1L"), sin marca, con el precio aproximado como rango.
- [ ] CA-03: los resultados se filtran en tiempo real a medida que el usuario escribe.
- [ ] CA-04: si no hay resultados, se ofrece crear el producto ahí mismo — botón que abre el mismo formulario "Agregar producto" que usa "Mis productos" (`CreateProductForm`), sin salir de "Buscar". *(Actualizado 2026-10-29: era solo una sugerencia de texto; SCRUM-87/HU-56 lo implementó como un botón real — contrato completo en `features/my-products/specs/SPEC.md` §13, caso 9.)*

Casos adicionales:
- [ ] Con 0 o 1 carácter no se llama a la base y se muestra la guía.
- [ ] Una variante sin foto muestra el marcador con la inicial.
- [ ] Una variante sin precios muestra "sin precio", no "₡0".
- [ ] Una variante con mínimo igual a máximo muestra un solo precio.
- [ ] Un error de red muestra el error, no "sin resultados".
- [ ] Escribir rápido no deja en pantalla la respuesta de un término viejo.
- [ ] Recargar la página con texto en la barra no rompe nada (la barra arranca vacía).

HU-52 (SCRUM-84)
- [ ] CA-01: una fila de chips de categoría aparece encima del grid de resultados, con un chip por cada categoría de `categories` (hoy 7) más un chip "Todas".
- [ ] CA-02: el chip de la categoría activa se resalta en teal; tocarlo de nuevo (o tocar "Todas") quita el filtro.
- [ ] CA-03: con categoría activa y término de búsqueda escrito, el resultado respeta ambos filtros a la vez.

Casos adicionales (HU-52):
- [ ] Elegir un chip sin haber escrito texto lista los productos de esa categoría.
- [ ] Cambiar de chip rápido no deja en pantalla el resultado de un chip viejo.
- [ ] Una categoría sin productos muestra el mensaje vacío propio, no un error.
- [ ] Al entrar a `/catalogo` sin texto y sin chip activo, se mantiene el mensaje guía (`idle`) — no se lista el catálogo completo de entrada.

## 14. Casos fuera de alcance

- **Detalle del producto, marcas y precio por supermercado** (SCRUM-85).
- **Crear producto / "Mis productos"**: el sub-tab ya quedó habilitado en SCRUM-86; el formulario de creación con categoría es SCRUM-87.
- **Agregar a la lista desde la tarjeta.**
- **Sidebar / shell de la app:** no existe; la ruta y los sub-tabs no cambian cuando se enganche.
- **Filtrar por household / tienda visible:** ninguna de las dos RPC envía `household_id` hoy; cuando exista `households` se resuelve para todas las pantallas a la vez.
- **Reescribir lista:** del lado de `features/shopping-list/` solo se actualizan imports y se retira lo que se mueve; nada de su comportamiento ni de su pantalla.
- **Administrar categorías (crear/editar/borrar):** `categories` se sigue poblando solo por migración.
- **Cambios a la RPC `search_catalog`, al esquema o a los datos**, y la decisión de qué son las "madres" del catálogo (SCRUM-126, de Marcos).
- **Paginación del listado por categoría:** el catálogo global hoy tiene 12 madres; no hace falta todavía.

*(Se retiró de esta lista el bullet "Filtro por categoría (SCRUM-84): hoy `categories` tiene 0 filas..." que tenía la versión anterior — ya no aplica: `categories` tiene 7 filas desde que SCRUM-131 se mergeó a `develop`, y esta historia es justamente la que lo implementa.)*

## 15. Notas de implementación

- **Limitación de datos conocida:** las 28 madres viejas son productos sueltos con marca y tamaño (ej. "Leche Dos Pinos…"), no "Leche". Mientras eso no se resuelva del todo (SCRUM-133 las retira), el nombre en la tarjeta puede incluir la marca aunque la pantalla no la agregue. No se corrige acá.
- **Parpadeo conocido de `useProductSearch`:** al cambiar el término, la respuesta vieja se descarta hasta que llega la nueva (el estado pasa por `loading`). Es comportamiento del hook compartido; no se modifica en esta historia. **Mejora sugerida a QA** (que decide si la registra como ticket): agregar al hook una opción, apagada por defecto, que conserve los resultados anteriores mientras llega la respuesta nueva.
- **Pantalla inicial sin tarjetas:** la RPC no devuelve filas con menos de 2 caracteres y su contrato no se toca, así que antes de escribir (y sin chip activo) solo se muestra el mensaje guía. Con HU-52 esto sigue igual (decidido con el responsable de la historia, 2026-10-20, ver §6): el único cambio es que tocar un chip de categoría sí saca a la pantalla del `idle` sin necesidad de texto.

**HU-52 — añadido:**
- **Por qué una RPC nueva y no extender `search_catalog`:** `supabase/specs/SCRUM-131/SPEC.md` §6 y el ticket de Jira de SCRUM-131 ya dejan escrito, como parte de ese ticket (mergeado y `Done`), que `search_catalog` "no cambia de firma ni de contrato". Agregarle un parámetro de categoría ahora rompería esa decisión ya tomada, y afectaría a todo lo que ya la llama (lista general, recetas). Por eso el listado por categoría va en una función nueva, de solo lectura, que reusa la misma agregación (marcas, rango de precio) que `search_catalog` ya tiene.
- **Por qué todas las categorías como chips, no solo las que tienen producto hoy:** deja lista la misma fuente (`categories`, lectura directa) para el selector de categoría de SCRUM-87 (HU-56 CA-01), sin calcular "categorías con producto" en la RPC nueva — complejidad que ninguna CA de HU-52 pide. Hoy da el mismo resultado visible (las 12 madres curadas cubren las 7 categorías).
- **Impacto en otros tickets revisado:** SCRUM-85 recibe el mismo `CatalogProduct`/`productId` sin importar si vino de `search_catalog` o de `list_catalog_by_category`. SCRUM-87 puede reusar la misma lectura de `categories`. Ningún ticket de Marcos o Roberto (130/132/133) toca `categories`, `product_catalog` ni ninguna RPC de catálogo — revisado contra `docs/sprints.md` y los comentarios de sus tickets.
- **Avisado en Jira (2026-10-20):** se dejó comentario en SCRUM-85 y SCRUM-87 sobre la RPC nueva `list_catalog_by_category` y que `categories` ya se puede leer directo para selectores, mismo patrón que los avisos de SCRUM-86.
