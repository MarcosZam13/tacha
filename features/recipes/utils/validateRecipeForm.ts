import type { NullableUndefined } from "@/types/nullable.types";
import { RECIPE_FORM_ERROR, RECIPE_FORM_LIMIT, RECIPE_FORM_PATTERN } from "../constants/recipes.constants";
import type { RecipeEditorErrors, RecipeEditorIngredient, RecipeEditorValues } from "../models/recipe-editor.interfaces";
import { normalizeDecimal } from "./normalizeDecimal";

const validateName = (name: string): NullableUndefined<string> => {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) return RECIPE_FORM_ERROR.NAME_REQUIRED;
  if (trimmedName.length > RECIPE_FORM_LIMIT.NAME_MAX_LENGTH) return RECIPE_FORM_ERROR.NAME_TOO_LONG;
  return undefined;
};

// Entero entre el mínimo y el máximo: "4" sí; "", "0", "-1", "2.5" o "51" no.
const validateBaseServings = (baseServings: string): NullableUndefined<string> => {
  const trimmedServings = baseServings.trim();
  const servings = Number(trimmedServings);
  const isValid =
    RECIPE_FORM_PATTERN.SERVINGS.test(trimmedServings) &&
    servings >= RECIPE_FORM_LIMIT.SERVINGS_MIN &&
    servings <= RECIPE_FORM_LIMIT.SERVINGS_MAX;
  return isValid ? undefined : RECIPE_FORM_ERROR.SERVINGS_INVALID;
};

// Número mayor que 0 y hasta el tope, con punto o coma decimal: "500" y "0,5"
// sí; "", "0", "abc" o "200000" no.
const isValidQuantity = (quantity: string): boolean => {
  const normalizedQuantity = normalizeDecimal(quantity);
  const quantityValue = Number(normalizedQuantity);
  return (
    RECIPE_FORM_PATTERN.QUANTITY.test(normalizedQuantity) &&
    quantityValue > 0 &&
    quantityValue <= RECIPE_FORM_LIMIT.QUANTITY_MAX
  );
};

const validateQuantities = (ingredients: RecipeEditorIngredient[]): Record<string, string> =>
  Object.fromEntries(
    ingredients
      .filter((ingredient) => !isValidQuantity(ingredient.quantity))
      .map((ingredient) => [ingredient.productId, RECIPE_FORM_ERROR.QUANTITY_INVALID]),
  );

// Entre 1 y el tope: sin ingredientes no hay receta, y con demasiados agregarla
// a la lista se vuelve caro (save_recipe aplica el mismo tope).
const validateIngredientCount = (ingredients: RecipeEditorIngredient[]): NullableUndefined<string> => {
  if (ingredients.length === 0) return RECIPE_FORM_ERROR.INGREDIENTS_REQUIRED;
  if (ingredients.length > RECIPE_FORM_LIMIT.INGREDIENTS_MAX) return RECIPE_FORM_ERROR.INGREDIENTS_TOO_MANY;
  return undefined;
};

/**
 * Valida todo el formulario. Las mismas reglas están en los check de la base
 * (006, 008 y save_recipe en 013): acá es para avisar antes de mandar, allá es
 * la garantía, aunque alguien llame a la API sin pasar por este formulario.
 */
export const validateRecipeForm = (values: RecipeEditorValues): RecipeEditorErrors => ({
  baseServings: validateBaseServings(values.baseServings),
  ingredients: validateIngredientCount(values.ingredients),
  name: validateName(values.name),
  quantityByProductId: validateQuantities(values.ingredients),
});

export const hasRecipeFormErrors = (errors: RecipeEditorErrors): boolean =>
  Boolean(errors.baseServings) ||
  Boolean(errors.ingredients) ||
  Boolean(errors.name) ||
  Object.keys(errors.quantityByProductId).length > 0;
