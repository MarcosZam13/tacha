import { useEffect, useReducer, useRef } from "react";
import type { NullableUndefined } from "@/types/nullable.types";
import { RECIPE_AUDIENCE, RECIPE_EDITOR_ACTION, SAVE_RECIPE_OUTCOME } from "../constants/recipes.constants";
import type { UseRecipeEditorReturn } from "../models/recipe-editor.interfaces";
import type { SaveRecipeOutcome } from "../models/recipe-editor.types";
import type { RecipePhotoChange } from "../models/recipe-photo.types";
import { saveRecipeWithExtras } from "../services/recipe-save.service";
import { getRecipeForEditing } from "../services/recipes.service";
import { createInitialRecipeEditorState, recipeEditorReducer } from "../utils/recipe-editor.reducer";
import { toSaveOutcomeMessage } from "../utils/toSaveOutcomeMessage";
import { toSaveRecipePayload } from "../utils/toSaveRecipePayload";
import { hasRecipeFormErrors, validateRecipeForm } from "../utils/validateRecipeForm";

/**
 * Estado del formulario de receta: carga la receta si se está editando,
 * expone una función por cada cambio (cada una es una acción del reducer) y
 * guarda. Sin recipeId es una receta nueva.
 *
 * El orden (receta, foto, compartir) es de saveRecipeWithExtras. Si algo después de
 * la receta falla, queda guardada y el próximo intento la edita, aunque fuera nueva.
 */
export const useRecipeEditor = (recipeId: NullableUndefined<string>): UseRecipeEditorReturn => {
  const [state, dispatch] = useReducer(recipeEditorReducer, Boolean(recipeId), createInitialRecipeEditorState);
  // Doble clic: dos envíos seguidos llegan antes de que React vuelva a dibujar.
  const isSaveInFlightRef = useRef(false);

  useEffect(() => {
    if (!recipeId) return undefined;

    // Si la pantalla se cierra antes de que responda la base, la respuesta
    // se ignora en vez de actualizar un estado que ya no existe.
    let isCancelled = false;

    getRecipeForEditing(recipeId)
      .then((recipe) => {
        if (isCancelled) return;
        dispatch(
          recipe
            ? { ...recipe, type: RECIPE_EDITOR_ACTION.LOADED }
            : { type: RECIPE_EDITOR_ACTION.NOT_FOUND },
        );
      })
      .catch(() => {
        if (!isCancelled) dispatch({ type: RECIPE_EDITOR_ACTION.LOAD_FAILED });
      });

    return () => {
      isCancelled = true;
    };
  }, [recipeId]);

  // Traduce cómo terminó el guardado a lo que muestra el editor; true si se guardó todo.
  const finishSave = (outcome: SaveRecipeOutcome): boolean => {
    if (outcome.kind === SAVE_RECIPE_OUTCOME.SAVED) return true;

    if (outcome.kind === SAVE_RECIPE_OUTCOME.NOT_FOUND) {
      // La receta se borró mientras se editaba (otra pestaña, otro miembro):
      // reintentar no sirve.
      dispatch({ type: RECIPE_EDITOR_ACTION.NOT_FOUND });
      return false;
    }

    const message = toSaveOutcomeMessage(outcome);
    dispatch(
      "recipeId" in outcome && outcome.recipeId
        ? {
            hasLostHousehold: outcome.kind === SAVE_RECIPE_OUTCOME.NO_HOUSEHOLD,
            message,
            recipeId: outcome.recipeId,
            type: RECIPE_EDITOR_ACTION.SAVED_PARTIALLY,
          }
        : { message, type: RECIPE_EDITOR_ACTION.SAVE_FAILED },
    );
    return false;
  };

  const save = async (photoChange: RecipePhotoChange): Promise<boolean> => {
    if (isSaveInFlightRef.current) return false;

    const errors = validateRecipeForm(state.values);
    if (hasRecipeFormErrors(errors)) {
      dispatch({ errors, type: RECIPE_EDITOR_ACTION.VALIDATION_FAILED });
      return false;
    }

    isSaveInFlightRef.current = true;
    dispatch({ type: RECIPE_EDITOR_ACTION.SAVE_STARTED });
    try {
      const outcome = await saveRecipeWithExtras({
        photoChange,
        recipe: toSaveRecipePayload(state.values, recipeId ?? state.savedRecipeId ?? undefined),
        shouldShare: !state.isShared && state.audience === RECIPE_AUDIENCE.FAMILY,
      });

      return finishSave(outcome);
    } finally {
      isSaveInFlightRef.current = false;
    }
  };

  return {
    addIngredient: (ingredient) => dispatch({ ingredient, type: RECIPE_EDITOR_ACTION.INGREDIENT_ADDED }),
    changeAudience: (audience) => dispatch({ audience, type: RECIPE_EDITOR_ACTION.AUDIENCE_CHANGED }),
    changeBaseServings: (baseServings) =>
      dispatch({ baseServings, type: RECIPE_EDITOR_ACTION.BASE_SERVINGS_CHANGED }),
    changeIngredientQuantity: (productId, quantity) =>
      dispatch({ productId, quantity, type: RECIPE_EDITOR_ACTION.INGREDIENT_QUANTITY_CHANGED }),
    changeIngredientUnit: (productId, unit) =>
      dispatch({ productId, type: RECIPE_EDITOR_ACTION.INGREDIENT_UNIT_CHANGED, unit }),
    changeName: (name) => dispatch({ name, type: RECIPE_EDITOR_ACTION.NAME_CHANGED }),
    removeIngredient: (productId) => dispatch({ productId, type: RECIPE_EDITOR_ACTION.INGREDIENT_REMOVED }),
    save,
    state,
  };
};
