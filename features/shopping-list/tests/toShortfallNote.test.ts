import { describe, expect, it } from "vitest";
import { CATALOG_BASE_UNIT } from "@/constants";
import { toShortfallNote } from "../utils/toShortfallNote";

describe("toShortfallNote", () => {
  it("writes the missing amount, its unit and the recipe (HU-76 CA-01)", () => {
    const note = toShortfallNote({ quantityMissing: 500, recipeName: "Tres leches", unit: CATALOG_BASE_UNIT.MILLILITERS });

    expect(note).toBe("+ 500 ml necesarios para Tres leches");
  });

  it("uses a decimal comma, like the recipes screens", () => {
    const note = toShortfallNote({ quantityMissing: 250.5, recipeName: "Flan", unit: CATALOG_BASE_UNIT.GRAMS });

    expect(note).toBe("+ 250,5 g necesarios para Flan");
  });
});
