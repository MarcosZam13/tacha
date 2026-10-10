import type { MEAL_TYPE, WEEK_OFFSET } from "../constants/meal-planner.constants";

// Types del planificador semanal (SCRUM-99), derivados de las constantes para
// que no se desincronicen. Las interfaces están en meal-planner.interfaces.ts.

/** La semana que se ve: la actual o la próxima. No hay otras (SPEC regla 2). */
export type WeekOffsetType = (typeof WEEK_OFFSET)[keyof typeof WEEK_OFFSET];

/** Desayuno, almuerzo o cena: los mismos valores que meal_plans.meal_type. */
export type MealTypeType = (typeof MEAL_TYPE)[keyof typeof MEAL_TYPE];
