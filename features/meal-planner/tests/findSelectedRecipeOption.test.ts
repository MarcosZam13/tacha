import { describe, expect, it } from "vitest";
import type { RecipeOption } from "../models/meal-plan.interfaces";
import { findSelectedRecipeOption } from "../utils/findSelectedRecipeOption";

const FLAN: RecipeOption = { baseServings: 6, id: "recipe-flan", name: "Flan", servingsLabel: "6 porciones" };
const ARROZ: RecipeOption = { baseServings: 4, id: "recipe-arroz", name: "Arroz", servingsLabel: "4 porciones" };

describe("findSelectedRecipeOption", () => {
  it("returns the option that matches the chosen recipe", () => {
    expect(findSelectedRecipeOption("recipe-arroz", [FLAN, ARROZ])).toBe(ARROZ);
  });

  it("returns null when the recipe is no longer among the options", () => {
    expect(findSelectedRecipeOption("recipe-gone", [FLAN, ARROZ])).toBeNull();
  });

  it("returns null when nothing is chosen", () => {
    expect(findSelectedRecipeOption(null, [FLAN])).toBeNull();
  });

  it("returns null while there are no options to look in", () => {
    expect(findSelectedRecipeOption("recipe-flan", [])).toBeNull();
  });
});
