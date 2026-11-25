import { describe, expect, it } from "vitest";
import type { RecipeRow } from "../models/recipe-catalog.interfaces";
import { toRecipeSummary } from "../utils/toRecipeSummary";

const createRow = (ingredientNames: string[], overrides: Partial<RecipeRow> = {}): RecipeRow => ({
  base_servings: 4,
  household_id: null,
  id: "flan",
  name: "flan de coco",
  photo_path: null,
  recipe_ingredients: ingredientNames.map((name, position) => ({
    id: `ingredient-${position}`,
    position,
    product_catalog: { name },
  })),
  ...overrides,
});

describe("toRecipeSummary", () => {
  it("builds the texts of the card", () => {
    expect(toRecipeSummary(createRow(["Leche"]), "https://fotos/flan")).toEqual({
      editPath: "/recetas/flan/editar",
      hasIngredients: true,
      id: "flan",
      isShared: false,
      mainIngredients: [{ id: "ingredient-0", name: "Leche" }],
      moreIngredientsLabel: null,
      name: "flan de coco",
      photoUrl: "https://fotos/flan",
      placeholderInitial: "F",
      servingsLabel: "4 porciones",
    });
  });

  it("shows the first three ingredients by position and how many more there are", () => {
    const row = createRow(["Leche", "Huevo", "Azúcar", "Coco", "Vainilla"]);
    row.recipe_ingredients.reverse();

    const summary = toRecipeSummary(row, null);

    expect(summary.mainIngredients.map((ingredient) => ingredient.name)).toEqual(["Leche", "Huevo", "Azúcar"]);
    expect(summary.moreIngredientsLabel).toBe("+2 más");
  });

  it("shows no extra label with exactly three, and none of it without ingredients", () => {
    expect(toRecipeSummary(createRow(["a", "b", "c"]), null).moreIngredientsLabel).toBeNull();
    expect(toRecipeSummary(createRow([]), null)).toMatchObject({ hasIngredients: false, mainIngredients: [] });
  });

  it("has no photo without a link, and ignores the spaces for the initial", () => {
    expect(toRecipeSummary(createRow([], { name: "  arroz" }), null)).toMatchObject({
      photoUrl: null,
      placeholderInitial: "A",
    });
  });

  it("is shared when it belongs to a household", () => {
    expect(toRecipeSummary(createRow([], { household_id: "family" }), null).isShared).toBe(true);
  });

  it("does not break when a product can no longer be seen", () => {
    const row = createRow(["Leche"]);
    row.recipe_ingredients[0].product_catalog = null;

    expect(toRecipeSummary(row, null).mainIngredients[0].name).toBe("Producto no disponible");
  });
});
