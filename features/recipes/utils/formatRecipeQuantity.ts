import { CATALOG_BASE_UNIT } from "@/constants";
import type { CatalogBaseUnitType } from "@/constants";
import { DECIMAL_SEPARATOR, RECIPE_UNIT_LABEL, RECIPE_UNIT_SINGULAR_LABEL } from "../constants/recipes.constants";

/**
 * 600 + "ml" → "600 ml"; 0.5 + "g" → "0,5 g"; 1 + "unidad" → "1 unidad".
 * Coma decimal porque es como se escribe en el editor (y en Costa Rica).
 */
export const formatRecipeQuantity = (quantity: number, unit: CatalogBaseUnitType): string => {
  const quantityText = String(quantity).replace(DECIMAL_SEPARATOR.POINT, DECIMAL_SEPARATOR.COMMA);
  const isSingular = unit === CATALOG_BASE_UNIT.UNIT && quantity === 1;
  return `${quantityText} ${isSingular ? RECIPE_UNIT_SINGULAR_LABEL[unit] : RECIPE_UNIT_LABEL[unit]}`;
};
