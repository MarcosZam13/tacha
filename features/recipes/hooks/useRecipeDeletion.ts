import { useState } from "react";
import { RECIPE_DELETE_TEXT, RECIPE_DELETION_STATUS } from "../constants/recipes.constants";
import type { RecipeDeletionViewModel } from "../models/recipe-deletion.interfaces";
import type { RecipeDeletionState, RecipeDeletionTarget } from "../models/recipe-deletion.types";
import { deleteRecipe } from "../services/recipes.service";

interface UseRecipeDeletionParams {
  /** Se llama cuando la base confirmó el borrado, para que el catálogo quite la receta. */
  onDeleted: (recipeId: string) => void;
}

const IDLE_STATE: RecipeDeletionState = { status: RECIPE_DELETION_STATUS.IDLE };

/**
 * Eliminar una receta: elegirla, confirmar en el diálogo y borrarla. No
 * conoce la lista del catálogo; solo avisa con onDeleted qué id se borró.
 *
 * useState y no useReducer: son pocas transiciones y sin reglas entre
 * campos. La unión de estados igual impide "eliminando" sin receta elegida.
 */
export const useRecipeDeletion = ({ onDeleted }: UseRecipeDeletionParams): RecipeDeletionViewModel => {
  const [state, setState] = useState<RecipeDeletionState>(IDLE_STATE);
  const isDeleting = state.status === RECIPE_DELETION_STATUS.DELETING;

  const onDeleteRequest = (recipe: RecipeDeletionTarget): void => {
    setState({ recipe, status: RECIPE_DELETION_STATUS.CONFIRMING });
  };

  const onDeleteCancel = (): void => {
    // Mientras borra no se cierra: la petición ya salió y su resultado se tiene que ver.
    if (isDeleting) return;
    setState(IDLE_STATE);
  };

  const deleteSelectedRecipe = async (recipe: RecipeDeletionTarget): Promise<void> => {
    setState({ recipe, status: RECIPE_DELETION_STATUS.DELETING });
    try {
      await deleteRecipe({ recipeId: recipe.id });
      onDeleted(recipe.id);
      setState(IDLE_STATE);
    } catch {
      // El diálogo sigue abierto con la misma receta: "Eliminar" reintenta.
      setState({ recipe, status: RECIPE_DELETION_STATUS.FAILED });
    }
  };

  const onDeleteConfirm = (): void => {
    // Sin receta elegida no hay qué borrar; mientras borra no se manda otra vez (doble clic).
    if (state.status === RECIPE_DELETION_STATUS.IDLE || isDeleting) return;
    void deleteSelectedRecipe(state.recipe);
  };

  return {
    errorMessage: state.status === RECIPE_DELETION_STATUS.FAILED ? RECIPE_DELETE_TEXT.ERROR : null,
    isDeleting,
    isDialogOpen: state.status !== RECIPE_DELETION_STATUS.IDLE,
    onDeleteCancel,
    onDeleteConfirm,
    onDeleteRequest,
    recipeName: state.status === RECIPE_DELETION_STATUS.IDLE ? null : state.recipe.name,
  };
};
