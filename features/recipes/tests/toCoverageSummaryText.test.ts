import { describe, expect, it } from "vitest";
import { RECIPE_COVERAGE_TEXT } from "../constants/recipes.constants";
import type { CoverageIngredient } from "../models/recipe-coverage.interfaces";
import { toCoverageSummaryText } from "../utils/toCoverageSummaryText";

const createIngredient = (id: string, isCovered: boolean): CoverageIngredient => ({
  id,
  isCovered,
  name: id,
  quantityLabel: "1 unidad",
  reasonText: null,
  statusLabel: isCovered ? RECIPE_COVERAGE_TEXT.COVERED : RECIPE_COVERAGE_TEXT.MISSING,
});

describe("toCoverageSummaryText", () => {
  it("says the recipe can be cooked when every ingredient is covered", () => {
    const ingredients = [createIngredient("leche", true), createIngredient("sal", true)];

    expect(toCoverageSummaryText(ingredients)).toBe(RECIPE_COVERAGE_TEXT.ALL_COVERED);
  });

  it("counts the missing ingredients out of the total", () => {
    const ingredients = [
      createIngredient("leche", true),
      createIngredient("cebolla", false),
      createIngredient("sal", false),
      createIngredient("aceite", true),
    ];

    expect(toCoverageSummaryText(ingredients)).toBe("Te faltan 2 de 4 ingredientes");
  });

  it("uses the singular when only one is missing", () => {
    const ingredients = [createIngredient("leche", true), createIngredient("sal", false)];

    expect(toCoverageSummaryText(ingredients)).toBe("Te falta 1 de 2 ingredientes");
  });

  it("says every ingredient is missing when none is covered", () => {
    const ingredients = [createIngredient("leche", false), createIngredient("sal", false)];

    expect(toCoverageSummaryText(ingredients)).toBe("Te faltan 2 de 2 ingredientes");
  });
});
