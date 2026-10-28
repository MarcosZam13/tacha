import type { MealPlanEntry, MealSlotTarget } from "../models/meal-plan.interfaces";
import { toSlotKey } from "./toSlotKey";

/** Saca del plan la entrada de un espacio. Devuelve una lista nueva; si no había, queda igual. */
export const removeMealPlanEntry = (entries: MealPlanEntry[], target: MealSlotTarget): MealPlanEntry[] => {
  const targetKey = toSlotKey(target.dateKey, target.mealType);

  return entries.filter((entry) => toSlotKey(entry.dateKey, entry.mealType) !== targetKey);
};
