# Feature: ProductGroups

Grupos de productos: combos nombrados de presentaciones del catálogo, cada una con su cantidad por defecto, para agregarlas juntas a la lista (`docs/documento-proyecto.md` §4.11). La feature crece por historia: esta versión cubre **HU-72 (SCRUM-109)**, **HU-73 (SCRUM-110)** y **HU-74 (SCRUM-111)**; HU-75 y HU-75b se agregan como secciones nuevas en sus PRs.

## HU-72 — Ver "Mis grupos" (SCRUM-109)

## 1. Objetivo
Darle al usuario un lugar donde ver sus grupos de productos guardados (combos que compra seguido), para reutilizarlos sin buscar producto por producto. Esta historia crea la pantalla y el modelo de datos sobre el que construyen HU-73 a HU-75b.

## 2. Alcance
Incluye:
- Botón "Gestionar mis grupos" en la cabecera de la vista General (`/lista`).
- Pantalla "Mis grupos" (`/lista/grupos`): una tarjeta por grupo visible con su nombre y cuántos productos tiene.
- Estado vacío con el texto "Agrupá los productos que siempre comprás juntos".
- Tablas `product_groups` y `product_group_items` con RLS de lectura (migración `054`).

No incluye: crear (HU-73), agregar a la lista (HU-74), editar (HU-75), eliminar (HU-75b).

## 3. Entradas
- Sesión de Supabase (cualquiera, también anónima, igual que listas y recetas).
- Filas visibles de `product_groups` con el conteo de sus `product_group_items`.

## 4. Salidas
- Lista de tarjetas `{ id, name, countLabel, isShared }`, o el estado vacío.
- Navegación General → Mis grupos y de vuelta.

## 5. Reglas de negocio
1. Un grupo es visible para su dueño si es personal (`household_id` nulo), o para todos los miembros de su familia si está compartido. Un grupo personal de otro miembro de la familia no se ve.
2. Quien sale de la familia deja de ver los grupos compartidos con ella (aunque los haya creado); el grupo se queda con la familia, igual que la lista general. Sus grupos personales no cambian.
3. Si la familia se borra, sus grupos compartidos vuelven a ser personales de quien los creó (igual que recetas y planes).
4. "Cuántos productos" = cantidad de presentaciones del grupo (cada una cuenta una vez, sin importar su cantidad). "1 producto" / "N productos".
5. Orden: el modificado más recientemente primero (`updated_at desc`).
6. Una tarjeta de un grupo compartido muestra la etiqueta "Compartido".
7. Desde el cliente solo se lee: no hay políticas de escritura. Crear y editar llegan con HU-73/HU-75 por funciones que validan quién puede compartir o dejar de compartir.

## 6. Estados
`loading` · `error` · `empty` · `ready` (unión derivada de `PRODUCT_GROUPS_STATUS`).

## 7. Errores
- Falla la lectura: "No pudimos cargar tus grupos. Intenta de nuevo." con `role="alert"` y botón "Reintentar", que vuelve a pedir los grupos.

## 8. UI esperada
- En `/lista`: título + link con estilo de botón secundario "Gestionar mis grupos".
- En `/lista/grupos`: link "Volver a la lista", título "Mis grupos", grilla de tarjetas `group-card` (nombre, "N productos", etiqueta "Compartido" si aplica).
- Estado vacío: el texto del CA-02 en un recuadro punteado (mismo estilo que los otros estados vacíos de la app).
- La navegación sigue marcando "General" (es una pantalla secundaria, `docs/DESIGN.md` §3.1).

## 9. Accesibilidad
- "Gestionar mis grupos" es un `<Link>` con texto visible (es navegación, no una acción).
- Las tarjetas van en una lista (`<ul>`/`<li>`), cada una con el nombre del grupo como `<h2>`.
- El error usa `role="alert"`; la carga, `Spinner` con nombre accesible "Cargando tus grupos".

## 10. Restricciones técnicas
- TypeScript estricto, sin `any`; Tailwind con tokens `tacha-*`.
- ViewModel (`useProductGroupsViewModel`) separado de la presentación; textos y nombres de tablas en `features/product-groups/constants/`.
- Sin escritura desde el cliente.

## 11. Dependencias
- `@/components/ui` (Button, Chip, Spinner), `@/constants` (`APP_ROUTE`, `BUTTON_VARIANT`, `CHIP_TONE`), `services/supabase.client.ts` (`ensureSession`, `getSupabaseClient`).
- `features/shopping-list/ShoppingListInner.tsx` (solo el link de la cabecera).

## 12. Contratos externos
- Tabla `product_groups`: `id uuid pk`, `owner_id uuid not null → auth.users on delete cascade`, `household_id uuid null → households on delete set null`, `name text not null` (sin espacios a los costados, 1-60 caracteres), `created_at`, `updated_at`.
- Tabla `product_group_items`: `id uuid pk`, `group_id → product_groups on delete cascade`, `product_catalog_variant_id → product_catalog_variants` (sin `on delete`, igual que `list_items`), `quantity integer` (1-99), `position integer` (≥ 0), `unique (group_id, product_catalog_variant_id)`.
- RLS de lectura de `product_groups`: mismo predicado que `lists` (dueño si es personal; miembros de la familia si es compartido). RLS de lectura de `product_group_items`: visible si su grupo es visible.
- Permisos: `authenticated` solo `select`; `anon` y `public`, nada.
- Lectura (PostgREST): `product_groups?select=id,name,household_id,updated_at,product_group_items(count)&order=updated_at.desc`.

## 13. Casos de aceptación
- Caso 1 (CA-01): en `/lista` hay un "Gestionar mis grupos" que lleva a `/lista/grupos`.
- Caso 2 (CA-01): con grupos, se ve una tarjeta por grupo con su nombre y "N productos".
- Caso 3 (CA-01): un grupo compartido por otro miembro de mi familia también aparece, con "Compartido".
- Caso 4 (CA-01): un grupo personal de otro usuario (aunque sea de mi familia) no aparece.
- Caso 5 (CA-02): sin grupos, se ve "Agrupá los productos que siempre comprás juntos".
- Caso 6: si la lectura falla, se ve el error y "Reintentar" vuelve a cargar.

Dónde se prueba cada uno: casos 1 y 5 en E2E (`E2E-GRUPOS-01`, `-02`); casos 2, 5 y 6 en `tests/ProductGroups.test.tsx`; casos 3 y 4 (visibilidad real con RLS) en `supabase/tests/054_create_product_groups.test.sql`. Todavía no hay forma de crear grupos desde la app (ni por RLS), así que el E2E con tarjetas reales llega con HU-73.

## 14. Casos fuera de alcance
- Botón "+ Crear grupo" y un botón de acción en el estado vacío: llegan con HU-73 (sin el flujo de crear serían links a una pantalla que no existe). *(Se suman en HU-73, ver abajo.)*
- "Agregar a lista", editar y eliminar desde la tarjeta (HU-74, HU-75, HU-75b).
- Botón "Agregar desde grupo" junto al buscador de General (`docs/DESIGN.md` §7.8): la entrada que piden los criterios es "Gestionar mis grupos".
- Recordatorios o periodicidad (`docs/documento-proyecto.md` §4.11).

## HU-73 — Crear un grupo de productos (SCRUM-110)

## 1. Objetivo
Que el usuario arme un grupo con nombre, con varios productos y la cantidad que compra de cada uno, para agregarlos todos juntos a la lista la próxima vez (HU-74). Sin esta historia, "Mis grupos" (HU-72) no puede tener grupos.

## 2. Alcance
Incluye:
- Botón "+ Crear grupo" en la cabecera de "Mis grupos" y botón "Crear tu primer grupo" en el estado vacío (los dos que HU-72 §14 dejó para esta historia).
- Pantalla `/lista/grupos/nuevo`, en este orden:
  1. "Nombre del grupo".
  2. Buscador: catálogo global, mis productos y los compartidos por mi familia.
  3. Una fila compacta por producto elegido: nombre, tamaño, cantidad (−/+) y "Quitar".
  4. Casilla "Compartir con mi familia", solo si tengo familia.
  5. "Guardar grupo" y "Cancelar".
- Al guardar, vuelve a "Mis grupos" y el grupo nuevo aparece primero.
- Un producto personal que está en un grupo cuenta como "en uso" en "Mis productos": eliminarlo lo archiva en vez de borrarlo, y el aviso de eliminar menciona los grupos. Así se cierra HU-58 CA-02 ("lista, grupo o receta").
- Migración `056` y el seed de grupos de demo (`supabase/seed-demo-groups.sql`).

No incluye: agregar a la lista (HU-74), editar (HU-75) ni eliminar (HU-75b).

## 3. Entradas
- `name: string`.
- `items: { variantId: string; productName: string; sizeLabel: string; isPersonal: boolean; quantity: number }[]`, en el orden en que se eligieron.
- `shareWithHousehold: boolean`. Solo se muestra si el usuario pertenece a una familia (`hasHousehold()`).

## 4. Salidas
- Una fila nueva en `product_groups` con sus `product_group_items`, en una sola transacción (`create_product_group`).
- Navegación a `/lista/grupos`.

## 5. Reglas de negocio
1. Nombre obligatorio: de 1 a 60 caracteres, sin contar los espacios a los costados (el mismo check que la `054`).
2. Al menos 1 producto y como máximo 50.
3. Cantidad por producto: entero de 1 a 99, empieza en 1.
4. El buscador muestra una opción por presentación (variante). Si se elige una presentación que ya está en el grupo, se le suma 1 a su fila en vez de duplicarla, sin pasar de 99.
5. Se pueden elegir productos del catálogo global, mis productos personales y los compartidos por mi familia. Nunca productos archivados (HU-58).
6. El grupo es personal por defecto: la casilla de compartir arranca desmarcada (CA-03). Si se marca, el grupo queda con la familia del usuario.
7. Un grupo compartido solo puede tener productos del catálogo global o compartidos con la familia. Si el grupo tiene un producto personal sin compartir y se marca "Compartir", no se guarda y se muestra: "Para compartir el grupo, quita estos productos personales: X". Los otros miembros no podrían ver esos productos.
8. La base vuelve a validar todo: nombre, límites, que cada variante sea visible para el usuario y no esté archivada, y la regla 7. El cliente nunca manda `owner_id` ni `household_id`.
9. Eliminar un producto personal que está en un grupo lo archiva (`delete_personal_product`), y el aviso de eliminar cuenta los grupos (`get_personal_product_usage.group_count`).
10. Mientras hay cambios sin guardar, la pantalla los informa (`useReportUnsavedChanges`, igual que el editor de recetas), así "Cerrar sesión" avisa antes de perderlos.

## 6. Estados
- Editor: `editing` · `saving` · `error`.
- Casilla de compartir: `loading` · `hidden` · `visible`.

## 7. Errores
- Nombre vacío o de más de 60 caracteres: error en el campo, ligado con `aria-describedby`.
- Sin productos: "Agrega al menos un producto."
- Con 50 productos: elegir otro producto no agrega una fila nueva, y el `role="status"` avisa "Llegaste al máximo de 50 productos." (sumarle a una fila que ya está sí se puede).
- Regla 7: el mensaje de la regla, con los nombres de los productos.
- Falla el guardado: "No pudimos guardar el grupo. Intenta de nuevo." (`role="alert"`). Se conserva todo lo escrito.
- Falla la búsqueda: el mensaje actual de `ProductSearch`.

## 8. UI esperada
- Link "Volver a Mis grupos" y título "Crear grupo".
- Input "Nombre del grupo".
- `ProductSearch` con la etiqueta "Buscar producto".
- Filas compactas: nombre y tamaño, `QuantityStepper`, botón "Quitar".
- Checkbox "Compartir con mi familia", si aplica.
- Botones "Guardar grupo" (primario) y "Cancelar" (secundario, vuelve a "Mis grupos").

## 9. Accesibilidad
- Cada input con su label; cada error ligado a su campo con `aria-describedby`.
- "Quitar" y los botones de cantidad incluyen el producto en su nombre accesible ("Quitar Leche — 1 L", "Sumar uno a Leche — 1 L").
- Un `role="status"` anuncia cuando se agrega o se quita una fila.
- Las filas van en una lista (`<ul>`/`<li>`).

## 10. Restricciones técnicas
- Reutilizar `ProductSearch`, `useProductSearch`, `QuantityStepper`, `Checkbox`, `hasHousehold` y `useReportUnsavedChanges`.
- El aplanado de productos a "una opción por variante" se promueve de `features/shopping-list/utils/toCatalogSearchResults.ts` a `utils/`, porque pasa a tener dos consumidores. Va en un commit de refactor aparte, sin cambio de comportamiento.
- `useProductSearch` recibe la función de búsqueda como parámetro opcional (por defecto `searchCatalog`): la lista, recetas y el catálogo no cambian.
- Se escribe solo por RPC (`create_product_group`). La 054 no da `insert` al cliente.
- ViewModel separado de la vista; reducer puro para el grupo en armado, testeable sin React.

## 11. Dependencias
- HU-72 (SCRUM-109): tablas, pantalla, constantes y servicio de la feature.
- HU-58 (SCRUM-89): `delete_personal_product` y `get_personal_product_usage` (052), que esta historia amplía.
- `services/catalog.service.ts` (`searchCatalogIncludingOwn`, nueva) y `services/personal-product.service.ts` (`hasHousehold`).
- `features/my-products` (aviso de uso con grupos).

## 12. Contratos externos (migración `056_create_product_group.sql`)
- `search_catalog_including_own(search_term text default '', household_id uuid default null)`:
  - Función nueva, de solo lectura (`stable`, invoker).
  - Misma forma de retorno que `search_catalog` y, por cada producto, además `is_personal boolean` (si es un producto personal sin compartir), para la regla 7.
  - Trae también los productos del usuario y de su familia: no filtra `owner_id`/`household_id`, porque la RLS de `product_catalog` (032) ya limita. Siempre filtra `archived_at is null`.
  - Ejecución: solo `authenticated`.
  - `search_catalog` no cambia: es un contrato fijado por SCRUM-131.
- `create_product_group(group_name text, share_with_household boolean, item_list jsonb) → uuid`:
  - `security definer`.
  - `item_list = [{ "variant_id": uuid, "quantity": int }]`; la posición es el orden del array.
  - Errores: `42501` sin sesión; `22023` en validaciones (nombre, límites, variante repetida, regla 7); `P0002` si una variante no existe, no es visible para el usuario o está archivada.
- `get_personal_product_usage(target_product_id uuid) → (active_list_count, recipe_count, group_count)`: suma `group_count`, que cuenta todos los grupos que tienen alguna variante del producto, también los de otros miembros (solo la cantidad).
- `delete_personal_product(target_product_id uuid)`: también archiva si hay `product_group_items` que apunten a sus variantes.

## 13. Casos de aceptación
- Caso 7 (CA-01): "+ Crear grupo" abre `/lista/grupos/nuevo` con el campo de nombre y el buscador. "Crear tu primer grupo" también.
- Caso 8 (CA-01): busco "leche" y elijo una presentación: aparece una fila con cantidad 1. Con "+" la subo a 3.
- Caso 9 (CA-01): busco un producto mío de "Mis productos": aparece y se puede agregar.
- Caso 10 (CA-01): elegir otra vez la misma presentación le suma 1 a la fila existente.
- Caso 11 (CA-02): "Quitar" saca la fila antes de guardar.
- Caso 12 (CA-03): sin familia, no se ve la casilla y el grupo queda personal.
- Caso 13 (CA-03): con familia y sin marcar, el grupo es personal y otro miembro no lo ve. Marcándola, otro miembro lo ve.
- Caso 14 (CA-03): con un producto personal sin compartir en el grupo, marcar "Compartir" y guardar muestra el error que nombra el producto. Sin marcar, se guarda.
- Caso 15: con el nombre vacío o sin productos, no guarda y muestra el error.
- Caso 16: al guardar, vuelvo a "Mis grupos" y la tarjeta muestra el nombre y "N productos", primera en la lista.
- Caso 17: eliminar un producto mío que está en un grupo: el aviso menciona el grupo, y el producto se archiva en vez de borrarse.

Dónde se prueba cada uno:
- Casos 7, 8, 11, 15 y 16: E2E (`E2E-GRUPOS-03` a `-05`).
- Casos 8, 10, 11, 12 y 15: `tests/ProductGroupEditor.test.tsx`, junto con el reducer y la validación.
- Casos 9, 13, 14 y 17 (visibilidad real, familias y archivado): `supabase/tests/056_create_product_group.test.sql`.

## 14. Casos fuera de alcance
- Etiqueta "Mi producto" en los resultados del buscador.
- Reordenar las filas arrastrándolas.
- Duplicar un grupo.
- Agregar el grupo a la lista, editarlo o eliminarlo (HU-74, HU-75, HU-75b).

## 15. Notas de implementación
- `search_catalog` no se modifica porque es un contrato fijado por SCRUM-131. Por eso la búsqueda con productos propios es una función aparte, igual que `list_catalog_by_category`. El costo es duplicar el SQL de agregación de marcas y precios.
- Si la PR #101 (SCRUM-158) ya está en `develop`, `searchCatalogIncludingOwn` aplica el mismo `sortBySearchRelevance` que `searchCatalog`, para que los dos buscadores ordenen igual.
- Los casos se numeran desde el 7 para no chocar con los de HU-72 (1 a 6).

## HU-74 — Agregar un grupo a la lista (SCRUM-111)

## 1. Objetivo
Agregar todos los productos de un grupo a la lista con un solo botón, sin buscarlos uno por uno.

## 2. Alcance
Incluye:
- Botón "Agregar a lista" en cada tarjeta de "Mis grupos".
- Suma directa a la lista general activa (la de la familia si el usuario pertenece a una, si no la personal), sin pantallas intermedias.
- Mensaje de resultado en "Mis grupos" con un link "Ver lista".
- Corrección de `docs/DESIGN.md` §7.6 (:221): quitar "dispara la reconciliación de cantidades (7.3)".

No incluye: agregar a sublistas por fecha o listas privadas, elegir a qué lista, deshacer.

## 3. Entradas
- `groupId: string` (de la tarjeta).

## 4. Salidas
- Filas nuevas o cantidades sumadas en `list_items` de la lista general.
- Resultado `{ added: string[], skipped: string[] }` → mensaje.

## 5. Reglas de negocio
1. Por cada producto del grupo, en el orden del grupo: si la lista ya tiene una fila **pendiente** de exactamente esa presentación, se suma la cantidad del grupo (CA-02); si no, se crea una fila con esa cantidad. Otra presentación del mismo producto → fila aparte (CA-03). Una fila ya tachada no se reabre: se crea una pendiente nueva (regla actual de 035).
2. Sin reconciliación ni avisos de faltante (no es receta: doc §4.9.1).
3. Productos archivados o que el usuario ya no puede ver: se saltan y se nombran en el mensaje.
4. Todo o nada: si falla a mitad, no queda nada agregado (una transacción).
5. Dos agregados simultáneos a la misma lista se hacen uno detrás del otro (mismo bloqueo que recetas).
6. La lista no guarda ninguna referencia al grupo.
7. Mientras se agrega, el botón de esa tarjeta se deshabilita ("Agregando…").

## 6. Estados
Por tarjeta: `idle` · `adding` · `added` · `error`.

## 7. Errores
- Falla: "No pudimos agregar el grupo. Intenta de nuevo." (`role="alert"`).
- El grupo ya no existe (lo borró otro miembro): "Este grupo ya no existe." y se recarga la pantalla.

## 8. UI esperada
- Botón "Agregar a lista" en la tarjeta.
- Después: `role="status"` con "Agregamos N productos de «Nombre» a tu lista." + link "Ver lista". Si hubo saltados: "No se agregaron: X, Y (ya no están disponibles)."

## 9. Accesibilidad
- El nombre accesible del botón incluye el grupo ("Agregar Mercado quincenal a la lista").
- El resultado se anuncia con `role="status"`.

## 10. Restricciones técnicas
- Una RPC (`add_group_to_general_list`); nada de bucles de llamadas desde el cliente.
- Reutilizar `ensure_general_list_id` y `add_units_to_list_item`.

## 11. Dependencias
- HU-72 (SCRUM-109): pantalla, tarjeta y tablas. El código no depende de HU-73.
- HU-73 (SCRUM-110): sin ella un usuario no tiene grupos, así que el E2E y la QA esperan a que esté en `develop`.

## 12. Contratos externos
- `add_group_to_general_list(target_group_id uuid) → jsonb { added: text[], skipped: text[] }` (invoker, migración `057`). Errores: `42501` sin sesión; `P0002` grupo no visible o inexistente.

## 13. Casos de aceptación
- Caso 18 (CA-01): cada tarjeta tiene "Agregar a lista".
- Caso 19 (CA-01): con la lista vacía, agregar un grupo de 3 productos → la lista tiene esas 3 filas con las cantidades del grupo.
- Caso 20 (CA-02): si la lista ya tiene "Leche 1 L" ×1 y el grupo trae "Leche 1 L" ×2 → queda una sola fila ×3, sin preguntar nada.
- Caso 21 (CA-02): agregar el mismo grupo dos veces duplica las cantidades, sin filas nuevas.
- Caso 22 (CA-03): si la lista tiene "Leche 1 L" y el grupo trae "Leche 2 L" → dos filas.
- Caso 23: con "Leche 1 L" tachada en la lista, agregar el grupo crea una fila pendiente nueva.
- Caso 24: un producto archivado del grupo no se agrega y aparece en el mensaje.
- Caso 25: un miembro de la familia agrega un grupo compartido → va a la lista de la familia.

## 14. Casos fuera de alcance
- Botón "Agregar desde grupo" junto al buscador de General (DESIGN §7.8).
- Elegir cantidades al momento de agregar (para eso se edita el grupo, HU-75).
- Etiqueta de origen "grupo" en las filas de la lista (doc :128): requiere guardar el origen, y la regla 6 dice que no se guarda.

Dónde se prueba cada uno: casos 19-25 en `supabase/tests/057_add_group_to_general_list.test.sql` (reglas de la lista con datos reales); 18 y el mensaje en `tests/ProductGroups.test.tsx`; el recorrido completo (crear un grupo → agregarlo → verlo en la lista) en E2E, cuando HU-73 esté en `develop`.
