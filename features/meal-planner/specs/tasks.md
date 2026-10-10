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
- [ ] "Agregar semana a la lista": SCRUM-101 (sección de abajo).

## SCRUM-100: asignar receta, cocinero y porciones a un espacio

- [x] 1. SPEC (huecos de HU-68 decididos con el responsable el 2026-10-09: plan personal con estructura lista para el household, cocinero "Yo" / "Sin cocinero", multiplicador ×0,5 a ×4, receta borrada libera el espacio con aviso). La fusión al household se evaluó y no se incluyó (SPEC §15).
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
- [x] 12. Presentación: `MealSlot` (botón vacío/asignado), `MealSlotDialog`, `MealSlotRecipeList`, `MealSlotCookField`, `MealSlotServingsField`, `MealPlanLoadError` y la conexión en `MealPlanner`, `WeekGrid` y `MealPlannerDay`.
- [x] 13. Aviso al eliminar una receta en `features/recipes/`: `countRecipeMealPlans`, `useRecipeDeletion`, `RecipeDeleteDialog` y sus modelos, textos y tests (cierra el CA-02 de SCRUM-96).
- [x] 14. Tests de la pantalla con Page Object (`MealPlanner.page.ts` y `MealPlanner.test.tsx` se extienden): abrir el diálogo, elegir y guardar, reasignar, quitar, sin recetas, errores, foco al cerrar.
- [x] 15. `docs/documento-proyecto.md` §6 (`meal_plans` con `owner_id` y `assigned_cook` → `auth.users`, borrado de recetas) y la línea de `meal_plans` en `types/database.types.ts` (solo lo de esta historia).
- [x] 16. `E2E.md` y escenarios de `e2e/features/meal-planner/` (ver playwright-e2e): asignar y que siga tras recargar, reasignar, quitar, y el aviso al eliminar una receta del plan (con limpieza de las filas creadas).
- [x] 16b. Check de rango de fechas `meal_plans_date_in_range` (2020-01-01 a 2100-12-31) dentro de `019_meal_plans.sql`, con sus casos en `supabase/tests/019_meal_plans.test.sql` (hallazgo M1 del `security-reviewer`). Sin trigger de tope: el índice único y el rango ya lo acotan (88.755 filas como máximo). La 019 ya estaba aplicada y la rama no está mergeada, así que en la base compartida se agregó el mismo `alter table` a mano, sin tocar el historial; una base nueva lo trae en la 019.
- [x] 17. `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test` y `npx playwright test e2e/features/meal-planner`; validar en el navegador los casos de §13 de HU-68 (desktop y mobile) y la prueba SQL.
- [x] 18. Revisión con `code-reviewer` y `security-reviewer` (tabla nueva con RLS y una RPC), correcciones y pasos de prueba manual del PR antes de `waiting qa`.

Bloqueado / fuera de esta historia:

- [ ] Plan compartido del household y recetas compartidas: pasos en SPEC §15, cuando existan HU-35 y la integración de households.
- [ ] Elegir a otro miembro como cocinero: HU-35 / SCRUM-60.
- [ ] "Agregar semana a la lista": SCRUM-101 (sección de abajo).

## SCRUM-101: agregar la semana a la lista

- [x] 1. SPEC (sección 16; huecos de HU-69 decididos con el responsable el 2026-10-10: un botón sobre la semana a la vista, destino lista general con las sublistas pendientes, cantidades × multiplicador, una vez por espacio, confirmación con aviso de ingredientes y "Ver lista", botón deshabilitado sin comidas).
- [x] 2. Plan y tareas.
- [x] 3. Migración `022_add_week_to_list.sql` (la `018` es de la PR #55 y la `020` y la `021` de otras ramas): función interna `add_week_ingredients_to_list` (copia de las reglas con multiplicador) y RPC `add_week_to_general_list`. **No modifica ninguna función ni tabla existente.**
- [x] 4. Prueba SQL `supabase/tests/022_add_week_to_list.test.sql` con rollback: un espacio ×2 agrega el doble que ×1, el mismo ingrediente en dos días queda en una fila, la misma receta en dos espacios se agrega dos veces, semana vacía no escribe nada, otro usuario no ve ni suma sobre mi plan, sin sesión `42501`, rango invertido o de más de 7 días `22023`, todo o nada (una receta con más de 50 ingredientes aborta toda la semana) y una semana con un solo espacio ×1 deja la lista igual que `add_recipe_to_general_list` con esa receta (equivalencia entre las dos copias).
- [x] 5. Aplicar la `022` en Supabase (SQL Editor, ensayo con rollback y luego con su fila de historial según `supabase/README.md#migraciones`) y correr la prueba `022` (y, como comprobación, las `015` y `017`, que no deberían cambiar). Bloquea la validación, no el código del cliente.
- [x] 6. Constantes: estados y acciones del diálogo, textos (botón, confirmación, resumen, errores), nombre de la RPC y su error; modelos en `models/week-list-addition.interfaces.ts` y `.types.ts`.
- [x] 7. Utils puros y sus tests: `countWeekMeals`, `getWeekRange`, `toWeekAdditionSummary`, `week-list-addition.reducer`.
- [x] 8. Servicio `week-list.service.ts`: `addWeekToList()` con su adapter y su test (cliente de Supabase simulado).
- [x] 9. `useWeekListAddition` (abrir, confirmar, cancelar, una sola petición, error) y su test; composición en `useMealPlannerViewModel`.
- [x] 10. Presentación: `AddWeekToListButton`, `AddWeekToListDialog`, `AddWeekToListResult` y la conexión en `MealPlanner`.
- [x] 11. Tests de la pantalla con Page Object (`MealPlanner.page.ts` se extiende): botón deshabilitado y habilitado, cambiar de semana, confirmación, cancelar, éxito con "Ver lista", error, doble clic.
- [x] 12. (`types/database.types.ts` ya tiene las dos funciones) `docs/documento-proyecto.md` (agregar la semana y el multiplicador en la lista).
- [x] 13. `E2E.md` y escenarios de `e2e/features/meal-planner/` (ver playwright-e2e): con dos comidas asignadas, agregar la semana, confirmar y ver los productos en `/lista`; botón deshabilitado sin comidas.
- [ ] 14. `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test` y `npx playwright test e2e/features/meal-planner`; validar en el navegador los casos de §16.10 (desktop y mobile) y las pruebas SQL.
- [ ] 15. Revisión con `code-reviewer` y `security-reviewer` (RPC con escritura y refactor de una mergeada), correcciones y pasos de prueba manual del PR antes de `waiting qa`.

Bloqueado / fuera de esta historia:

- [ ] Elegir una sublista de fecha como destino (HU-69 CA-03): depende de HU-44 a HU-46 (Sprint 4). Avisarlo en la PR.
