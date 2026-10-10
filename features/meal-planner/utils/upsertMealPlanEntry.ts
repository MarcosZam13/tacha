import type { MealPlanEntry } from "../models/meal-plan.interfaces";
import { toSlotKey } from "./toSlotKey";

/**
 * Pone una entrada en el plan: reemplaza la del mismo espacio (día y comida) o
 * la agrega al final. Devuelve una lista nueva; no cambia la que recibe.
 */
export const upsertMealPlanEntry = (entries: MealPlanEntry[], entry: MealPlanEntry): MealPlanEntry[] => {
  const entryKey = toSlotKey(entry.dateKey, entry.mealType);
  const isSameSlot = (other: MealPlanEntry): boolean => toSlotKey(other.dateKey, other.mealType) === entryKey;

  return entries.some(isSameSlot) ? entries.map((other) => (isSameSlot(other) ? entry : other)) : [...entries, entry];
};
