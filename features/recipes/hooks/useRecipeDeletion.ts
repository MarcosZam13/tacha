import { useEffect, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { RECIPE_DELETE_TEXT, RECIPE_DELETION_STATUS } from "../constants/recipes.constants";
import type { RecipeDeletionViewModel, UseRecipeDeletionParams } from "../models/recipe-deletion.interfaces";
import type { RecipeDeletionState, RecipeDeletionTarget } from "../models/recipe-deletion.types";
import { countRecipeMealPlans, deleteRecipe } from "../services/recipes.service";
import { toMealPlanNoticeText } from "../utils/toMealPlanNoticeText";

const IDLE_STATE: RecipeDeletionState = { status: RECIPE_DELETION_STATUS.IDLE };

/**
 * Eliminar una receta: elegirla, confirmar en el diálogo y borrarla. No
 * conoce la lista del catálogo; solo avisa con onDeleted qué id se borró.
 *
 * useState y no useReducer: son pocas transiciones y sin reglas entre
 * campos. La unión de estados igual impide "eliminando" sin receta elegida.
 *
 * Al pedir eliminar también cuenta cuántos espacios del plan semanal usan la
 * receta, para avisarlo en el diálogo (SCRUM-100). Si no se puede contar, el
 * diálogo se abre sin el aviso y borrar sigue funcionando: los espacios se
 * liberan igual por la cascada de la base.
 */
export const useRecipeDeletion = ({ onDeleted }: UseRecipeDeletionParams): RecipeDeletionViewModel => {
  const [state, setState] = useState<RecipeDeletionState>(IDLE_STATE);
  // Cuántos espacios del plan usan la receta elegida; null mientras se cuenta o si no se pudo.
  const [mealPlanCount, setMealPlanCount] = useState<NullableRef<number>>(null);
  const isDeleting = state.status === RECIPE_DELETION_STATUS.DELETING;
  // El id y no el estado: el efecto solo corre cuando cambia la receta elegida, no en cada transición.
  const selectedRecipeId = state.status === RECIPE_DELETION_STATUS.IDLE ? null : state.recipe.id;

  useEffect(() => {
    // Si el diálogo se cierra o cambia de receta antes de que responda la base, la respuesta se ignora.
    let isCancelled = false;

    if (selectedRecipeId !== null) {
      countRecipeMealPlans(selectedRecipeId)
        .then((count) => {
          if (!isCancelled) setMealPlanCount(count);
        })
        .catch(() => {
          // Sin aviso: no es un error que el usuario tenga que ver, solo falta una advertencia.
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [selectedRecipeId]);

  const onDeleteRequest = (recipe: RecipeDeletionTarget): void => {
    // El conteo de la receta anterior no vale para esta.
    setMealPlanCount(null);
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
    mealPlanNotice: toMealPlanNoticeText(mealPlanCount),
    onDeleteCancel,
    onDeleteConfirm,
    onDeleteRequest,
    recipeName: state.status === RECIPE_DELETION_STATUS.IDLE ? null : state.recipe.name,
  };
};
