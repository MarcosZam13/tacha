import { MEAL_SLOT_TEXT } from "../constants/meal-planner.constants";
import { formatMultiplier } from "./formatMultiplier";
import { formatResultingServings } from "./formatResultingServings";

/** Lo que muestra el contador del diálogo: "×2 · 24 porciones". */
export const toServingsSummaryText = (baseServings: number, multiplier: number): string =>
  `${formatMultiplier(multiplier)}${MEAL_SLOT_TEXT.SERVINGS_SUMMARY_SEPARATOR}${formatResultingServings(baseServings, multiplier)}`;
