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
- [ ] Tests unitarios de `utils/recipe-editor.reducer.ts`, `utils/validateRecipeForm.ts` y `utils/toSaveRecipePayload.ts` (SCRUM-95).
- [ ] Tests de `hooks/useRecipeDeletion.ts` y de tarjeta + diálogo con Page Object (SCRUM-96).

## SCRUM-95: crear o editar una receta

- [x] 1. Constantes: límites del formulario, campos, acciones y estados del editor, textos, etiquetas de unidad, rutas, RPC y columnas.
- [x] 2. Modelos: ingrediente y valores del formulario, errores, estado, acciones, fila de edición, `SaveRecipePayload` / `SaveRecipeResponse`, interfaz del ViewModel.
- [x] 3. Migración `007_save_recipe.sql` (políticas de insert/update y `save_recipe`) y `Functions.save_recipe` en `types/database.types.ts`.
- [x] 4. Aplicar la migración en Supabase y regenerar `types/database.types.ts` (verificado: `Functions.save_recipe` quedó igual a lo escrito en la tarea 3).
- [x] 5. Utils puros: `getDefaultUnit`, `validateRecipeForm` (+ `normalizeDecimal`, `hasRecipeFormErrors`), `getRecipeEditPath`, `toSaveRecipePayload`, `toRecipeEditorValues`, `recipe-editor.reducer`.
- [x] 6. Servicio: `getRecipeForEditing()` (con "no encontrada" para id inexistente, ajeno o inválido) y `saveRecipe()`.
- [x] 7. `useRecipeEditor` (reducer + carga para editar con bandera de cancelación + guardar) y `useRecipeEditorViewModel` (facade con `useProductSearch` y navegación).
- [x] 8. Presentación: `RecipeBasicsFields`, `RecipeIngredientRow`, `RecipeIngredientsField`, `RecipeEditorActions`, `RecipeEditor`; rutas `app/recetas/nueva/page.tsx` y `app/recetas/[id]/editar/page.tsx`.
- [x] 9. Catálogo: link "+ Nueva receta" en `RecipeCatalog` y "Editar" en `RecipeCard`.
- [x] 10. Validar CA-01..04 en el navegador (crear, editar, casos límite de la SPEC, receta ajena por URL) y con otra sesión; `npx tsc --noEmit`, `npm run lint`, `npm run build`.

- [x] 11. Correcciones de la revisión de código y seguridad del PR: tipos derivados (`extends` / `Pick`), rutas desde una base, `normalizeDecimal` propio, tope de cantidad en el formulario, textos del catálogo en `RECIPE_TEXT`, y migración `008_harden_recipes.sql`.
- [x] 12. Aplicar `008_harden_recipes.sql` en Supabase y repetir la prueba de crear y editar (incluida una cantidad mayor a 100000).

Bloqueado / fuera de esta historia: eliminar (SCRUM-96), foto (ticket propio), edición por miembros del household (integración con households).

## SCRUM-96: eliminar una receta

- [x] 1. SPEC (migrada a la plantilla de 15 secciones) y plan de la historia.
- [ ] 2. Migración `010_delete_recipes.sql`: `grant delete` y política de delete en `recipes` para el dueño.
- [ ] 3. Aplicar `010` en Supabase (SQL Editor) y verificar que la política existe (`pg_policies` de `recipes` con `cmd = DELETE`). Bloquea la validación de la tarea 10, no el código.
- [ ] 4. Constantes: `RECIPE_DELETION_STATUS`, `RECIPE_DELETE_TEXT` y `POSTGRES_ERROR_CODE.NO_DATA_FOUND`.
- [ ] 5. Modelos: `RecipeDeletionTarget`, `RecipeDeletionState`, `RecipeDeletionViewModel`, `DeleteRecipePayload` / `DeleteRecipeResponse`; `deletion` en `RecipeCatalogViewModel`.
- [ ] 6. Servicio: `deleteRecipe()`, y `saveRecipe()` devuelve `null` con `P0002`.
- [ ] 7. Hooks: `useRecipeDeletion` (pedir, cancelar, confirmar, reintentar, ignorar doble clic y cerrar a mitad); `useRecipeCatalogViewModel` lo compone y quita la receta borrada; `useRecipeEditor` despacha `NOT_FOUND` cuando guardar devuelve `null`.
- [ ] 8. Presentación: `RecipeDeleteDialog` (+ props), botón "Eliminar" en `RecipeCard` (con el nombre en `sr-only`), y `RecipeCatalog` conecta el diálogo.
- [ ] 9. `npx tsc --noEmit`, `npm run lint` y `npm run build`.
- [ ] 10. Validar en el navegador los casos de aceptación de HU-64b (SPEC §13), incluido "al recargar, la receta borrada no vuelve", la receta ajena desde la consola con otra sesión y guardar en el editor una receta borrada en otra pestaña. Depende de la tarea 3.
- [ ] 11. Revisión con los subagentes `code-reviewer` y `security-reviewer` (toca RLS), corregir lo que salga y completar los pasos de prueba manual del PR antes de pasarlo a `waiting qa`.

Bloqueado / fuera de esta historia:

- [ ] CA-02 (aviso por asignaciones en el plan semanal): lo cierra SCRUM-100 al crear `meal_plans` (contrato en SPEC §15).
- [ ] Borrado por miembros del household (integración con households).
