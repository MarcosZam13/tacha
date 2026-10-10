import { WEEK_LIST_TEXT, WEEK_LIST_TOKEN } from "../constants/meal-planner.constants";
import type { AddWeekToListResponse } from "../models/week-list-addition.interfaces";
import { toCountLabel } from "./toCountLabel";

/**
 * Arma las líneas del aviso que queda después de agregar la semana. Función
 * pura: los casos (sin comidas, todo agregado, con faltantes, sin presentación,
 * la lista ya alcanzaba) se pueden probar sin React.
 */
export const toWeekAdditionSummary = (response: AddWeekToListResponse): string[] => {
  const { addedProductNames, ingredientCount, mealCount, missingProductNames, skippedProductNames } = response;

  if (mealCount === 0) return [WEEK_LIST_TEXT.NO_MEALS];

  const summaryLines: string[] = [];

  if (addedProductNames.length > 0 || missingProductNames.length > 0) {
    const ingredientsText = toCountLabel(
      ingredientCount,
      WEEK_LIST_TEXT.INGREDIENT_SINGULAR,
      WEEK_LIST_TEXT.INGREDIENT_PLURAL,
    );
    const mealsText = toCountLabel(mealCount, WEEK_LIST_TEXT.MEAL_SINGULAR, WEEK_LIST_TEXT.MEAL_PLURAL);

    summaryLines.push(
      WEEK_LIST_TEXT.SUCCESS.replace(WEEK_LIST_TOKEN.INGREDIENTS, ingredientsText).replace(
        WEEK_LIST_TOKEN.MEALS,
        mealsText,
      ),
    );
  } else if (skippedProductNames.length === 0) {
    // No se sumó nada y no falta nada: lo que había en la lista ya alcanzaba (regla 20 de recetas).
    summaryLines.push(WEEK_LIST_TEXT.ALREADY_COVERED);
  }

  if (missingProductNames.length > 0) {
    summaryLines.push(
      `${WEEK_LIST_TEXT.MISSING_PREFIX} ${missingProductNames.join(WEEK_LIST_TEXT.SUMMARY_SEPARATOR)}`,
    );
  }

  if (skippedProductNames.length > 0) {
    summaryLines.push(
      `${WEEK_LIST_TEXT.SKIPPED_PREFIX} ${skippedProductNames.join(WEEK_LIST_TEXT.SUMMARY_SEPARATOR)}`,
    );
  }

  return summaryLines;
};
