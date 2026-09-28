# Tareas: recetas

Deriva de [plan.md](plan.md). Cada tarea se valida antes de pasar a la siguiente.

## SCRUM-94: ver catálogo de recetas

- [x] 1. Constantes de la feature (`constants/recipes.constants.ts`).
- [x] 2. Modelos: `RecipeRow`, `RecipeSummary`, `RecipeCatalogState`, `RecipeCatalogViewModel`.
- [x] 3. Migración `006_create_recipes.sql` (tablas + RLS de lectura) y tipos en `types/database.types.ts`.
- [x] 4. Aplicar la migración en Supabase y regenerar `types/database.types.ts` (verificado: las tablas de recetas quedaron igual a lo escrito en la tarea 3; el generador del dashboard agrega además `graphql_public` y tipos auxiliares).
- [x] 5. Utils puros: `toRecipeSummary`, `formatServings`.
- [x] 6. Servicio `recipes.service.ts`: `getRecipeSummaries()`.
- [x] 7. `useRecipeCatalogViewModel`: carga inicial con bandera de cancelación, estado derivado.
- [x] 8. Presentación: `RecipesTabs`, `RecipeCard`, `RecipeCatalogEmptyState`, `RecipeCatalog`, ruta `app/recetas/page.tsx`.
- [x] 9. Seed `supabase/seed-demo-recipes.sql` y `docs/documento-proyecto.md` §6.
- [x] 10. Validar CA-01 y CA-02 en el navegador (con y sin recetas, y con otra sesión); `npx tsc --noEmit`, `npm run lint`, `npm run build`.

Bloqueado / pendiente de decisión del equipo:

- [ ] Enganchar `/recetas` al sidebar cuando exista (ver SPEC, fuera de alcance).
- [ ] Integración con households (ver [plan.md](plan.md#integración-con-households-pendiente)).

## Pendiente cuando el proyecto tenga runner de tests

- [ ] Tests unitarios de `utils/toRecipeSummary.ts` y `utils/formatServings.ts`, según unit-testing-standards.

## SCRUM-95: crear o editar una receta

Se detalla al empezar la historia (rama propia, cuando SCRUM-94 esté en `develop`).
