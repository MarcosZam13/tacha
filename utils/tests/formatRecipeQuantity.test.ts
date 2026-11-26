import { describe, expect, it } from "vitest";
import { CATALOG_BASE_UNIT } from "@/constants";
import { formatRecipeQuantity } from "../formatRecipeQuantity";

// Compartida por recetas y la lista general (SCRUM-114).
describe("formatRecipeQuantity", () => {
  it("writes the quantity with its unit", () => {
    expect(formatRecipeQuantity(600, CATALOG_BASE_UNIT.MILLILITERS)).toBe("600 ml");
  });

  it("uses a decimal comma", () => {
    expect(formatRecipeQuantity(0.5, CATALOG_BASE_UNIT.GRAMS)).toBe("0,5 g");
  });

  it("uses the singular only for exactly one unit", () => {
    expect(formatRecipeQuantity(1, CATALOG_BASE_UNIT.UNIT)).toBe("1 unidad");
    expect(formatRecipeQuantity(3, CATALOG_BASE_UNIT.UNIT)).toBe("3 unidades");
  });
});
