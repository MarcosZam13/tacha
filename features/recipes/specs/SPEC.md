# Feature: Recetas

Historias (criterios en [historias-usuario.md](../../../docs/historias-usuario.md); Jira es la fuente de verdad):

- [SCRUM-94 / HU-63](https://tacha.atlassian.net/browse/SCRUM-94): ver el catálogo de recetas. Sprint 1, mergeada.
- [SCRUM-95 / HU-64](https://tacha.atlassian.net/browse/SCRUM-95): crear o editar una receta. Sprint 1, mergeada.
- [SCRUM-96 / HU-64b](https://tacha.atlassian.net/browse/SCRUM-96): eliminar una receta. Sprint 2.

El cómo (archivos, datos, flujo, decisiones) está en [plan.md](plan.md); los pasos, en [tasks.md](tasks.md).

## 1. Objetivo

Que el usuario tenga sus recetas en un solo lugar para reutilizarlas en la lista de compras o en el planificador semanal:

- **SCRUM-94:** ver de un vistazo las recetas que tiene (nombre, foto, ingredientes principales y porciones base) para elegir cuáles usar.
- **SCRUM-95:** armar sus propias recetas (nombre, porciones base e ingredientes elegidos del catálogo, cada uno con su cantidad y unidad) y corregirlas después.
- **SCRUM-96:** sacar del catálogo una receta que ya no usa, sin miedo a borrarla por un clic accidental, para mantener su lista de recetas ordenada.

## 2. Alcance

### SCRUM-94: catálogo

- Ruta `/recetas` con la barra de sub-tabs de la sección: "Recetas" (activa) y "Planificador semanal" (visible pero deshabilitada hasta SCRUM-99).
- Catálogo de recetas en tarjetas: foto (o un marcador si la receta no tiene), nombre, porciones base y los primeros ingredientes, con un "+N más" si hay más.
- Las recetas vienen de Supabase (`recipes` + `recipe_ingredients`); cada ingrediente está ligado a un producto madre del catálogo (`product_catalog`), como pide documento-proyecto §4.9.
- Tablas nuevas `recipes` y `recipe_ingredients`, con RLS.
- Seed de demo (`supabase/seed-demo-recipes.sql`) para poder mostrar la historia antes de que exista SCRUM-95.

### SCRUM-95: crear o editar

- Botón **"+ Nueva receta"** en el catálogo que lleva a `/recetas/nueva`.
- Acción **"Editar"** en cada tarjeta que lleva a `/recetas/{id}/editar`, con el formulario precargado.
- Formulario con **nombre**, **porciones base** e **ingredientes**.
- Ingredientes con el buscador compartido del catálogo: se elige un **producto madre** ("Leche", sin tamaño ni marca) y recién después se le asigna **cantidad** y **unidad** (`ml` / `g` / `unidad`). Al elegir el producto, la unidad se preselecciona según sus presentaciones del catálogo (leche → `ml`), y se puede cambiar.
- Cada ingrediente se puede quitar del formulario antes de guardar. El orden en que se agregan es su `position` (los primeros son los "principales" del catálogo).
- **Guardar** crea o actualiza la receta y todos sus ingredientes **en una sola operación** (todo o nada) y vuelve al catálogo, donde se ve el cambio. **Cancelar** vuelve al catálogo sin guardar.

### SCRUM-96: eliminar

- Acción **"Eliminar"** en cada tarjeta del catálogo, junto a "Editar".
- Antes de borrar, un **diálogo de confirmación** que nombra la receta y avisa que no se puede deshacer, con "Eliminar" y "Cancelar".
- Al confirmar se borra la receta **y sus ingredientes**, y la tarjeta desaparece del catálogo sin recargar la página.
- Deuda de SCRUM-95 que esta historia vuelve visible: si se borra una receta que otra pestaña está editando, al guardar ahí se muestra "No encontramos esa receta" en vez del error genérico.

Lo que no incluye ninguna de las tres está en la [sección 14](#14-casos-fuera-de-alcance).

## 3. Entradas

| Historia | Entrada | Tipo | De dónde |
|---|---|---|---|
| 94 | Sesión del usuario | sesión de Supabase (anónima provisional) | `ensureSession` de `services/supabase.client.ts` |
| 95 | `recipeId` | `string` opcional (sin id: receta nueva) | segmento `[id]` de `/recetas/{id}/editar` |
| 95 | Nombre | `string` | input de texto |
| 95 | Porciones base | `string` (se convierte a entero al validar) | input de texto |
| 95 | Texto de búsqueda de ingrediente | `string` | buscador compartido |
| 95 | Producto elegido | producto madre del catálogo (`CatalogProduct`) | opción del buscador |
| 95 | Cantidad por ingrediente | `string` (acepta coma decimal; se convierte a número al validar) | input de texto |
| 95 | Unidad por ingrediente | `ml` / `g` / `unidad` | selector |
| 96 | Receta a eliminar | id y nombre de la receta de la tarjeta | clic en "Eliminar" |
| 96 | Confirmación | confirmar / cancelar (botón, clic fuera o Escape) | diálogo |

## 4. Salidas

- **SCRUM-94:** la grilla de tarjetas con los textos ya armados ("4 porciones", "+1 más", la inicial del marcador), o el mensaje de catálogo vacío, o el de error.
- **SCRUM-95:** una receta creada o actualizada en `recipes`, con sus ingredientes reemplazados en `recipe_ingredients` en el orden del formulario, y navegación al catálogo. Si algo falla: errores por campo o un mensaje general, sin perder lo escrito.
- **SCRUM-96:** la receta y sus ingredientes borrados de la base, y la tarjeta quitada del catálogo (o el estado vacío si era la última). Si algo falla: mensaje de error dentro del diálogo, sin quitar la tarjeta.

## 5. Reglas de negocio

### Todas

1. Cada usuario ve, crea, edita y borra solo sus recetas. Lo decide RLS en la base: el frontend nunca filtra por dueño ni manda `owner_id` o `household_id`. Así, cuando se sumen las recetas del household, la pantalla no cambia.
2. Lo que valida la UI se repite en la base (`check` de las tablas, `save_recipe`, políticas): la UI es comodidad, la base es la garantía (security-practices §3).

### SCRUM-94

3. Los ingredientes principales son los primeros según el orden en que se cargaron en la receta (`position`), no alfabéticos. Se muestran hasta 3, y "+N más" si hay más.
4. Las recetas se ordenan de la más nueva a la más vieja.

### SCRUM-95

5. Nombre obligatorio (no vale solo espacios), de hasta 120 caracteres.
6. Porciones base: entero entre 1 y 50.
7. Al menos un ingrediente.
8. Cada ingrediente sale del catálogo, nunca como texto libre, y no se repite en la misma receta.
9. Cantidad mayor que 0 y de hasta 100 000; se acepta coma decimal ("0,5").
10. Unidad `ml`, `g` o `unidad`: las unidades base del catálogo, para poder sumar contra la lista (SCRUM-97).
11. No se guarda si hay errores de validación.
12. Guardar es atómico: la receta y todos sus ingredientes, o nada.

### SCRUM-96

13. Nunca se borra sin confirmación explícita en el diálogo.
14. Borrar la receta borra sus ingredientes; no quedan ingredientes huérfanos.
15. El borrado es definitivo: no hay papelera ni deshacer.
16. Si la receta ya no existe o no es del usuario, el resultado es el mismo que un borrado correcto: la tarjeta se quita y no se revela si una receta ajena existe.

## 6. Estados

Cada pantalla tiene una unión de estados derivada de constantes, no varios booleanos que se puedan contradecir.

| Pantalla | Estados | Notas |
|---|---|---|
| Catálogo (SCRUM-94) | `loading` · `error` · `ready` | `ready` sin recetas es el catálogo vacío, no un estado aparte |
| Editor (SCRUM-95) | `loading` · `notFound` · `loadFailed` · `editing` · `saving` | Una receta nueva arranca en `editing`; editar arranca en `loading` |
| Eliminación (SCRUM-96) | `idle` · `confirming` · `deleting` · `failed` | `confirming`, `deleting` y `failed` siempre llevan la receta elegida: no puede haber "eliminando" sin receta |

## 7. Errores

| Historia | Error | Cómo se muestra |
|---|---|---|
| 94 | Falla de red o de Supabase al cargar | "No se pudieron cargar tus recetas. Intenta de nuevo." No se dice "no tienes recetas" porque no se sabe si es cierto |
| 95 | Nombre vacío, solo espacios o de más de 120 caracteres | Error bajo el campo |
| 95 | Porciones vacías, 0, negativas, con decimales o más de 50 | Error bajo el campo |
| 95 | Receta sin ingredientes | Error en la sección de ingredientes |
| 95 | Cantidad vacía, 0, negativa, no numérica o mayor a 100 000 | Error bajo la fila del ingrediente |
| 95 | Producto que ya está en la receta | "Ese producto ya está en la receta."; no se duplica |
| 95 | Falla al guardar | "No se pudo guardar la receta. Intenta de nuevo." El formulario conserva todo y se puede reintentar |
| 95 | Receta inexistente, ajena o id inválido en la URL | "No encontramos esa receta." (las tres iguales: RLS no la devuelve) |
| 95 | La receta se borró mientras se editaba (al guardar) | "No encontramos esa receta." (agregado en SCRUM-96) |
| 95 | Falla al cargar la receta para editar | "No se pudo cargar la receta. Intenta de nuevo.", sin un formulario vacío que parezca una receta nueva |
| 96 | Falla de red o de Supabase al borrar | Mensaje de error dentro del diálogo, que sigue abierto; se puede reintentar o cancelar. La tarjeta no desaparece |

## 8. UI esperada

### SCRUM-94

- Sub-tabs "Recetas" y "Planificador semanal · Próximamente".
- Grilla de tarjetas: foto o marcador con la inicial, nombre, porciones, chips de ingredientes y "+N más".
- Mensaje de catálogo vacío y mensaje de error.

### SCRUM-95

- Link "+ Nueva receta" en el catálogo y "Editar" en cada tarjeta.
- Formulario: nombre, porciones base, buscador de ingredientes, filas de ingrediente (producto + cantidad + unidad + "Quitar"), "Guardar receta" y "Cancelar".
- "Guardando…" con el botón deshabilitado mientras guarda.

### SCRUM-96

- Botón "Eliminar" en cada tarjeta, junto a "Editar".
- Diálogo de confirmación (primitivo `Modal`) con el nombre de la receta, el aviso de que no se puede deshacer, el botón "Eliminar" (variante `destructive` de `Button`) y "Cancelar".
- "Eliminando…" con los dos botones deshabilitados mientras borra.
- Mensaje de error dentro del diálogo.

## 9. Accesibilidad

- Cada input tiene su label asociado; los errores son texto junto al campo, no solo color.
- La navegación ("+ Nueva receta", "Editar", "Cancelar" del editor) son links y las acciones ("Guardar receta", "Eliminar") son botones: un link se puede abrir en otra pestaña y el lector de pantalla anuncia bien cada uno.
- Los botones tienen texto claro. El "Eliminar" de la tarjeta nombra la receta para el lector de pantalla, porque hay un "Eliminar" por tarjeta en la misma página.
- El diálogo es `role="dialog"` con `aria-modal`, tiene título y se cierra con Escape (comportamiento del `Modal` compartido). Mientras borra no se puede cerrar.
- El marcador de la foto es decorativo (`aria-hidden`); la foto real lleva el nombre de la receta como `alt`.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`.
- Tailwind CSS con los tokens `tacha-*`.
- La lógica vive en el ViewModel (`hooks/`), el acceso a datos en el servicio (`services/recipes.service.ts`) y los `.tsx` solo presentan (component-architecture §3).
- Cero literales: textos, límites, estados, tablas y rutas en `constants/recipes.constants.ts` (constants-standards).
- El formulario del editor cambia por acciones con reglas, así que vive en un reducer puro en `utils/`; la validación es una función pura en `utils/`.
- Mutaciones tipadas: `Payload` y `Response` explícitos por operación (`SaveRecipe*`, `DeleteRecipe*`), y el error se maneja, nunca un `catch {}` vacío (nextjs-enterprise-patterns §4).
- Sin librerías nuevas (ni de formularios ni de esquemas).
- Reusar los primitivos de `components/ui`, el buscador compartido y el cliente de Supabase ([sección 11](#11-dependencias)) antes de construir algo propio.
- Skills que aplican: `component-architecture`, `constants-standards`, `project-structure`, `security-practices`, `nextjs-enterprise-patterns`, `clean-code-practices`, `gitflow`.

## 11. Dependencias

- `services/supabase.client.ts`: `getSupabaseClient`, `ensureSession`.
- `services/catalog.service.ts`, `hooks/useProductSearch.ts`, `components/product-search/ProductSearch.tsx`: buscador de productos madre (SCRUM-120).
- `@/components/ui`: `Button`, `Input`, `Chip`, `Spinner`, `CategoryLabel`, `Modal`.
- `@/constants`: `CATALOG_BASE_UNIT`, `BUTTON_VARIANT`.
- `types/database.types.ts`: tipos generados de Supabase.
- `types/nullable.types.ts`: `NullableRef`.

## 12. Contratos externos

### Tablas (Supabase)

- `recipes`: `id`, `owner_id` (→ `auth.users`, default `auth.uid()`), `household_id` (nullable, sin FK hasta que exista `households`), `name`, `base_servings`, `image_url` (nullable), `created_at`.
- `recipe_ingredients`: `id`, `recipe_id` (→ `recipes`, `on delete cascade`), `product_catalog_id` (→ `product_catalog`), `quantity_value`, `quantity_unit`, `position`, `created_at`; `unique (recipe_id, product_catalog_id)`.

### Políticas RLS y permisos

| Operación | `recipes` | `recipe_ingredients` | Migración |
|---|---|---|---|
| Leer | `owner_id = auth.uid()` | la receta existe y es del usuario | `006` |
| Crear | dueño, con `household_id is null` | sobre una receta propia | `007` |
| Editar | dueño (`using` y `with check`), solo las columnas `name` y `base_servings` | sobre una receta propia (`using` y `with check`) | `007`, `008` |
| Borrar | dueño: `owner_id = auth.uid()` | sobre una receta propia; al borrar la receta, en cascada | `010` (receta), `007` (ingredientes) |

`anon` no tiene permisos sobre ninguna de las dos tablas.

### RPC

- `save_recipe(recipe_name, recipe_base_servings, ingredient_list, target_recipe_id) → uuid` (`007`): `security invoker` y transaccional. Sin `target_recipe_id` crea; con id actualiza, y si no encuentra la receta (inexistente o ajena) responde `P0002`.

### Borrar (SCRUM-96)

- `delete` directo sobre `recipes` por id (PostgREST), sin RPC: es una sola sentencia y ya es atómica. Si RLS oculta la fila, la base borra 0 filas sin error (regla 16).

## 13. Casos de aceptación

### HU-63 (SCRUM-94)

- [ ] CA-01 (**parcial**): el sub-tab "Recetas" muestra las recetas con nombre, foto (o su inicial si no tiene) e ingredientes principales. Cumplido para las recetas **propias** en `/recetas`. Falta, por dependencias fuera de esta historia ([sección 14](#14-casos-fuera-de-alcance)): que viva dentro del ítem "Recetas" del **sidebar** y que muestre las recetas **del household**.
- [x] CA-02: cada receta muestra sus porciones base.
- [x] Usuario sin recetas: mensaje de catálogo vacío, no un error.
- [x] Receta sin foto: marcador con la inicial, sin imagen rota.
- [x] Receta sin ingredientes: la tarjeta se muestra sin la sección de ingredientes.
- [x] Receta con más de 3 ingredientes: los primeros 3 y "+N más".
- [x] Otra sesión no ve recetas ajenas.

### HU-64 (SCRUM-95)

- [x] CA-01: un botón "+ Nueva receta" abre un formulario con nombre, porciones base e ingredientes (búsqueda estilo catálogo).
- [x] CA-02: por cada ingrediente, el usuario primero elige el producto (ej. "Leche") y después le asigna cantidad con su unidad (ej. "500 ml"); el ingrediente queda ligado al producto desde ese paso.
- [x] CA-03: cada ingrediente se elige de entre los productos del catálogo, no se escribe como texto libre.
- [ ] CA-04 (**parcial**): quien creó la receta la puede **editar** (SCRUM-95) y **eliminar** (SCRUM-96). Falta que lo haga **cualquier miembro del household** si es compartida (integración con households).
- [x] Cada error de validación de la [sección 7](#7-errores) se muestra y no llama a la base.
- [x] Doble clic en "Guardar receta": se crea una sola receta.
- [x] Receta ajena o id inválido por URL: "No encontramos esa receta."

### HU-64b (SCRUM-96)

- [x] CA-01: cada receta del catálogo tiene una acción "Eliminar" que abre una confirmación; solo al confirmar se borra la receta con sus ingredientes, y deja de verse en el catálogo.
- [ ] CA-02 (**bloqueado por SCRUM-100**): si la receta está asignada a algún espacio del plan semanal, el diálogo lo avisa antes de eliminarla. Hoy el plan no existe, así que ninguna receta puede estar asignada; el aviso se suma cuando SCRUM-100 cree `meal_plans` (contrato en la [sección 15](#15-notas-de-implementación)).
- [x] Cancelar (botón, clic fuera o Escape): no se borra nada.
- [x] Doble clic en "Eliminar" del diálogo: una sola petición.
- [x] Falla de red: el diálogo muestra el error, la tarjeta sigue y se puede reintentar.
- [x] Borrar la última receta: se ve el catálogo vacío.
- [x] Receta ya borrada en otra pestaña: la tarjeta se quita sin error.
- [x] Al recargar la página, la receta borrada no vuelve (el borrado llegó a la base).
- [x] Otra sesión, llamando al delete con el id de una receta ajena: no se borra nada. Verificado en el SQL Editor con `role authenticated` y el `sub` de otro usuario dentro de una transacción con `rollback`: 0 filas; con el `sub` del dueño, 1 fila.
- [x] Editar en otra pestaña una receta ya borrada y guardar: "No encontramos esa receta."

### Todas

- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.

## 14. Casos fuera de alcance

- **Sidebar / shell de la app:** no existe y no tiene historia asignada. Cuando exista, `/recetas` se engancha a él (la ruta y los sub-tabs no cambian).
- **Recetas del household (verlas, editarlas y borrarlas como miembro):** `households` todavía no existe. Por ahora cada usuario ve y modifica solo sus recetas; `household_id` queda nullable y sin FK, igual que en `lists`. La integración está en [plan.md](plan.md#integración-con-households-pendiente).
- **Foto (subirla y borrarla de Storage):** el formulario no la pide, y subirla necesita Supabase Storage (bucket, políticas, validación de archivo), que es una decisión de equipo pendiente. Queda para un ticket propio; el catálogo ya muestra la foto cuando existe.
- **Aviso por asignaciones en el plan semanal (CA-02 de HU-64b):** `meal_plans` lo crea SCRUM-100. Un aviso que hoy siempre dijera "no está en el plan" sería código sin uso real.
- **"Agregar receta a lista", "ver qué falta", planificador:** SCRUM-97, SCRUM-98 y SCRUM-99 en adelante.
- **Unidades como "tazas" o "cucharadas":** la base solo acepta `ml` / `g` / `unidad`; sin eso no se puede sumar contra la lista.
- **Productos que no están en el catálogo:** crear productos es "Mis productos" (Daniel).
- **Aviso de "tienes cambios sin guardar" al salir del editor:** no lo pide la historia.
- **Eliminar desde la pantalla de edición:** el CA-01 pide la acción en cada receta y la tarjeta ya lo cumple; un segundo punto de entrada duplicaría la lógica sin que la historia lo pida.
- **Deshacer o papelera:** la historia pide confirmación antes de borrar, no recuperación después.
- **Registro e inicio de sesión:** los construye otra persona. Se usa la sesión anónima provisional (`ensureSession`).

## 15. Notas de implementación

- **Contrato para SCRUM-100 (cierra el CA-02 de HU-64b):** cuando cree `meal_plans` con `recipe_id → recipes`, tiene que decidir qué pasa al borrar la receta: `on delete cascade` (el espacio del plan queda libre) o `restrict` (hay que quitar la asignación primero). Sin decisión explícita, Postgres usa `no action` y eliminar una receta asignada falla con `23503`. Además, antes de abrir el diálogo de esta historia, tiene que consultar cuántos espacios usan la receta y sumar el aviso al mismo diálogo.
- **Spec migrada** a la plantilla de 15 secciones en SCRUM-96 (component-architecture §2, "Specs existentes"): el contenido de SCRUM-94 y SCRUM-95 no cambió, solo se reordenó.
