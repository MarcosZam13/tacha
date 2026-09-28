import { RECIPE_CATALOG, RECIPE_TEXT } from "../constants/recipes.constants";
import type { RecipeRow } from "../models/RecipeRow.interface";
import type { RecipeSummary } from "../models/RecipeSummary.interface";
import { formatServings } from "./formatServings";
import { getRecipeEditPath } from "./getRecipeEditPath";

/**
 * Adapter: convierte la fila de la base en lo que dibuja la tarjeta. Es una
 * función pura (sin red ni React), así que todas las reglas de "qué se ve"
 * se pueden probar sin montar la pantalla.
 *
 * Los ingredientes principales son los primeros por `position` (el orden en
 * que se cargaron), no alfabéticos. El orden vive solo acá, no en la consulta,
 * para que la regla tenga un único lugar.
 */
export const toRecipeSummary = (recipeRow: RecipeRow): RecipeSummary => {
  const ingredients = [...recipeRow.recipe_ingredients]
    .sort((first, second) => first.position - second.position)
    .map((ingredient) => ({ id: ingredient.id, name: ingredient.product_catalog.name }));

  const hiddenIngredientCount = ingredients.length - RECIPE_CATALOG.MAIN_INGREDIENTS_LIMIT;

  return {
    editPath: getRecipeEditPath(recipeRow.id),
    hasIngredients: ingredients.length > 0,
    id: recipeRow.id,
    imageUrl: recipeRow.image_url,
    mainIngredients: ingredients.slice(0, RECIPE_CATALOG.MAIN_INGREDIENTS_LIMIT),
    moreIngredientsLabel:
      hiddenIngredientCount > 0 ? `+${hiddenIngredientCount} ${RECIPE_TEXT.MORE_INGREDIENTS}` : null,
    name: recipeRow.name,
    placeholderInitial: recipeRow.name.trim().charAt(0).toUpperCase(),
    servingsLabel: formatServings(recipeRow.base_servings),
  };
};
