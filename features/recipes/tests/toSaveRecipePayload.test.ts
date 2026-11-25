import { describe, expect, it } from "vitest";
import { toSaveRecipePayload } from "../utils/toSaveRecipePayload";
import { MILK, createValues } from "./recipe.fixtures";

describe("toSaveRecipePayload", () => {
  it("trims the name and turns the texts into numbers, keeping the order", () => {
    const payload = toSaveRecipePayload(
      createValues({
        baseServings: " 6 ",
        ingredients: [{ ...MILK, quantity: "0,5" }, { ...MILK, productId: "sugar", quantity: "200" }],
        name: "  Flan  ",
      }),
      "flan",
    );

    expect(payload).toEqual({
      baseServings: 6,
      ingredients: [
        { productId: "milk", quantityUnit: "ml", quantityValue: 0.5 },
        { productId: "sugar", quantityUnit: "ml", quantityValue: 200 },
      ],
      name: "Flan",
      recipeId: "flan",
    });
  });

  it("has no id for a new recipe", () => {
    expect(toSaveRecipePayload(createValues(), undefined).recipeId).toBeUndefined();
  });
});
