import { describe, expect, it } from "vitest";
import { toUsageNoticeText } from "../utils/toUsageNoticeText";

// HU-58 (SCRUM-89) CA-02: aviso de dónde se usa el producto antes de eliminarlo.
describe("toUsageNoticeText", () => {
  it("returns null while the usage is unknown", () => {
    expect(toUsageNoticeText(null)).toBeNull();
  });

  it("returns null when nothing uses the product", () => {
    expect(toUsageNoticeText({ activeListCount: 0, groupCount: 0, recipeCount: 0 })).toBeNull();
  });

  it("names both lists and recipes, in plural", () => {
    expect(toUsageNoticeText({ activeListCount: 2, groupCount: 0, recipeCount: 3 })).toBe(
      "Está en 2 listas activas y 3 recetas; ahí lo vas a seguir viendo.",
    );
  });

  it("uses the singular and omits what is zero", () => {
    expect(toUsageNoticeText({ activeListCount: 1, groupCount: 0, recipeCount: 0 })).toBe(
      "Está en 1 lista activa; ahí lo vas a seguir viendo.",
    );
    expect(toUsageNoticeText({ activeListCount: 0, groupCount: 0, recipeCount: 1 })).toBe(
      "Está en 1 receta; ahí lo vas a seguir viendo.",
    );
  });

  // SCRUM-110: un producto en un grupo también se avisa (HU-58 CA-02: "lista, grupo o receta").
  it("names the groups too, joining three places with commas", () => {
    expect(toUsageNoticeText({ activeListCount: 2, groupCount: 3, recipeCount: 1 })).toBe(
      "Está en 2 listas activas, 1 receta y 3 grupos; ahí lo vas a seguir viendo.",
    );
    expect(toUsageNoticeText({ activeListCount: 0, groupCount: 1, recipeCount: 0 })).toBe(
      "Está en 1 grupo; ahí lo vas a seguir viendo.",
    );
  });
});
