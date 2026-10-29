# Feature: MyProducts

Historias:
- [SCRUM-86 / HU-55](https://tacha.atlassian.net/browse/SCRUM-86): ver mis productos personalizados. Sprint 3. **Implementado** (Done, mergeado).
- [SCRUM-87 / HU-56](https://tacha.atlassian.net/browse/SCRUM-87): crear un producto personalizado. Sprint 4. **Esta historia** (secciones marcadas "HU-56" abajo; el resto es HU-55, sin cambios).

Historias relacionadas que NO se hacen acá: HU-57 (SCRUM-88, tienda y precio de referencia), HU-58 (SCRUM-89, editar/eliminar).

---

## 1. Objetivo

Que el usuario vea, dentro de la sección Catálogo, los productos que él mismo (o su household) agregó al catálogo porque no estaban en el catálogo global — para poder reutilizarlos más adelante sin crearlos de nuevo.

**HU-56:** además, que el usuario pueda crear ese producto él mismo desde un formulario corto, sin depender de que el equipo lo cure en el catálogo global (CA-01/CA-02), y que quede marcado como propio, personal por defecto y compartible con su household (CA-03). El estado de "sin resultados" de "Buscar" también enlaza a este mismo formulario (CA-04, fusionado desde la HU-54 original).

## 2. Alcance

Incluye:

- Ruta `/catalogo/mis-productos`, como segundo sub-tab navegable de la sección Catálogo (el primero es "Buscar", `features/catalog`).
- Promover `CatalogTabs` de `features/catalog/components/` a `components/catalog-tabs/`, igual que `RecipesTabs`, para que ambos sub-tabs lo compartan como links reales (hoy "Mis productos" se ve pero no navega).
- Listar los productos con `product_catalog.source = 'manual'` que pertenecen al household del usuario actual (ver §12, contrato de datos).
- Una tarjeta por variante (mismo criterio visual que "Buscar": `features/catalog` ya resuelve "producto + tamaño"), con la etiqueta "Agregado por mí" (CA-01) superpuesta.
- Estado vacío con el texto exacto del ticket: "Agregá productos que no encontrás en el catálogo" (CA-02), sin acción real todavía — HU-56 (el formulario) no existe.
- Estados: cargando, error, vacío, con resultados.

**HU-56 (SCRUM-87) — añadido:**

- Botón "+ Agregar producto" en la cabecera de "Mis productos" (CA-01), que abre un formulario corto: nombre, marca, categoría (select, ver §12), tamaño/presentación (unidad base + cantidad base) y un checkbox opcional "Compartir con mi household" (visible solo si el usuario pertenece a uno — ver §5).
- Validación de obligatorios (nombre, categoría) antes de habilitar "Guardar" (CA-02).
- El producto se guarda con `owner_id` del usuario que lo crea, y `household_id` solo si marcó compartir (CA-03) — ver §5 y §15 para la justificación completa.
- El componente del formulario (`CreateProductForm`) se construye directo en `components/create-product-form/` (compartido desde el día 1, no dentro de esta feature), porque CA-04 ya confirma un segundo consumidor real (`features/catalog/`) dentro de esta misma historia.
- El enlace de CA-04 se agrega a `features/catalog/components/CatalogEmptyState.tsx`, que ya tiene el texto ("Si no existe, puedes crearlo en 'Mis productos'") pero sin enlace real — hoy solo es texto porque, según su propio comentario en el código, "esa pantalla todavía no existe" (ya existe desde SCRUM-86).
- Sin subida de foto: todo producto personalizado usa el placeholder que `CatalogCard` ya muestra para un producto sin `image_url` (decisión del dueño de la historia, 2026-10-28, para no consumir el almacenamiento gratuito de Supabase).
- Migración nueva: columna `owner_id` en `product_catalog` + función `security definer` nueva para la escritura (ver §12).

No incluye (ver §14):

- Crear, editar, tienda/precio o eliminar un producto personalizado (HU-56, HU-57, HU-58). *(Nota 2026-10-28: HU-56/crear pasa a estar en alcance de esta historia — ver bloque de arriba; HU-57/HU-58 siguen fuera.)*
- Resolver qué pasa cuando un usuario sin household pueda tener un producto personal propio (hoy la tabla no tiene esa columna; ver §12). *(Nota 2026-10-28: se resuelve en esta historia agregando `owner_id` — ver §15.)*
- Cambiar el modelo de datos de `product_catalog` (no se agrega ninguna columna ni migración). *(Nota 2026-10-28: esta historia sí agrega `owner_id` — ver §12 y §15; era cierto para SCRUM-86, ya no para SCRUM-87.)*

## 3. Entradas

- Sesión del usuario actual (para resolver su household, si tiene).
- Resultado de `listMyProducts()`: `CatalogProduct[]` (mismo tipo que ya usa "Buscar").
- **HU-56:** datos del formulario (nombre, marca, categoría, unidad/cantidad base, compartir sí/no).

## 4. Salidas

- Una tarjeta por variante de cada producto personalizado del household del usuario, con la etiqueta "Agregado por mí".
- Estado vacío con el texto de CA-02 si no hay ninguno (incluye el caso "el usuario no tiene household").
- Mensaje de carga o de error según corresponda.
- **HU-56:** el producto recién creado, visible de inmediato en el listado (sin recargar la página).

## 5. Reglas de negocio

- Se muestra una fila de `product_catalog` si y solo si `source = 'manual'` **y** `household_id` es igual al household del usuario actual (nunca por `source = 'manual'` solo: eso incluiría los "productos madre" curados globalmente por el equipo en SCRUM-131, que tienen `household_id = null` y no fueron agregados por ningún usuario). *(HU-56: ver más abajo, también se busca por `owner_id` cuando no hay household.)*
- Si el usuario no pertenece a ningún household, la pantalla siempre muestra el estado vacío (CA-02) **a menos que tenga productos propios creados vía HU-56** (ver bloque HU-56 abajo) — antes de esta historia no había ninguna forma de tener un producto "solo mío" sin household; con `owner_id` ya sí.
- El orden de las tarjetas es alfabético por nombre de producto, igual que no hay orden especial pedido en el ticket.
- La etiqueta "Agregado por mí" se muestra en todas las tarjetas de esta pantalla (no depende de qué miembro del household la agregó, porque la tabla no guarda eso).

**HU-56 (SCRUM-87) — añadido:**

- Al crear, el producto siempre queda personal por defecto: `owner_id = auth.uid()`, `household_id = null`, sin importar si el usuario pertenece a un household o no (CA-03, "personal por defecto"). `household_id` **nunca** se asigna automáticamente por el solo hecho de pertenecer a un household — mismo criterio que ya usa el proyecto para las listas personales al unirse a un household (HU-34b: `decide_personal_lists`, verificado que existe de verdad en la base). Compartir es una decisión explícita, nunca un efecto automático de la membresía.
- Si el usuario marca el checkbox "Compartir con mi household" y pertenece a uno, `household_id` se guarda con el household actual, en el mismo momento de crear. Si no pertenece a ninguno, el checkbox no se muestra.
- Después de creado, `household_id` no cambia solo: entrar o salir de un household después no mueve ni comparte retroactivamente un producto ya creado (una "re-decisión" tipo HU-34b para productos queda fuera de esta historia — ver §14).
- `listMyProducts()` se extiende (de forma aditiva, sin tocar su contrato para quien ya la usa) para que, cuando no haya household, también busque por `owner_id = auth.uid()` en vez de resolver siempre a lista vacía.
- Nombre y categoría son obligatorios (CA-02). Marca y la opción de compartir son opcionales. El tamaño (unidad + cantidad base) es obligatorio para poder crear la variante: `product_catalog_variants.base_unit`/`base_quantity` son `not null` en el esquema real (verificado).

## 6. Estados

- `loading`
- `error`
- `empty`
- `ready`

(Misma unión de estados que ya usa `features/catalog` para "Buscar", con los mismos nombres de `CATALOG_SEARCH_STATUS` salvo que acá no hay estado `idle`: la pantalla busca sola al montar, no espera que el usuario escriba nada.)

**HU-56 — estados propios del formulario:** `idle` (cerrado), `open` (abierto, sin enviar), `submitting`, `success` (cierra y refresca el listado), `error` (muestra el mensaje, el formulario sigue abierto con los datos ya escritos).

## 7. Errores

- Falla la consulta a `household_members` o a `product_catalog` (red, error de Supabase): mensaje de error genérico, igual look & feel que "Buscar" (`role="alert"`).
- Sin sesión: no debería poder llegar a esta ruta (el guard de sesión ya protege `(app)/`); si pasara, se trata igual que "sin household" → estado vacío.

**HU-56:**

- Nombre vacío o categoría sin seleccionar → error inline (CA-02), antes de llamar al RPC — "Guardar" no se habilita.
- Falla el RPC (red, validación del servidor): mensaje de error, el formulario se mantiene abierto con lo ya escrito (no se pierde el trabajo del usuario).

## 8. UI esperada

- Título "Catálogo" + `CatalogTabs` (ahora como links) con "Mis productos" activo.
- Grilla de tarjetas (2 columnas en móvil, 4 en escritorio — mismo layout que "Buscar").
- Tarjeta: foto o inicial, "{producto} — {tamaño}", precio (o "Sin precio disponible"), y la etiqueta "Agregado por mí" como badge visible.
- Estado vacío: mensaje de CA-02, centrado, mismo estilo que `CatalogEmptyState`.

**HU-56:** botón "+ Agregar producto" en la cabecera, junto al título. Formulario corto (nombre, marca, categoría —select—, unidad + cantidad de tamaño, checkbox "Compartir con mi household" si aplica), con acciones "Guardar"/"Cancelar". Mismo componente reusado desde el enlace de CA-04 en `features/catalog/`.

## 9. Accesibilidad

- El badge "Agregado por mí" es texto real (no solo color), legible por lector de pantalla.
- Mismas reglas que "Buscar": error con `role="alert"`, tabs con `aria-current="page"`.

**HU-56:** cada campo del formulario con su `label` asociado; errores de validación anunciados (`role="alert"` o `aria-live`); el checkbox con su label clara, no solo un ícono.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`.
- Reutilizar `CatalogProduct`, `toCatalogCards` y `CatalogCard` en vez de duplicar el mapeo de producto→tarjeta.
- Sin librerías nuevas.
- Separar UI (`MyProducts.tsx`) de lógica (`hooks/useMyProductsViewModel.ts`), sin fetch ni `useEffect` en el `.tsx`.
- Sin RPC nueva: `product_catalog`/`product_catalog_variants` ya tienen policy de lectura pública (`using (true)`), así que una consulta directa desde el cliente alcanza — no se toca RLS ni se agrega ninguna policy. *(Esto sigue siendo cierto para la lectura; HU-56 sí necesita una RPC nueva para escribir — ver abajo.)*

**HU-56:**

- El formulario se controla a mano (sin librería de formularios nueva — mismo criterio "sin librerías nuevas" ya vigente).
- La escritura pasa siempre por la función RPC nueva (ver §12); nunca un `insert` directo desde el cliente — la política de la tabla no lo permite (verificado, ver §12).

## 11. Dependencias

- `@/types/catalog.types` (`CatalogProduct`)
- `features/catalog/utils/toCatalogCards` y `features/catalog/components/CatalogCard` (promovidos a compartido, ver `plan.md`)
- `components/catalog-tabs/CatalogTabs` (promovido desde `features/catalog/components/CatalogTabs`)
- `services/supabase.client`
- `@/components/ui` (Spinner)

**HU-56, añadido:**

- `categories` (lectura directa, pública — ver §12)
- `CATALOG_BASE_UNIT` (unidad de tamaño, ya existente y compartida)
- Función RPC nueva (ver §12)

## 12. Contratos externos

- Tabla `product_catalog` (columnas reales, verificadas contra la base: `id`, `name`, `category_id`, `household_id`, `source`, `created_at`) — policy `"public read product_catalog"` (`for select to public using (true)`), ya existente, sin cambios para lectura.
- Tabla `product_catalog_variants` (columnas reales: `id`, `product_catalog_id`, `name`, `base_unit`, `base_quantity`, `image_url`, `created_at`) — policy `"public read variants"`, ya existente, sin cambios para lectura.
- Tabla `household_members` (columnas `user_id`, `household_id`, `role`, `created_at`, `personal_lists_decision`) para resolver el household del usuario actual — misma tabla que ya usa `features/household`, consulta propia y mínima (solo `household_id`), sin importar el servicio de esa feature (ver `plan.md`, decisión 4 de SCRUM-86).
- Sin RPC ni policy nueva para **lectura**.

**HU-56 (SCRUM-87) — contratos nuevos:**

- Migración nueva: `ALTER TABLE product_catalog ADD COLUMN owner_id uuid NULL REFERENCES auth.users(id) ON DELETE CASCADE`. Nullable porque los 12 productos madre curados en SCRUM-131 nunca tuvieron (ni tendrán) dueño — quedan con `owner_id = null` para siempre.
- Función nueva `security definer`, nombre a confirmar (propuesto: `create_personal_product`), que en una sola transacción: resuelve `household_id` internamente vía `auth.uid()` contra `household_members` (nunca recibido como parámetro del cliente, mismo criterio de seguridad que `ensure_general_list_id`), inserta la fila de `product_catalog` (`owner_id`, `household_id` si corresponde, `category_id`, `name`, `source = 'manual'`) y la fila de `product_catalog_variants` (`base_unit`, `base_quantity`), y si se dio marca, la fila de `product_brands`. Devuelve el producto creado.
- Tabla `categories`: confirmado contra la base real (`pg_policies`) que su policy `"public read categories"` es `for select to public using (true)` — se lee directo, sin RPC, igual que ya hace SCRUM-84 para sus chips (heads-up de Daniel en el comentario de Jira `10049` sobre SCRUM-87, puesto durante SCRUM-84).
- Confirmado contra la base real (`information_schema.role_table_grants`) que `anon`/`authenticated` **no tienen** `INSERT` sobre `product_catalog` ni `product_catalog_variants` — solo `SELECT`/`REFERENCES`/`TRIGGER`. La función nueva es la única puerta de escritura.
- Número de migración: el próximo libre verificado contra la base real es **031** (última aplicada: `030_fix_list_catalog_by_category_param_names`) — sin confirmar todavía con el equipo, pendiente de coordinar antes de crear el archivo.

## 13. Casos de aceptación

- Caso 1 (CA-01): el usuario tiene household y ese household tiene productos `source='manual'` → se ven con la etiqueta "Agregado por mí".
- Caso 2 (CA-02): el household del usuario no tiene productos manuales (o el usuario no tiene household ni productos propios por `owner_id`) → estado vacío con el texto del ticket.
- Caso 3: falla la consulta → mensaje de error.
- Caso 4: los productos madre curados globalmente (`household_id = null`, `owner_id = null`, `source = 'manual'`) nunca aparecen acá, sin importar cuántos existan.

**HU-56, añadido:**

- Caso 5 (CA-01/CA-02): nombre y/o categoría vacíos → "Guardar" no se habilita / error inline, no se llama al RPC.
- Caso 6 (CA-03, sin household): usuario sin household crea un producto → queda con `owner_id` propio, `household_id` null, visible solo para él en "Mis productos" (vía `owner_id`, no vía `household_id`).
- Caso 7 (CA-03, con household, compartiendo): usuario con household marca "Compartir con mi household" → el producto queda con el `household_id` de su household, visible para todo el household.
- Caso 8 (CA-03, con household, sin compartir): usuario con household NO marca el checkbox → el producto queda con `household_id` null, visible solo para él (por `owner_id`) aunque tenga household.
- Caso 9 (CA-04): desde el estado "sin resultados" de "Buscar" (`features/catalog`), el enlace abre el mismo formulario que el botón de "Mis productos", y guarda igual.

## 14. Casos fuera de alcance

- Tienda y precio de referencia manual (HU-57/SCRUM-88).
- Editar o eliminar (HU-58/SCRUM-89).
- Subir una foto real (placeholder por decisión del dueño de la historia, 2026-10-28 — ver §15).
- "Re-decidir" qué pasa con un producto ya creado si el usuario cambia de household después (no existe una HU-34b equivalente para productos todavía).
- Cualquier cambio a `docs/documento-proyecto.md §4.5.1` (la sección ya describía el patrón `owner_id` + `household_id` nullable que esta historia implementa — no hace falta corregirla, solo cerrarla).

## 15. Notas de implementación

- `docs/documento-proyecto.md §4.5.1` dice que un producto personalizado sigue "el mismo patrón `owner_id` + `household_id` nullable que las listas", pero `product_catalog` real (confirmado contra la base: `id, name, category_id, household_id, source, created_at`) no tenía `owner_id` hasta esta historia. La sección §6 del mismo documento, en cambio, define `household_id` como "NULL = catálogo global, con valor = producto propio" — que es lo que efectivamente implementó SCRUM-131 para los 12 productos madre curados. SCRUM-86 siguió §6 y la implementación real, no §4.5.1, y dejó anotado en su propio `plan.md` (tabla de decisiones) que agregar `owner_id` quedaba para quien trabajara HU-56.
- **Actualización 2026-10-28 (SCRUM-87):** se decide sí agregar `owner_id`, cerrando esa deuda (decisión registrada también en `docs/documento-proyecto.md §6`, con fecha). Si el producto se comparte con el household y el usuario sale de él después, deja de verlo (el acceso a algo con `household_id` se calcula por membresía actual, mismo criterio que ya aplica `lists`) pero el producto no se borra; si nunca se compartió, su `owner_id` no depende de ningún household y nunca se pierde. `listMyProducts()` (SCRUM-86) se extiende de forma aditiva: cuando no hay household, además de poder devolver vacío, ahora también busca por `owner_id = auth.uid()`.
