# Feature: ProductGroups

Grupos de productos: combos nombrados de presentaciones del catálogo, cada una con su cantidad por defecto, para agregarlas juntas a la lista (`docs/documento-proyecto.md` §4.11). La feature crece por historia: esta versión cubre **HU-72 (SCRUM-109)**; HU-73, HU-74, HU-75 y HU-75b se agregan como secciones nuevas en sus PRs.

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
