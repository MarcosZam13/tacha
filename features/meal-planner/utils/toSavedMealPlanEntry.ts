import type { MealPlanEntry, SavedMealSlot } from "../models/meal-plan.interfaces";
import { buildMealPlanEntry } from "./buildMealPlanEntry";

/**
 * La entrada que queda en pantalla después de guardar, armada con lo que el
 * usuario eligió y el id que devolvió la base. Así el plan no se vuelve a pedir
 * entero (una petición menos y sin parpadeo; SPEC regla 21). Los textos salen
 * de buildMealPlanEntry, el mismo que usa toMealPlanEntry.
 */
export const toSavedMealPlanEntry = ({ option, slotId, target, values }: SavedMealSlot): MealPlanEntry =>
  buildMealPlanEntry({
    baseServings: option.baseServings,
    cookChoice: values.cookChoice,
    dateKey: target.dateKey,
    id: slotId,
    mealType: target.mealType,
    recipeId: option.id,
    recipeName: option.name,
    servingsMultiplier: values.servingsMultiplier,
  });
