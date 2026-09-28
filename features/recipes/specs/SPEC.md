# Recetas: catálogo y editor

Historias:
- [SCRUM-94 / HU-63](https://tacha.atlassian.net/browse/SCRUM-94): ver catálogo de recetas. Sprint 1, mergeada.
- [SCRUM-95 / HU-64](https://tacha.atlassian.net/browse/SCRUM-95): crear o editar una receta. Sprint 1.

---

## SCRUM-94: ver el catálogo de recetas

### Intención

Que el usuario vea de un vistazo las recetas que tiene disponibles (nombre, foto, ingredientes principales y porciones base) para elegir cuáles agregar a su lista o al planificador semanal.

### Alcance

- Ruta `/recetas` con la barra de sub-tabs de la sección: "Recetas" (activa) y "Planificador semanal" (visible pero deshabilitada hasta SCRUM-99).
- Catálogo de recetas en tarjetas: foto (o un marcador si la receta no tiene), nombre, porciones base y los primeros ingredientes, con un "+N más" si hay más.
- Las recetas vienen de Supabase (`recipes` + `recipe_ingredients`); cada ingrediente está ligado a un producto madre del catálogo (`product_catalog`), como pide documento-proyecto §4.9.
- Tablas nuevas `recipes` y `recipe_ingredients`, con RLS.
- Seed de demo (`supabase/seed-demo-recipes.sql`) para poder mostrar la historia antes de que exista SCRUM-95.

### Fuera de alcance (y por qué)

- **Sidebar / shell de la app:** no existe y no tiene historia asignada todavía. Cuando se decida quién lo hace, esta pantalla se engancha a él (la ruta y los sub-tabs no cambian).
- **Recetas del household:** la tabla `households` todavía no existe (la construye otra persona este sprint). Por ahora cada usuario ve solo sus recetas; `household_id` queda nullable y sin FK, igual que en `lists`. La integración está descrita en [plan.md](plan.md#integración-con-households-pendiente).
- **Crear, editar, eliminar, subir foto:** son SCRUM-95 y SCRUM-96. Esta historia solo abre la lectura.
- **"Agregar receta a lista", "ver qué falta", planificador:** SCRUM-97, SCRUM-98, SCRUM-99.
- **Registro e inicio de sesión:** los construye otra persona. Se usa la misma sesión anónima provisional que la lista general (`ensureSession`).

### Requerimientos

1. La lógica vive en el ViewModel (`hooks/`), el acceso a datos en un servicio; los `.tsx` solo presentan.
2. Cero literales: textos, límites, nombres de tablas y estados en `constants/`.
3. El estado de la pantalla es una unión explícita (`loading` / `error` / `ready`), no varios booleanos que se puedan contradecir.
4. El frontend no filtra por dueño: la consulta pide todas las recetas y RLS decide cuáles devuelve. Así, cuando se sumen las recetas del household, la pantalla no cambia.
5. Los ingredientes principales son los primeros según el orden en que se cargaron en la receta (`position`), no alfabéticos.

### Casos límite y errores

- Usuario sin recetas: mensaje de catálogo vacío (no un error).
- Error de red o de Supabase: mensaje de error; no se muestra "no tienes recetas" porque no se sabe si es cierto.
- Receta sin foto: marcador con la inicial del nombre, sin imagen rota.
- Receta sin ingredientes (no debería pasar, pero la base lo permite): la tarjeta se muestra sin la sección de ingredientes.
- Receta con más ingredientes que el límite: se muestran los primeros y "+N más".
- Otro usuario (otra sesión): no ve recetas ajenas.

### Criterios de aceptación

HU-63
- [ ] CA-01 (**parcial**): el sub-tab "Recetas" muestra las recetas con nombre, foto (o su inicial si no tiene) e ingredientes principales. Cumplido para las recetas **propias** en la ruta `/recetas`. Falta, por dependencias fuera de esta historia (ver [Fuera de alcance](#fuera-de-alcance-y-por-qué)):
  - que viva dentro del ítem "Recetas" del **sidebar**, que todavía no existe;
  - que muestre las recetas **del household**, que llegan con la [integración con households](plan.md#integración-con-households-pendiente).
- [x] CA-02: cada receta muestra sus porciones base.

---

## SCRUM-95: crear o editar una receta

### Intención

Que el usuario arme sus propias recetas (nombre, porciones base e ingredientes elegidos del catálogo, cada uno con su cantidad y unidad) y las pueda corregir después, para reutilizarlas en la lista o en el planificador.

### Alcance

- Botón **"+ Nueva receta"** en el catálogo (`/recetas`) que lleva a `/recetas/nueva`.
- Acción **"Editar"** en cada tarjeta del catálogo que lleva a `/recetas/{id}/editar`, con el formulario precargado.
- Formulario con: **nombre**, **porciones base** e **ingredientes**.
- Ingredientes con el buscador compartido del catálogo (`components/product-search`, `hooks/useProductSearch`): se elige un **producto madre** ("Leche", sin tamaño ni marca) y recién después se le asigna **cantidad** y **unidad** (`ml` / `g` / `unidad`). Al elegir el producto, la unidad se preselecciona según sus presentaciones del catálogo (leche → `ml`), y se puede cambiar.
- Cada ingrediente se puede quitar del formulario antes de guardar. El orden en que se agregan es su `position` (los primeros son los "principales" del catálogo).
- **Guardar** crea o actualiza la receta y todos sus ingredientes **en una sola operación** (todo o nada) y vuelve al catálogo, donde se ve el cambio. **Cancelar** vuelve al catálogo sin guardar.
- Migración `007`: abre crear y editar en `recipes` y `recipe_ingredients` para el dueño, y agrega la función `save_recipe`.

### Fuera de alcance (y por qué)

- **Eliminar la receta completa:** es SCRUM-96 (HU-64b, Sprint 2), con su confirmación y el aviso si está en el planificador. El CA-04 de esta historia lo menciona, pero tiene historia propia.
- **Foto:** el formulario del CA-01 no la pide, y subirla necesita Supabase Storage (bucket, políticas, validación de archivo), que es una decisión de equipo pendiente. Queda para un ticket propio; el catálogo ya muestra la foto cuando existe.
- **Recetas compartidas con el household (CA-04, segunda parte):** `households` no existe. Por ahora solo edita quien la creó; la integración está en [plan.md](plan.md#integración-con-households-pendiente).
- **Unidades como "tazas" o "cucharadas":** la base solo acepta las unidades del catálogo (`ml` / `g` / `unidad`); sin eso no se puede sumar contra la lista (SCRUM-97).
- **Productos que no están en el catálogo:** el ingrediente se elige del catálogo, nunca como texto libre (CA-03). Crear productos es "Mis productos" (Daniel).
- **Aviso de "tienes cambios sin guardar" al salir:** no lo pide la historia.

### Requerimientos

1. Mismo patrón que el catálogo: ViewModel en `hooks/`, acceso a datos en el servicio, `.tsx` solo presentación, cero literales.
2. El estado del formulario cambia por acciones con reglas (agregar, quitar, cambiar cantidad o unidad, cargar para editar), así que vive en un **reducer puro** en `utils/`.
3. La validación es una **función pura** en `utils/` y se repite en la base (los `check` de las tablas y la función `save_recipe`): la UI es comodidad, la base es la garantía (security-practices §3).
4. Guardar es **atómico**: una sola llamada a `save_recipe`, que dentro de una transacción crea o actualiza la receta y reemplaza sus ingredientes. Nunca queda una receta a medias si falla la red.
5. `save_recipe` es `security invoker`: RLS sigue siendo el control de acceso. El cliente nunca manda `owner_id` ni `household_id`.
6. Mutación tipada (nextjs-enterprise-patterns §4): `SaveRecipePayload` y `SaveRecipeResponse` explícitos.

### Casos límite y errores

- Nombre vacío o solo espacios; nombre de más de 120 caracteres.
- Porciones vacías, 0, negativas, con decimales o más de 50.
- Receta sin ingredientes: no se puede guardar.
- Cantidad vacía, 0, negativa o no numérica. Se acepta coma decimal ("0,5").
- Elegir en el buscador un producto que ya está en la receta: no se duplica (aviso de que ya está).
- Error de red o de Supabase al guardar: mensaje de error, el formulario conserva lo escrito y se puede reintentar.
- Doble clic en "Guardar": una sola receta (el botón se deshabilita mientras guarda).
- Editar una receta que no existe, que es de otro usuario o con un id inválido en la URL: "No encontramos esa receta" (RLS no la devuelve; no se revela si existe).
- Error al cargar la receta para editar: mensaje de error, sin formulario vacío que parezca una receta nueva.

### Criterios de aceptación

HU-64
- [ ] CA-01: un botón "+ Nueva receta" abre un formulario con nombre, porciones base e ingredientes (búsqueda estilo catálogo).
- [ ] CA-02: por cada ingrediente, el usuario primero elige el producto (ej. "Leche") y después le asigna cantidad con su unidad (ej. "500 ml"); el ingrediente queda ligado al producto desde ese paso.
- [ ] CA-03: cada ingrediente se elige de entre los productos del catálogo, no se escribe como texto libre.
- [ ] CA-04 (**parcial**): quien creó la receta la puede **editar** después. Fuera de esta historia: **eliminar** (SCRUM-96) y que la edite **cualquier miembro del household** si es compartida (integración con households).

---

## Restricciones (ambas historias)

Skills que aplican: `component-architecture`, `constants-standards`, `project-structure`, `security-practices` (RLS, validación de input), `nextjs-enterprise-patterns`, `gitflow`. Reusar primitivos de `components/ui` (`Button`, `Input`, `Chip`, `Spinner`, `CategoryLabel`), el buscador compartido (`components/product-search`, `hooks/useProductSearch`, `services/catalog.service.ts`) y el cliente de `services/supabase.client.ts`.
