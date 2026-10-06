import type { RECIPE_LIST_ADDITION_STATUS } from "../constants/recipes.constants";
import type { RecipeSummary } from "./recipe-catalog.interfaces";
import type { AddRecipeToListResponse } from "./recipe-list-addition.interfaces";

// Types de agregar una receta a la lista (SCRUM-97). Las interfaces están en
// recipe-list-addition.interfaces.ts.

/**
 * La receta que se está por agregar: el id para la base y el nombre para el
 * diálogo de repetir. Se deriva de RecipeSummary para que no se desincronice
 * de la tarjeta.
 */
export type RecipeListAdditionTarget = Pick<RecipeSummary, "id" | "name">;

/**
 * Unión discriminada por `status`. Fuera de `idle` siempre hay una receta
 * elegida, y solo `added` tiene resumen y solo `failed` tiene mensaje de
 * error: no se puede llegar a "agregada" sin saber qué se agregó.
 */
export type RecipeListAdditionState =
  | { status: typeof RECIPE_LIST_ADDITION_STATUS.IDLE }
  | { status: typeof RECIPE_LIST_ADDITION_STATUS.CONFIRMING_REPEAT; recipe: RecipeListAdditionTarget }
  | { status: typeof RECIPE_LIST_ADDITION_STATUS.ADDING; recipe: RecipeListAdditionTarget }
  | {
      status: typeof RECIPE_LIST_ADDITION_STATUS.ADDED;
      recipe: RecipeListAdditionTarget;
      response: AddRecipeToListResponse;
    }
  | { status: typeof RECIPE_LIST_ADDITION_STATUS.FAILED; recipe: RecipeListAdditionTarget; errorMessage: string };
