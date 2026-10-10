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
- [ ] 11. Test de la pantalla con Page Object (`MealPlanner.page.ts` + `MealPlanner.test.tsx`): 7 días y 21 espacios, sub-tab activo, flechas, hoy resaltado, espacio vacío sin botón.
- [ ] 12. `E2E.md` y escenarios de `e2e/features/meal-planner/` (ver playwright-e2e): ir de Recetas al planificador y volver, pasar a la próxima semana y regresar, mobile apilado.
- [ ] 13. `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test` y `npx playwright test e2e/features/meal-planner`.
- [ ] 14. Validar en el navegador los casos de §13 de HU-67 (desktop y mobile).
- [ ] 15. Revisión con `code-reviewer` y completar los pasos de prueba manual del PR antes de `waiting qa`. No toca auth, RLS ni formularios: `security-reviewer` no aplica.

Bloqueado / fuera de esta historia:

- [ ] Asignar receta, cocinero y porciones a un espacio: SCRUM-100.
- [ ] Tabla `meal_plans` y lectura del plan: SCRUM-100 (migración: la `018` es de la PR #55; sería la `019` o la siguiente libre).
- [ ] "Agregar semana a la lista": SCRUM-101.
