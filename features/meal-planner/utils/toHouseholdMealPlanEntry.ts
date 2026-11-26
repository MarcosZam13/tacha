import { COOK_CHOICE } from "../constants/meal-planner.constants";
import type { HouseholdMealPlanRow, MealPlanEntry } from "../models/meal-plan.interfaces";
import type { CookChoiceType } from "../models/meal-plan.types";
import type { MealTypeType } from "../models/meal-planner.types";
import { buildMealPlanEntry } from "./buildMealPlanEntry";

const toCookChoice = (row: HouseholdMealPlanRow): CookChoiceType => {
  if (row.cook_user_id === null) return COOK_CHOICE.NONE;
  return row.cook_is_current_user ? COOK_CHOICE.SELF : row.cook_user_id;
};

/** Adapter: un espacio del plan de la familia → lo que usa la pantalla. */
export const toHouseholdMealPlanEntry = (row: HouseholdMealPlanRow): MealPlanEntry =>
  buildMealPlanEntry({
    baseServings: row.recipe_base_servings,
    cookChoice: toCookChoice(row),
    cookName: row.cook_name,
    dateKey: row.slot_date,
    id: row.slot_id,
    // El check de la tabla limita meal_type a los tres valores de MEAL_TYPE.
    mealType: row.meal_type as MealTypeType,
    recipeId: row.recipe_id,
    recipeName: row.recipe_name,
    servingsMultiplier: row.servings_multiplier,
  });
