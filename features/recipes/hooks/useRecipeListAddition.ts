import { useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { RECIPE_ADD_TO_LIST_TEXT, RECIPE_LIST_ADDITION_STATUS } from "../constants/recipes.constants";
import type {
  RecipeAddToListFeedback,
  RecipeCardAddToList,
  RecipeListAdditionViewModel,
} from "../models/recipe-list-addition.interfaces";
import type { RecipeListAdditionState, RecipeListAdditionTarget } from "../models/recipe-list-addition.types";
import { hasAddedRecipe, rememberAddedRecipe } from "../services/added-recipes.storage";
import { addRecipeToList } from "../services/recipes.service";
import { toAddToListSummaryText } from "../utils/toAddToListSummaryText";

const IDLE_STATE: RecipeListAdditionState = { status: RECIPE_LIST_ADDITION_STATUS.IDLE };

/**
 * Agregar una receta a la lista: pedir confirmación si ya se había agregado
 * desde este navegador (regla 27), llamar a la base y dejar el resumen o el
 * error para la tarjeta. Las cantidades y los faltantes los decide la base.
 *
 * useState y no useReducer, igual que useRecipeDeletion: pocas transiciones y
 * sin reglas entre campos. La unión impide un resumen sin receta agregada.
 */
export const useRecipeListAddition = (): RecipeListAdditionViewModel => {
  const [state, setState] = useState<RecipeListAdditionState>(IDLE_STATE);
  const isAdding = state.status === RECIPE_LIST_ADDITION_STATUS.ADDING;

  const addRecipe = async (recipe: RecipeListAdditionTarget): Promise<void> => {
    setState({ recipe, status: RECIPE_LIST_ADDITION_STATUS.ADDING });
    try {
      const response = await addRecipeToList({ recipeId: recipe.id });
      if (!response) {
        // Se borró en otra pestaña o es ajena: la base responde lo mismo en los dos casos.
        setState({ errorMessage: RECIPE_ADD_TO_LIST_TEXT.NOT_FOUND, recipe, status: RECIPE_LIST_ADDITION_STATUS.FAILED });
        return;
      }
      rememberAddedRecipe(recipe.id);
      setState({ recipe, response, status: RECIPE_LIST_ADDITION_STATUS.ADDED });
    } catch {
      // La RPC es todo o nada: si falló, la lista quedó como estaba.
      setState({ errorMessage: RECIPE_ADD_TO_LIST_TEXT.ERROR, recipe, status: RECIPE_LIST_ADDITION_STATUS.FAILED });
    }
  };

  const onAddRequest = (recipe: RecipeListAdditionTarget): void => {
    // Una receta a la vez, y un doble clic no manda dos veces.
    if (isAdding) return;
    if (hasAddedRecipe(recipe.id)) {
      setState({ recipe, status: RECIPE_LIST_ADDITION_STATUS.CONFIRMING_REPEAT });
      return;
    }
    void addRecipe(recipe);
  };

  const onRepeatConfirm = (): void => {
    if (state.status !== RECIPE_LIST_ADDITION_STATUS.CONFIRMING_REPEAT) return;
    void addRecipe(state.recipe);
  };

  const onRepeatCancel = (): void => {
    if (state.status !== RECIPE_LIST_ADDITION_STATUS.CONFIRMING_REPEAT) return;
    setState(IDLE_STATE);
  };

  const getFeedback = (): NullableRef<RecipeAddToListFeedback> => {
    if (state.status === RECIPE_LIST_ADDITION_STATUS.ADDED) {
      return { isError: false, messages: toAddToListSummaryText(state.response), recipeId: state.recipe.id };
    }
    if (state.status === RECIPE_LIST_ADDITION_STATUS.FAILED) {
      return { isError: true, messages: [state.errorMessage], recipeId: state.recipe.id };
    }
    return null;
  };

  // Valores derivados: se calculan una vez por render y cada tarjeta se queda con lo suyo.
  const feedback = getFeedback();
  const addingRecipeId = isAdding ? state.recipe.id : null;
  const isConfirmingRepeat = state.status === RECIPE_LIST_ADDITION_STATUS.CONFIRMING_REPEAT;

  const getRecipeAddToList = (recipeId: string): RecipeCardAddToList => ({
    feedback: feedback?.recipeId === recipeId ? feedback : null,
    isAdding: addingRecipeId === recipeId,
    isDisabled: isAdding,
  });

  return {
    getRecipeAddToList,
    isRepeatDialogOpen: isConfirmingRepeat,
    onAddRequest,
    onRepeatCancel,
    onRepeatConfirm,
    repeatRecipeName: isConfirmingRepeat ? state.recipe.name : null,
  };
};
