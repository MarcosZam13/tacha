import { describe, expect, it } from "vitest";
import { CATALOG_BASE_UNIT } from "@/constants";
import {
  RECIPE_COVERAGE_INGREDIENT_STATUS,
  RECIPE_COVERAGE_REASON,
  RECIPE_COVERAGE_TEXT,
} from "../constants/recipes.constants";
import type { CoverageRow } from "../models/recipe-coverage.interfaces";
import { toCoverageIngredients } from "../utils/toCoverageIngredients";

const COVERED_ROW: CoverageRow = {
  ingredient_id: "ingredient-leche",
  missing_quantity: null,
  product_name: "Leche entera",
  quantity_unit: CATALOG_BASE_UNIT.MILLILITERS,
  quantity_value: 800,
  reason: null,
  status: RECIPE_COVERAGE_INGREDIENT_STATUS.COVERED,
};

const SHORT_ROW: CoverageRow = {
  ingredient_id: "ingredient-azucar",
  missing_quantity: 800,
  product_name: "Azúcar",
  quantity_unit: CATALOG_BASE_UNIT.GRAMS,
  quantity_value: 1800,
  reason: RECIPE_COVERAGE_REASON.SHORT,
  status: RECIPE_COVERAGE_INGREDIENT_STATUS.MISSING,
};

const NOT_IN_LIST_ROW: CoverageRow = {
  ingredient_id: "ingredient-cebolla",
  missing_quantity: null,
  product_name: "Cebolla",
  quantity_unit: CATALOG_BASE_UNIT.UNIT,
  quantity_value: 3,
  reason: RECIPE_COVERAGE_REASON.NOT_IN_LIST,
  status: RECIPE_COVERAGE_INGREDIENT_STATUS.MISSING,
};

describe("toCoverageIngredients", () => {
  it("adapts a covered ingredient with its quantity and no reason", () => {
    const [ingredient] = toCoverageIngredients([COVERED_ROW]);

    expect(ingredient).toEqual({
      id: "ingredient-leche",
      isCovered: true,
      name: "Leche entera",
      quantityLabel: "800 ml",
      reasonText: null,
      statusLabel: RECIPE_COVERAGE_TEXT.COVERED,
    });
  });

  it("adapts a short ingredient with the missing quantity in its unit", () => {
    const [ingredient] = toCoverageIngredients([SHORT_ROW]);

    expect(ingredient.isCovered).toBe(false);
    expect(ingredient.statusLabel).toBe(RECIPE_COVERAGE_TEXT.MISSING);
    expect(ingredient.reasonText).toBe(`${RECIPE_COVERAGE_TEXT.REASON_SHORT} 800 g`);
  });

  it("uses the plural of the unit for counts", () => {
    const [ingredient] = toCoverageIngredients([NOT_IN_LIST_ROW]);

    expect(ingredient.quantityLabel).toBe("3 unidades");
    expect(ingredient.reasonText).toBe(RECIPE_COVERAGE_TEXT.REASON_NOT_IN_LIST);
  });

  it("keeps the order the database sent", () => {
    const ingredients = toCoverageIngredients([SHORT_ROW, COVERED_ROW, NOT_IN_LIST_ROW]);

    expect(ingredients.map((ingredient) => ingredient.id)).toEqual([
      "ingredient-azucar",
      "ingredient-leche",
      "ingredient-cebolla",
    ]);
  });

  it("returns an empty list for a recipe without ingredients", () => {
    expect(toCoverageIngredients([])).toEqual([]);
  });
});
