# Feature: ProductGroups

Grupos de productos: combos nombrados de presentaciones del catálogo, cada una con su cantidad por defecto, para agregarlas juntas a la lista (`docs/documento-proyecto.md` §4.11). La feature crece por historia: esta versión cubre **HU-72 (SCRUM-109)** y **HU-74 (SCRUM-111)**; HU-73 (SCRUM-110, en QA), HU-75 y HU-75b se agregan como secciones nuevas en sus PRs.

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
- Botón "+ Crear grupo" y un botón de acción en el estado vacío: llegan con HU-73 (sin el flujo de crear serían links a una pantalla que no existe).
- "Agregar a lista", editar y eliminar desde la tarjeta (HU-74, HU-75, HU-75b).
- Botón "Agregar desde grupo" junto al buscador de General (`docs/DESIGN.md` §7.8): la entrada que piden los criterios es "Gestionar mis grupos".
- Recordatorios o periodicidad (`docs/documento-proyecto.md` §4.11).

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
