import type { MealPlanEntry } from "../models/meal-plan.interfaces";

/**
 * Saca del plan todos los espacios de una receta. Es lo que hizo la base al
 * borrarla (on delete cascade): sirve para que la pantalla lo refleje sin
 * recargar cuando se descubre que la receta ya no existe. Devuelve una lista nueva.
 */
export const removeRecipeEntries = (entries: MealPlanEntry[], recipeId: string): MealPlanEntry[] =>
  entries.filter((entry) => entry.recipeId !== recipeId);
