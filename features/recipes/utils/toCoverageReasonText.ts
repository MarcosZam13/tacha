import type { CatalogBaseUnitType } from "@/constants";
import type { NullableRef } from "@/types/nullable.types";
import { RECIPE_COVERAGE_REASON, RECIPE_COVERAGE_TEXT } from "../constants/recipes.constants";
import type { CoverageReasonType } from "../models/recipe-coverage.types";
import { formatRecipeQuantity } from "./formatRecipeQuantity";

/**
 * Por qué falta un ingrediente, en palabras: "No está en tu lista", "En tu
 * lista, sin tachar" o "Te falta comprar 600 ml" (reglas 30 de la SPEC).
 * Función pura. Un ingrediente cubierto no tiene motivo.
 */
export const toCoverageReasonText = (
  reason: NullableRef<CoverageReasonType>,
  missingQuantity: NullableRef<number>,
  unit: CatalogBaseUnitType,
): NullableRef<string> => {
  if (reason === RECIPE_COVERAGE_REASON.NOT_IN_LIST) return RECIPE_COVERAGE_TEXT.REASON_NOT_IN_LIST;
  if (reason === RECIPE_COVERAGE_REASON.NOT_CHECKED) return RECIPE_COVERAGE_TEXT.REASON_NOT_CHECKED;
  if (reason === RECIPE_COVERAGE_REASON.SHORT) {
    // La base siempre manda la cantidad con `short`; sin ella se dice solo lo que se sabe.
    return missingQuantity === null
      ? RECIPE_COVERAGE_TEXT.REASON_SHORT
      : `${RECIPE_COVERAGE_TEXT.REASON_SHORT} ${formatRecipeQuantity(missingQuantity, unit)}`;
  }
  return null;
};
