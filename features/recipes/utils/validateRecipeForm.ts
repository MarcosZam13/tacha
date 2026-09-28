import type { NullableUndefined } from "@/types/nullable.types";
import { RECIPE_FORM_ERROR, RECIPE_FORM_LIMIT, RECIPE_FORM_PATTERN } from "../constants/recipes.constants";
import type { RecipeEditorErrors } from "../models/RecipeEditorErrors.interface";
import type { RecipeEditorIngredient } from "../models/RecipeEditorIngredient.interface";
import type { RecipeEditorValues } from "../models/RecipeEditorValues.interface";

/** "0,5" → "0.5": en Costa Rica los decimales se escriben con coma. */
export const normalizeDecimal = (text: string): string =>
  text.trim().replace(RECIPE_FORM_PATTERN.DECIMAL_COMMA, RECIPE_FORM_PATTERN.DECIMAL_POINT);

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

// Número mayor que 0, con punto o coma decimal: "500" y "0,5" sí; "", "0" o "abc" no.
const isValidQuantity = (quantity: string): boolean => {
  const normalizedQuantity = normalizeDecimal(quantity);
  return RECIPE_FORM_PATTERN.QUANTITY.test(normalizedQuantity) && Number(normalizedQuantity) > 0;
};

const validateQuantities = (ingredients: RecipeEditorIngredient[]): Record<string, string> =>
  Object.fromEntries(
    ingredients
      .filter((ingredient) => !isValidQuantity(ingredient.quantity))
      .map((ingredient) => [ingredient.productId, RECIPE_FORM_ERROR.QUANTITY_INVALID]),
  );

/**
 * Valida todo el formulario. Es la misma regla que repiten los check de la
 * base: acá es para avisar antes de mandar, allá es la garantía.
 */
export const validateRecipeForm = (values: RecipeEditorValues): RecipeEditorErrors => ({
  baseServings: validateBaseServings(values.baseServings),
  ingredients: values.ingredients.length === 0 ? RECIPE_FORM_ERROR.INGREDIENTS_REQUIRED : undefined,
  name: validateName(values.name),
  quantityByProductId: validateQuantities(values.ingredients),
});

export const hasRecipeFormErrors = (errors: RecipeEditorErrors): boolean =>
  Boolean(errors.baseServings) ||
  Boolean(errors.ingredients) ||
  Boolean(errors.name) ||
  Object.keys(errors.quantityByProductId).length > 0;
