import type { NullableRef } from "@/types/nullable.types";
import { RECIPE_DELETE_TEXT } from "../constants/recipes.constants";

/**
 * El aviso del diálogo de eliminar cuando la receta está en el plan semanal:
 * "Está en 3 espacios de tu plan; quedarán vacíos." Con 1 va en singular. Sin
 * espacios (0), o si no se pudo contar (null), no hay aviso. Función pura:
 * los casos se pueden probar sin React.
 */
export const toMealPlanNoticeText = (mealPlanCount: NullableRef<number>): NullableRef<string> => {
  if (mealPlanCount === null || mealPlanCount <= 0) return null;
  if (mealPlanCount === 1) return RECIPE_DELETE_TEXT.MEAL_PLAN_NOTICE_SINGULAR;

  return `${RECIPE_DELETE_TEXT.MEAL_PLAN_NOTICE_PLURAL_PREFIX} ${mealPlanCount} ${RECIPE_DELETE_TEXT.MEAL_PLAN_NOTICE_PLURAL_SUFFIX}`;
};
