import { RECIPE_ADD_TO_LIST_TEXT } from "../constants/recipes.constants";
import type { AddRecipeToListMissingItem, AddRecipeToListResponse } from "../models/recipe-list-addition.interfaces";
import { formatRecipeQuantity } from "./formatRecipeQuantity";

const toMissingItemText = (item: AddRecipeToListMissingItem): string =>
  `${item.productName} (${formatRecipeQuantity(item.quantity, item.unit)})`;

/**
 * Arma las líneas del resumen que ve la tarjeta después de agregar. Función
 * pura: los casos (todo agregado, con faltantes, sin presentación, la lista
 * ya alcanzaba) se pueden probar sin React.
 */
export const toAddToListSummaryText = (response: AddRecipeToListResponse): string[] => {
  const { addedProductNames, missingItems, skippedProductNames } = response;
  const summaryLines: string[] = [];

  if (addedProductNames.length > 0 || missingItems.length > 0) {
    summaryLines.push(RECIPE_ADD_TO_LIST_TEXT.SUCCESS);
  } else if (skippedProductNames.length === 0) {
    // No se sumó nada y no falta nada: lo que había en la lista ya alcanzaba (regla 20).
    summaryLines.push(RECIPE_ADD_TO_LIST_TEXT.ALREADY_COVERED);
  }

  if (missingItems.length > 0) {
    summaryLines.push(
      `${RECIPE_ADD_TO_LIST_TEXT.MISSING_PREFIX} ${missingItems.map(toMissingItemText).join(RECIPE_ADD_TO_LIST_TEXT.SUMMARY_SEPARATOR)}`,
    );
  }

  if (skippedProductNames.length > 0) {
    summaryLines.push(
      `${RECIPE_ADD_TO_LIST_TEXT.SKIPPED_PREFIX} ${skippedProductNames.join(RECIPE_ADD_TO_LIST_TEXT.SUMMARY_SEPARATOR)}`,
    );
  }

  return summaryLines;
};
