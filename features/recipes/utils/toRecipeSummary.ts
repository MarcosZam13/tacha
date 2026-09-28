import { RECIPE_CATALOG, RECIPE_TEXT } from "../constants/recipes.constants";
import type { RecipeRow } from "../models/RecipeRow.interface";
import type { RecipeSummary } from "../models/RecipeSummary.interface";
import { formatServings } from "./formatServings";

/**
 * Adapter: convierte la fila de la base en lo que dibuja la tarjeta. Es una
 * función pura (sin red ni React), así que todas las reglas de "qué se ve"
 * se pueden probar sin montar la pantalla.
 *
 * Los ingredientes principales son los primeros por `position` (el orden en
 * que se cargaron), no alfabéticos. Se ordena acá aunque la consulta ya pida
 * ese orden, para que la regla no dependa de cómo se escribió la consulta.
 */
export const toRecipeSummary = (recipeRow: RecipeRow): RecipeSummary => {
  const ingredientNames = [...recipeRow.recipe_ingredients]
    .sort((first, second) => first.position - second.position)
    .map((ingredient) => ingredient.product_catalog.name);

  const hiddenIngredientCount = ingredientNames.length - RECIPE_CATALOG.MAIN_INGREDIENTS_LIMIT;

  return {
    id: recipeRow.id,
    imageUrl: recipeRow.image_url,
    mainIngredientNames: ingredientNames.slice(0, RECIPE_CATALOG.MAIN_INGREDIENTS_LIMIT),
    moreIngredientsLabel:
      hiddenIngredientCount > 0 ? `+${hiddenIngredientCount} ${RECIPE_TEXT.MORE_INGREDIENTS}` : null,
    name: recipeRow.name,
    placeholderInitial: recipeRow.name.trim().charAt(0).toUpperCase(),
    servingsLabel: formatServings(recipeRow.base_servings),
  };
};
