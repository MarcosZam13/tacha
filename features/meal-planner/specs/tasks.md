# Tareas: planificador semanal

Deriva de [plan.md](plan.md). Cada tarea se valida antes de pasar a la siguiente.

## SCRUM-99: ver el calendario semanal de comidas

- [x] 1. SPEC (huecos de HU-67 decididos con el responsable el 2026-10-09: 7 días de lunes a domingo, flechas con el rango, espacio vacío sin acción, feature y ruta propias).
- [x] 2. Plan y tareas.
- [x] 3. Constantes (`constants/meal-planner.constants.ts`): `WEEK_OFFSET`, `MEAL_TYPE` y `MEAL_TYPES` (orden), nombres de días y meses, textos. `APP_ROUTE.MEAL_PLANNER` en `constants/routes.constants.ts`.
- [x] 4. Modelos: `WeekOffsetType`, `MealTypeType`, `WeekDay`, `WeekSlot`, `MealPlannerViewModel`.
- [x] 5. Utils puros: `toLocalDateKey`, `getWeekdayIndex` (lunes = 0 … domingo = 6, lo usan `getWeekStart` y `buildWeek`), `getWeekStart`, `buildWeek`, `formatWeekRange`.
- [x] 6. Tests de los cuatro utils (fecha en domingo, en lunes, cambio de mes, cambio de año, año bisiesto, después de las 6 p. m. en UTC-6, semana con hoy resaltado).
- [x] 7. Mover los sub-tabs a `components/recipes-tabs/` con `git mv`, con sus constantes a `constants/recipes-tabs.constants.ts` (+ barrel) y `href` en cada tab; el disponible pasa a link. Actualizar `RecipeCatalog.tsx`, el plan de recetas y `project-structure` si lista `components/`.
- [x] 8. `getWeekStartForOffset` (lunes de la semana a la vista), `useToday` (`useSyncExternalStore`, `null` en el servidor) y `useMealPlannerViewModel` (semana elegida, flechas deshabilitadas, semana armada, rango y etiqueta).
- [x] 9. Test de `useMealPlannerViewModel` (arranca en la actual, flechas en los extremos, pasar a la próxima y volver, "hoy" nulo no arma la grilla).
- [x] 10. Presentación: `WeekSelector`, `MealSlot`, `MealPlannerDay`, `WeekGrid`, `MealPlanner` y la ruta `app/(app)/recetas/planificador/page.tsx`.
- [x] 11. Test de la pantalla con Page Object (`MealPlanner.page.ts` + `MealPlanner.test.tsx`): 7 días y 21 espacios, sub-tab activo, flechas, hoy resaltado, espacio vacío sin botón.
- [x] 12. `E2E.md` y escenarios de `e2e/features/meal-planner/` (ver playwright-e2e): E2E-PLANNER-01 a 05 (sub-tabs, semana actual con hoy, próxima semana y volver, 7 columnas en desktop, días apilados en mobile).
- [x] 13. `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test` y `npx playwright test e2e/features/meal-planner`.
- [x] 14. Validar en el navegador los casos de §13 de HU-67 (desktop y mobile).
- [x] 15. Revisión con `code-reviewer` y completar los pasos de prueba manual del PR antes de `waiting qa`. No toca auth, RLS ni formularios: `security-reviewer` no aplica.

Bloqueado / fuera de esta historia:

- [ ] Asignar receta, cocinero y porciones a un espacio: SCRUM-100.
- [ ] Tabla `meal_plans` y lectura del plan: SCRUM-100 (migración: la `018` es de la PR #55; sería la `019` o la siguiente libre).
- [ ] "Agregar semana a la lista": SCRUM-101.

## SCRUM-100: asignar receta, cocinero y porciones a un espacio

- [x] 1. SPEC (huecos de HU-68 decididos con el responsable el 2026-10-10: plan personal con estructura lista para el household, cocinero "Yo" / "Sin cocinero", multiplicador ×0,5 a ×4, receta borrada libera el espacio con aviso). La fusión al household se evaluó y no se incluyó (SPEC §15).
- [x] 2. Plan y tareas.
- [x] 3. Migración `019_meal_plans.sql` (número provisional: la `018` es de la PR #55): tabla, índice único parcial, RLS, permisos por columna y RPC `assign_meal_slot`.
- [x] 4. Prueba SQL `supabase/tests/019_meal_plans.test.sql` con rollback: reemplazar un espacio, multiplicador fuera de rango, receta ajena (`P0002`), otro usuario no ve ni cambia el plan, columnas protegidas, cascada al borrar la receta, `anon` sin permiso.
- [x] 5. Aplicar la `019` en Supabase (SQL Editor, en una transacción con su fila de historial según `supabase/README.md#migraciones`) y correr la prueba. Bloquea la validación de la tarea 17, no el código del cliente.
- [x] 6. Constantes: estados del plan y del diálogo, acciones del reducer, textos, límites del multiplicador, nombres de tabla, columnas y RPC, códigos de error.
- [x] 7. Modelos en `models/meal-plan.interfaces.ts` y `models/meal-plan.types.ts`.
- [x] 8. Utils puros y sus tests: `toMealPlanEntry`, `toRecipeOption`, `toSlotKey`, `formatMultiplier`, `formatResultingServings`, `clampServingsMultiplier`, `getMealSlotLabel`, `meal-slot-dialog.reducer`.
- [x] 9. Servicio `meal-plan.service.ts`: `getMealPlan()`, `saveMealSlot()` (con `P0002` → `null`), `clearMealSlot()` y `getRecipeOptions()`, con su test (cliente de Supabase simulado).
- [x] 10. `useWeekMealPlan` (carga con bandera de cancelación, reintento, aplicar guardado y quitado al estado) y su test.
- [x] 11. `useMealSlotDialog` (abrir, reducer, cargar recetas, guardar, quitar, doble clic, receta borrada, cierre) y su test; composición en `useMealPlannerViewModel`.
- [ ] 12. Presentación: `MealSlot` (botón vacío/asignado), `MealSlotDialog`, `MealSlotRecipeList`, `MealSlotCookField`, `MealSlotServingsField`, `MealPlanLoadError` y la conexión en `MealPlanner`, `WeekGrid` y `MealPlannerDay`.
- [ ] 13. Aviso al eliminar una receta en `features/recipes/`: `countRecipeMealPlans`, `useRecipeDeletion`, `RecipeDeleteDialog` y sus modelos, textos y tests (cierra el CA-02 de SCRUM-96).
- [ ] 14. Tests de la pantalla con Page Object (`MealPlanner.page.ts` y `MealPlanner.test.tsx` se extienden): abrir el diálogo, elegir y guardar, reasignar, quitar, sin recetas, errores, foco al cerrar.
- [ ] 15. `docs/documento-proyecto.md` §6 (`meal_plans` con `owner_id` y `assigned_cook` → `auth.users`, borrado de recetas) y la línea de `meal_plans` en `types/database.types.ts` (solo lo de esta historia).
- [ ] 16. `E2E.md` y escenarios de `e2e/features/meal-planner/` (ver playwright-e2e): asignar y que siga tras recargar, reasignar, quitar, y el aviso al eliminar una receta del plan (con limpieza de las filas creadas).
- [ ] 17. `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test` y `npx playwright test e2e/features/meal-planner`; validar en el navegador los casos de §13 de HU-68 (desktop y mobile) y la prueba SQL.
- [ ] 18. Revisión con `code-reviewer` y `security-reviewer` (tabla nueva con RLS y una RPC), correcciones y pasos de prueba manual del PR antes de `waiting qa`.

Bloqueado / fuera de esta historia:

- [ ] Plan compartido del household y recetas compartidas: pasos en SPEC §15, cuando existan HU-35 y la integración de households.
- [ ] Elegir a otro miembro como cocinero: HU-35 / SCRUM-60.
- [ ] "Agregar semana a la lista": SCRUM-101.
