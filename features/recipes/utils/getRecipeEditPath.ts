import { RECIPE_ROUTE } from "../constants/recipes.constants";

/** "abc-123" → "/recetas/abc-123/editar". */
export const getRecipeEditPath = (recipeId: string): string =>
  `${RECIPE_ROUTE.CATALOG}/${recipeId}/${RECIPE_ROUTE.EDIT_SEGMENT}`;
