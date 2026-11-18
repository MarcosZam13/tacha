import { describe, expect, it } from "vitest";
import { toUsageNoticeText } from "../utils/toUsageNoticeText";

// HU-58 (SCRUM-89) CA-02: aviso de dónde se usa el producto antes de eliminarlo.
describe("toUsageNoticeText", () => {
  it("returns null while the usage is unknown", () => {
    expect(toUsageNoticeText(null)).toBeNull();
  });

  it("returns null when nothing uses the product", () => {
    expect(toUsageNoticeText({ activeListCount: 0, recipeCount: 0 })).toBeNull();
  });

  it("names both lists and recipes, in plural", () => {
    expect(toUsageNoticeText({ activeListCount: 2, recipeCount: 3 })).toBe(
      "Está en 2 listas activas y 3 recetas. Esas listas y recetas lo siguen teniendo.",
    );
  });

  it("uses the singular and omits what is zero", () => {
    expect(toUsageNoticeText({ activeListCount: 1, recipeCount: 0 })).toBe(
      "Está en 1 lista activa. Esas listas y recetas lo siguen teniendo.",
    );
    expect(toUsageNoticeText({ activeListCount: 0, recipeCount: 1 })).toBe(
      "Está en 1 receta. Esas listas y recetas lo siguen teniendo.",
    );
  });
});
