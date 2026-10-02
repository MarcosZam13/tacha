import type { NullableUndefined } from "@/types/nullable.types";
import type { RecipeEditorValues } from "../models/RecipeEditorValues.interface";
import type { SaveRecipePayload } from "../models/SaveRecipePayload.interface";
import { normalizeDecimal } from "./normalizeDecimal";

/**
 * Convierte lo escrito en el formulario a lo que recibe save_recipe: recorta
 * el nombre y pasa cantidades y porciones a número. Se llama solo después de
 * validateRecipeForm, así que los textos ya son números válidos. El orden de
 * los ingredientes se conserva: es su `position` en la base.
 */
export const toSaveRecipePayload = (
  values: RecipeEditorValues,
  recipeId: NullableUndefined<string>,
): SaveRecipePayload => ({
  baseServings: Number(values.baseServings.trim()),
  ingredients: values.ingredients.map((ingredient) => ({
    productId: ingredient.productId,
    quantityUnit: ingredient.unit,
    quantityValue: Number(normalizeDecimal(ingredient.quantity)),
  })),
  name: values.name.trim(),
  recipeId,
});
