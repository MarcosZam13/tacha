import { useEffect, useReducer } from "react";
import type { CatalogBaseUnitType } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";
import { RECIPE_EDITOR_ACTION, RECIPE_EDITOR_STATUS } from "../constants/recipes.constants";
import type { RecipeEditorIngredient } from "../models/RecipeEditorIngredient.interface";
import type { RecipeEditorState } from "../models/RecipeEditorState.interface";
import { getRecipeForEditing, saveRecipe } from "../services/recipes.service";
import { createInitialRecipeEditorState, recipeEditorReducer } from "../utils/recipe-editor.reducer";
import { toSaveRecipePayload } from "../utils/toSaveRecipePayload";
import { hasRecipeFormErrors, validateRecipeForm } from "../utils/validateRecipeForm";

interface UseRecipeEditorReturn {
  addIngredient: (ingredient: RecipeEditorIngredient) => void;
  changeBaseServings: (baseServings: string) => void;
  changeIngredientQuantity: (productId: string, quantity: string) => void;
  changeIngredientUnit: (productId: string, unit: CatalogBaseUnitType) => void;
  changeName: (name: string) => void;
  removeIngredient: (productId: string) => void;
  /** Valida y guarda. Devuelve true si se guardó, para que quien llama navegue. */
  save: () => Promise<boolean>;
  state: RecipeEditorState;
}

/**
 * Estado del formulario de receta: carga la receta si se está editando,
 * expone una función por cada cambio (cada una es una acción del reducer) y
 * guarda. Sin recipeId es una receta nueva.
 */
export const useRecipeEditor = (recipeId: NullableUndefined<string>): UseRecipeEditorReturn => {
  const [state, dispatch] = useReducer(recipeEditorReducer, Boolean(recipeId), createInitialRecipeEditorState);

  useEffect(() => {
    if (!recipeId) return undefined;

    // Si la pantalla se cierra antes de que responda la base, la respuesta
    // se ignora en vez de actualizar un estado que ya no existe.
    let isCancelled = false;

    getRecipeForEditing(recipeId)
      .then((values) => {
        if (isCancelled) return;
        dispatch(
          values
            ? { type: RECIPE_EDITOR_ACTION.LOADED, values }
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

  const save = async (): Promise<boolean> => {
    // Doble clic: mientras guarda no se manda otra vez.
    if (state.status === RECIPE_EDITOR_STATUS.SAVING) return false;

    const errors = validateRecipeForm(state.values);
    if (hasRecipeFormErrors(errors)) {
      dispatch({ errors, type: RECIPE_EDITOR_ACTION.VALIDATION_FAILED });
      return false;
    }

    dispatch({ type: RECIPE_EDITOR_ACTION.SAVE_STARTED });
    try {
      await saveRecipe(toSaveRecipePayload(state.values, recipeId));
      return true;
    } catch {
      dispatch({ type: RECIPE_EDITOR_ACTION.SAVE_FAILED });
      return false;
    }
  };

  return {
    addIngredient: (ingredient) => dispatch({ ingredient, type: RECIPE_EDITOR_ACTION.INGREDIENT_ADDED }),
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
