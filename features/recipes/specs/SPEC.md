# Recetas: ver el catálogo de recetas

Historia: [SCRUM-94 / HU-63](https://tacha.atlassian.net/browse/SCRUM-94) (ver catálogo de recetas del household). Sprint 1. La siguiente historia de esta feature es [SCRUM-95 / HU-64](https://tacha.atlassian.net/browse/SCRUM-95) (crear o editar una receta), que reusa las tablas que crea esta.

## Intención

Que el usuario vea de un vistazo las recetas que tiene disponibles (nombre, foto, ingredientes principales y porciones base) para elegir cuáles agregar a su lista o al planificador semanal.

## Alcance

- Ruta `/recetas` con la barra de sub-tabs de la sección: "Recetas" (activa) y "Planificador semanal" (visible pero deshabilitada hasta SCRUM-99).
- Catálogo de recetas en tarjetas: foto (o un marcador si la receta no tiene), nombre, porciones base y los primeros ingredientes, con un "+N más" si hay más.
- Las recetas vienen de Supabase (`recipes` + `recipe_ingredients`); cada ingrediente está ligado a un producto madre del catálogo (`product_catalog`), como pide documento-proyecto §4.9.
- Tablas nuevas `recipes` y `recipe_ingredients`, con RLS.
- Seed de demo (`supabase/seed-demo-recipes.sql`) para poder mostrar la historia antes de que exista SCRUM-95.

## Fuera de alcance (y por qué)

- **Sidebar / shell de la app:** no existe y no tiene historia asignada todavía. Cuando se decida quién lo hace, esta pantalla se engancha a él (la ruta y los sub-tabs no cambian).
- **Recetas del household:** la tabla `households` todavía no existe (la construye otra persona este sprint). Por ahora cada usuario ve solo sus recetas; `household_id` queda nullable y sin FK, igual que en `lists`. La integración está descrita en [plan.md](plan.md#integración-con-households-pendiente).
- **Crear, editar, eliminar, subir foto:** son SCRUM-95 y SCRUM-96. Esta historia solo abre la lectura.
- **"Agregar receta a lista", "ver qué falta", planificador:** SCRUM-97, SCRUM-98, SCRUM-99.
- **Registro e inicio de sesión:** los construye otra persona. Se usa la misma sesión anónima provisional que la lista general (`ensureSession`).

## Requerimientos

1. La lógica vive en el ViewModel (`hooks/`), el acceso a datos en un servicio; los `.tsx` solo presentan.
2. Cero literales: textos, límites, nombres de tablas y estados en `constants/`.
3. El estado de la pantalla es una unión explícita (`loading` / `error` / `ready`), no varios booleanos que se puedan contradecir.
4. El frontend no filtra por dueño: la consulta pide todas las recetas y RLS decide cuáles devuelve. Así, cuando se sumen las recetas del household, la pantalla no cambia.
5. Los ingredientes principales son los primeros según el orden en que se cargaron en la receta (`position`), no alfabéticos.

## Casos límite y errores

- Usuario sin recetas: mensaje de catálogo vacío (no un error).
- Error de red o de Supabase: mensaje de error; no se muestra "no tienes recetas" porque no se sabe si es cierto.
- Receta sin foto: marcador con la inicial del nombre, sin imagen rota.
- Receta sin ingredientes (no debería pasar, pero la base lo permite): la tarjeta se muestra sin la sección de ingredientes.
- Receta con más ingredientes que el límite: se muestran los primeros y "+N más".
- Otro usuario (otra sesión): no ve recetas ajenas.

## Restricciones

Skills que aplican: `component-architecture`, `constants-standards`, `project-structure`, `security-practices` (RLS), `nextjs-enterprise-patterns`, `gitflow`. Reusar primitivos de `components/ui` (`Chip`, `Spinner`) y el cliente de `services/supabase.client.ts`.

## Criterios de aceptación

HU-63
- [ ] CA-01 (**parcial**): el sub-tab "Recetas" muestra las recetas con nombre, foto (o su inicial si no tiene) e ingredientes principales. Cumplido para las recetas **propias** en la ruta `/recetas`. Falta, por dependencias fuera de esta historia (ver [Fuera de alcance](#fuera-de-alcance-y-por-qué)):
  - que viva dentro del ítem "Recetas" del **sidebar**, que todavía no existe;
  - que muestre las recetas **del household**, que llegan con la [integración con households](plan.md#integración-con-households-pendiente).
- [x] CA-02: cada receta muestra sus porciones base.
