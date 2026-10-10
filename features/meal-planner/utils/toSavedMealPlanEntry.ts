import type { MealPlanEntry, MealSlotFormValues, MealSlotTarget, RecipeOption } from "../models/meal-plan.interfaces";
import { toMultiplierLabel } from "./formatMultiplier";
import { toCookLabel } from "./toCookLabel";

interface SavedMealSlot {
  option: RecipeOption;
  slotId: string;
  target: MealSlotTarget;
  values: MealSlotFormValues;
}

/**
 * La entrada que queda en pantalla después de guardar, armada con lo que el
 * usuario eligió y el id que devolvió la base. Así el plan no se vuelve a pedir
 * entero (una petición menos y sin parpadeo; SPEC regla 21). Mismos textos que
 * toMealPlanEntry.
 */
export const toSavedMealPlanEntry = ({ option, slotId, target, values }: SavedMealSlot): MealPlanEntry => ({
  baseServings: option.baseServings,
  cookChoice: values.cookChoice,
  cookLabel: toCookLabel(values.cookChoice),
  dateKey: target.dateKey,
  id: slotId,
  mealType: target.mealType,
  multiplierLabel: toMultiplierLabel(values.servingsMultiplier),
  recipeId: option.id,
  recipeName: option.name,
  servingsMultiplier: values.servingsMultiplier,
});
