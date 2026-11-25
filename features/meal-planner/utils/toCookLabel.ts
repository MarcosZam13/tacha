import type { NullableRef } from "@/types/nullable.types";
import { COOK_CHOICE, MEAL_SLOT_TEXT } from "../constants/meal-planner.constants";
import type { CookChoiceType } from "../models/meal-plan.types";

/** "Yo" si cocina el usuario, el nombre si es otro miembro; null si no hay cocinero (no se muestra nada). */
export const toCookLabel = (cookChoice: CookChoiceType, cookName: NullableRef<string> = null): NullableRef<string> => {
  if (cookChoice === COOK_CHOICE.NONE) return null;
  return cookChoice === COOK_CHOICE.SELF ? MEAL_SLOT_TEXT.COOK_SELF : (cookName ?? MEAL_SLOT_TEXT.COOK_UNNAMED);
};
