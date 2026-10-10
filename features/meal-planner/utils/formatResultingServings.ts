import { MEAL_SLOT_TEXT } from "../constants/meal-planner.constants";
import { toDecimalCommaText } from "./toDecimalCommaText";

/**
 * Las porciones que salen de una receta con su multiplicador: 12 con ×2 →
 * "24 porciones"; 3 con ×0,5 → "1,5 porciones"; 1 → "1 porción". Los
 * multiplicadores son múltiplos de 0,5, así que el producto es exacto.
 */
export const formatResultingServings = (baseServings: number, multiplier: number): string => {
  const totalServings = baseServings * multiplier;
  const unitLabel = totalServings === 1 ? MEAL_SLOT_TEXT.SERVINGS_SINGULAR : MEAL_SLOT_TEXT.SERVINGS_PLURAL;

  return `${toDecimalCommaText(totalServings)} ${unitLabel}`;
};
