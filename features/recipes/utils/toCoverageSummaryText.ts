import { RECIPE_COVERAGE_TEXT } from "../constants/recipes.constants";
import type { CoverageIngredient } from "../models/recipe-coverage.interfaces";

/**
 * El resumen de arriba del panel: "Te faltan 2 de 4 ingredientes" o "Tienes
 * todo para cocinarla". Función pura: los casos (todo cubierto, uno solo
 * faltante, varios) se pueden probar sin React.
 */
export const toCoverageSummaryText = (ingredients: CoverageIngredient[]): string => {
  const missingCount = ingredients.filter((ingredient) => !ingredient.isCovered).length;
  if (missingCount === 0) return RECIPE_COVERAGE_TEXT.ALL_COVERED;

  const prefix =
    missingCount === 1 ? RECIPE_COVERAGE_TEXT.SUMMARY_MISSING_SINGULAR : RECIPE_COVERAGE_TEXT.SUMMARY_MISSING_PLURAL;
  return `${prefix} ${missingCount} ${RECIPE_COVERAGE_TEXT.SUMMARY_OF} ${ingredients.length} ${RECIPE_COVERAGE_TEXT.SUMMARY_UNIT}`;
};
