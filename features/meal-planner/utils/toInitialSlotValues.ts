import type { NullableRef } from "@/types/nullable.types";
import { COOK_CHOICE, SERVINGS_MULTIPLIER } from "../constants/meal-planner.constants";
import type { MealPlanEntry, MealSlotFormValues } from "../models/meal-plan.interfaces";

/**
 * Los valores con que abre el diálogo: los de la asignación si el espacio ya
 * tiene una, o los de un espacio nuevo (sin receta, cocina el usuario, ×1).
 */
export const toInitialSlotValues = (entry: NullableRef<MealPlanEntry>): MealSlotFormValues =>
  entry
    ? { cookChoice: entry.cookChoice, recipeId: entry.recipeId, servingsMultiplier: entry.servingsMultiplier }
    : { cookChoice: COOK_CHOICE.SELF, recipeId: null, servingsMultiplier: SERVINGS_MULTIPLIER.DEFAULT };
