import type { RecipeCopyStatusType, SHARE_RECIPE_RESULT } from "../constants/recipes.constants";

// Types de compartir y copiar recetas (SCRUM-162). Las interfaces están en
// recipe-sharing.interfaces.ts.

/** Los nombres solo existen si los productos personales impidieron compartir. */
export type ShareRecipeResult =
  | { kind: typeof SHARE_RECIPE_RESULT.PERSONAL_PRODUCTS; productNames: string[] }
  | { kind: Exclude<(typeof SHARE_RECIPE_RESULT)[keyof typeof SHARE_RECIPE_RESULT], typeof SHARE_RECIPE_RESULT.PERSONAL_PRODUCTS> };

export type RecipeCopyStatusById = Record<string, RecipeCopyStatusType>;
