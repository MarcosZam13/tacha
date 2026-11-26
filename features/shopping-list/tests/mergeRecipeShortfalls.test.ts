import { describe, expect, it } from "vitest";
import { CATALOG_BASE_UNIT } from "@/constants";
import { mergeRecipeShortfalls } from "../utils/mergeRecipeShortfalls";

const TRES_LECHES = { quantityMissing: 600, recipeName: "Tres leches", unit: CATALOG_BASE_UNIT.MILLILITERS };
const FLAN = { quantityMissing: 200, recipeName: "Flan", unit: CATALOG_BASE_UNIT.MILLILITERS };

describe("mergeRecipeShortfalls", () => {
  it("adds the same recipe and unit into one line, like the database does with the requirements", () => {
    expect(mergeRecipeShortfalls([TRES_LECHES], [{ ...TRES_LECHES, quantityMissing: 100 }])).toEqual([
      { ...TRES_LECHES, quantityMissing: 700 },
    ]);
  });

  it("appends a recipe the kept row did not have, after its own lines", () => {
    expect(mergeRecipeShortfalls([TRES_LECHES], [FLAN])).toEqual([TRES_LECHES, FLAN]);
  });

  it("keeps the same recipe in another unit as a separate line", () => {
    const tresLechesInGrams = { ...TRES_LECHES, unit: CATALOG_BASE_UNIT.GRAMS };

    expect(mergeRecipeShortfalls([TRES_LECHES], [tresLechesInGrams])).toEqual([TRES_LECHES, tresLechesInGrams]);
  });

  it("does not change the arrays it receives", () => {
    const kept = [TRES_LECHES];

    mergeRecipeShortfalls(kept, [TRES_LECHES]);

    expect(kept).toEqual([TRES_LECHES]);
    expect(TRES_LECHES.quantityMissing).toBe(600);
  });
});
