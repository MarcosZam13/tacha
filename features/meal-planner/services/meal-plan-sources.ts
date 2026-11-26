import { PLAN_SCOPE, SAVE_SLOT_RESULT } from "../constants/meal-planner.constants";
import type { MealPlanSource } from "../models/meal-plan.interfaces";
import type { PlanScopeType } from "../models/meal-planner.types";
import {
  clearHouseholdMealSlot,
  getHouseholdMealPlan,
  getHouseholdRecipeOptions,
  saveHouseholdMealSlot,
} from "./household-meal-plan.service";
import { clearMealSlot, getMealPlan, getRecipeOptions, saveMealSlot } from "./meal-plan.service";

/** El mismo contrato para los dos planes: la pantalla no pregunta cuál es. */
export const MEAL_PLAN_SOURCE: Record<PlanScopeType, MealPlanSource> = {
  [PLAN_SCOPE.FAMILY]: {
    clearSlot: (payload) => clearHouseholdMealSlot(payload),
    getPlan: (params) => getHouseholdMealPlan(params),
    getRecipeOptions: () => getHouseholdRecipeOptions(),
    saveSlot: (payload) => saveHouseholdMealSlot(payload),
  },
  [PLAN_SCOPE.PERSONAL]: {
    clearSlot: async (payload) => {
      await clearMealSlot(payload);
      return true;
    },
    getPlan: (params) => getMealPlan(params),
    getRecipeOptions: () => getRecipeOptions(),
    saveSlot: async (payload) => {
      const response = await saveMealSlot(payload);
      return response
        ? { kind: SAVE_SLOT_RESULT.SAVED, slotId: response.slotId }
        : { kind: SAVE_SLOT_RESULT.RECIPE_GONE };
    },
  },
};
