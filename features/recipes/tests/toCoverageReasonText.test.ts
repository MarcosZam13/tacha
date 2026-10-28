import { describe, expect, it } from "vitest";
import { CATALOG_BASE_UNIT } from "@/constants";
import { RECIPE_COVERAGE_REASON, RECIPE_COVERAGE_TEXT } from "../constants/recipes.constants";
import { toCoverageReasonText } from "../utils/toCoverageReasonText";

describe("toCoverageReasonText", () => {
  it("says the product is not in the list", () => {
    expect(toCoverageReasonText(RECIPE_COVERAGE_REASON.NOT_IN_LIST, null, CATALOG_BASE_UNIT.GRAMS)).toBe(
      RECIPE_COVERAGE_TEXT.REASON_NOT_IN_LIST,
    );
  });

  it("says the product is in the list but not checked", () => {
    expect(toCoverageReasonText(RECIPE_COVERAGE_REASON.NOT_CHECKED, null, CATALOG_BASE_UNIT.MILLILITERS)).toBe(
      RECIPE_COVERAGE_TEXT.REASON_NOT_CHECKED,
    );
  });

  it("says how much is still missing, in the unit of the ingredient", () => {
    expect(toCoverageReasonText(RECIPE_COVERAGE_REASON.SHORT, 800, CATALOG_BASE_UNIT.GRAMS)).toBe(
      `${RECIPE_COVERAGE_TEXT.REASON_SHORT} 800 g`,
    );
  });

  it("writes a decimal missing quantity with a comma", () => {
    expect(toCoverageReasonText(RECIPE_COVERAGE_REASON.SHORT, 0.5, CATALOG_BASE_UNIT.MILLILITERS)).toBe(
      `${RECIPE_COVERAGE_TEXT.REASON_SHORT} 0,5 ml`,
    );
  });

  it("says only what it knows when the quantity is missing", () => {
    expect(toCoverageReasonText(RECIPE_COVERAGE_REASON.SHORT, null, CATALOG_BASE_UNIT.GRAMS)).toBe(
      RECIPE_COVERAGE_TEXT.REASON_SHORT,
    );
  });

  it("has no reason for a covered ingredient", () => {
    expect(toCoverageReasonText(null, null, CATALOG_BASE_UNIT.UNIT)).toBeNull();
  });
});
