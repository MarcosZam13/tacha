import type { RECIPE_DELETION_STATUS } from "../constants/recipes.constants";
import type { RecipeSummary } from "./recipe-catalog.interfaces";

// Types de la eliminación de una receta (SCRUM-96). Las interfaces están en
// recipe-deletion.interfaces.ts.

/**
 * La receta que se está por borrar: el id para la base y el nombre para el
 * diálogo. Se deriva de RecipeSummary para que no se desincronice de la tarjeta.
 */
export type RecipeDeletionTarget = Pick<RecipeSummary, "id" | "name">;

/**
 * Unión discriminada por `status`. Fuera de `idle` siempre hay una receta
 * elegida: no se puede llegar a "eliminando" sin saber cuál. Con booleanos
 * (isOpen, isDeleting, hasError) más una receta nullable sí se podría.
 */
export type RecipeDeletionState =
  | { status: typeof RECIPE_DELETION_STATUS.IDLE }
  | { status: typeof RECIPE_DELETION_STATUS.CONFIRMING; recipe: RecipeDeletionTarget }
  | { status: typeof RECIPE_DELETION_STATUS.DELETING; recipe: RecipeDeletionTarget }
  | { status: typeof RECIPE_DELETION_STATUS.FAILED; recipe: RecipeDeletionTarget };
