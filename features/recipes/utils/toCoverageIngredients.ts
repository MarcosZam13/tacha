import type { CatalogBaseUnitType } from "@/constants";
import { RECIPE_COVERAGE_INGREDIENT_STATUS, RECIPE_COVERAGE_TEXT } from "../constants/recipes.constants";
import type { CoverageIngredient, CoverageRow } from "../models/recipe-coverage.interfaces";
import type { CoverageReasonType } from "../models/recipe-coverage.types";
import { formatRecipeQuantity } from "./formatRecipeQuantity";
import { toCoverageReasonText } from "./toCoverageReasonText";

/**
 * Adapter: convierte lo que devuelve get_recipe_coverage en lo que dibuja el
 * panel (camelCase, unidad tipada, textos armados). Función pura: la forma de
 * la base no sale del servicio. Respeta el orden de la base (el de `position`).
 */
export const toCoverageIngredients = (rows: CoverageRow[]): CoverageIngredient[] =>
  rows.map((row) => {
    // La RPC copia quantity_unit del ingrediente, que el check de la base limita a las 3 unidades.
    const unit = row.quantity_unit as CatalogBaseUnitType;
    const isCovered = row.status === RECIPE_COVERAGE_INGREDIENT_STATUS.COVERED;

    return {
      id: row.ingredient_id,
      isCovered,
      name: row.product_name,
      quantityLabel: formatRecipeQuantity(row.quantity_value, unit),
      reasonText: toCoverageReasonText(row.reason as CoverageReasonType | null, row.missing_quantity, unit),
      statusLabel: isCovered ? RECIPE_COVERAGE_TEXT.COVERED : RECIPE_COVERAGE_TEXT.MISSING,
    };
  });
