import { SLOT_KEY } from "../constants/meal-planner.constants";
import type { MealTypeType } from "../models/meal-planner.types";

/**
 * La clave de un espacio dentro del plan: "2026-10-12|lunch". Con ella la
 * grilla busca la asignación de cada espacio sin recorrer toda la lista.
 */
export const toSlotKey = (dateKey: string, mealType: MealTypeType): string =>
  [dateKey, mealType].join(SLOT_KEY.SEPARATOR);
