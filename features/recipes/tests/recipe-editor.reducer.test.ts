import { describe, expect, it } from "vitest";
import { CATALOG_BASE_UNIT } from "@/constants";
import { RECIPE_EDITOR_ACTION } from "../constants/recipes.constants";
import type { RecipeEditorIngredient, RecipeEditorValues } from "../models/recipe-editor.interfaces";
import type { RecipeEditorAction } from "../models/recipe-editor.types";
import { createInitialRecipeEditorState, recipeEditorReducer } from "../utils/recipe-editor.reducer";

const FLOUR: RecipeEditorIngredient = {
  productId: "flour",
  productName: "Harina",
  quantity: "200",
  unit: CATALOG_BASE_UNIT.GRAMS,
};

const LOADED_VALUES: RecipeEditorValues = { baseServings: "4", ingredients: [FLOUR], name: "Pan" };

// Un formulario ya con ingredientes, listo para tocar; parte sin cambios.
const stateWithFlour = () =>
  recipeEditorReducer(createInitialRecipeEditorState(true), { type: RECIPE_EDITOR_ACTION.LOADED, values: LOADED_VALUES });

describe("recipe editor reducer — unsaved changes", () => {
  it("starts a new recipe without changes", () => {
    expect(createInitialRecipeEditorState(false).hasChanges).toBe(false);
  });

  it("has no changes after loading the recipe to edit", () => {
    expect(stateWithFlour().hasChanges).toBe(false);
  });

  it.each<[string, RecipeEditorAction]>([
    ["typing the name", { name: "Pan casero", type: RECIPE_EDITOR_ACTION.NAME_CHANGED }],
    ["changing the servings", { baseServings: "6", type: RECIPE_EDITOR_ACTION.BASE_SERVINGS_CHANGED }],
    [
      "adding an ingredient",
      {
        ingredient: { ...FLOUR, productId: "sugar", productName: "Azúcar" },
        type: RECIPE_EDITOR_ACTION.INGREDIENT_ADDED,
      },
    ],
    ["removing an ingredient", { productId: "flour", type: RECIPE_EDITOR_ACTION.INGREDIENT_REMOVED }],
    [
      "changing a quantity",
      { productId: "flour", quantity: "300", type: RECIPE_EDITOR_ACTION.INGREDIENT_QUANTITY_CHANGED },
    ],
    [
      "changing a unit",
      { productId: "flour", type: RECIPE_EDITOR_ACTION.INGREDIENT_UNIT_CHANGED, unit: CATALOG_BASE_UNIT.UNIT },
    ],
  ])("reports changes after %s", (_description, action) => {
    expect(recipeEditorReducer(stateWithFlour(), action).hasChanges).toBe(true);
  });

  it("does not report changes when the ingredient was already added", () => {
    const state = recipeEditorReducer(stateWithFlour(), {
      ingredient: FLOUR,
      type: RECIPE_EDITOR_ACTION.INGREDIENT_ADDED,
    });

    expect(state.hasChanges).toBe(false);
  });

  it("keeps the changes when saving fails, so the warning stays", () => {
    const edited = recipeEditorReducer(stateWithFlour(), { name: "Pan casero", type: RECIPE_EDITOR_ACTION.NAME_CHANGED });

    expect(recipeEditorReducer(edited, { type: RECIPE_EDITOR_ACTION.SAVE_FAILED }).hasChanges).toBe(true);
  });
});
