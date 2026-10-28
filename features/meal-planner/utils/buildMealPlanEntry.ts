import type { MealPlanEntry, MealPlanEntryParts } from "../models/meal-plan.interfaces";
import { toCookLabel } from "./toCookLabel";
import { toMultiplierLabel } from "./toMultiplierLabel";

/**
 * Arma la entrada de pantalla desde lo crudo: los textos ("Yo", "×2") se
 * derivan acá y solo acá, así leer el plan y guardar un espacio dan lo mismo.
 */
export const buildMealPlanEntry = (parts: MealPlanEntryParts): MealPlanEntry => ({
  ...parts,
  cookLabel: toCookLabel(parts.cookChoice),
  multiplierLabel: toMultiplierLabel(parts.servingsMultiplier),
});
