import { COOK_CHOICE } from "../constants/meal-planner.constants";
import type { MealPlanEntry, MealPlanRow } from "../models/meal-plan.interfaces";
import type { MealTypeType } from "../models/meal-planner.types";
import { buildMealPlanEntry } from "./buildMealPlanEntry";

/**
 * Adapter: convierte una fila de meal_plans con su receta en lo que usa la
 * pantalla (camelCase, tipo de comida tipado, textos armados). Función pura: la
 * forma de la base no sale del servicio.
 *
 * `assigned_cook` solo puede ser nulo o el propio usuario (política de la
 * migración 019), así que "no nulo" es "Yo".
 */
export const toMealPlanEntry = (row: MealPlanRow): MealPlanEntry =>
  buildMealPlanEntry({
    baseServings: row.recipes.base_servings,
    cookChoice: row.assigned_cook === null ? COOK_CHOICE.NONE : COOK_CHOICE.SELF,
    dateKey: row.date,
    id: row.id,
    // El check de la tabla limita meal_type a los tres valores de MEAL_TYPE.
    mealType: row.meal_type as MealTypeType,
    recipeId: row.recipes.id,
    recipeName: row.recipes.name,
    servingsMultiplier: row.servings_multiplier,
  });
