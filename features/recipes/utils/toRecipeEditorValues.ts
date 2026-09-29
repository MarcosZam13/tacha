import type { CatalogBaseUnitType } from "@/constants";
import type { RecipeEditorRow } from "../models/RecipeEditorRow.interface";
import type { RecipeEditorValues } from "../models/RecipeEditorValues.interface";

/**
 * Adapter: convierte la receta guardada en los valores del formulario para
 * editarla. Los números pasan a texto porque eso es lo que tiene el input, y
 * los ingredientes quedan en el orden en que se cargaron (`position`).
 */
export const toRecipeEditorValues = (recipeRow: RecipeEditorRow): RecipeEditorValues => ({
  baseServings: String(recipeRow.base_servings),
  ingredients: [...recipeRow.recipe_ingredients]
    .sort((first, second) => first.position - second.position)
    .map((ingredient) => ({
      productId: ingredient.product_catalog.id,
      productName: ingredient.product_catalog.name,
      quantity: String(ingredient.quantity_value),
      // quantity_unit es text en la base; el check de la columna garantiza que es una de las 3 unidades.
      unit: ingredient.quantity_unit as CatalogBaseUnitType,
    })),
  name: recipeRow.name,
});
