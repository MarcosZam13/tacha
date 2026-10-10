import type { NullableRef } from "@/types/nullable.types";
import { COOK_CHOICE, MEAL_SLOT_TEXT } from "../constants/meal-planner.constants";
import type { CookChoiceType } from "../models/meal-plan.types";

/** "Yo" si el usuario cocina; null si no hay cocinero (no se muestra nada). */
export const toCookLabel = (cookChoice: CookChoiceType): NullableRef<string> =>
  cookChoice === COOK_CHOICE.SELF ? MEAL_SLOT_TEXT.COOK_SELF : null;
