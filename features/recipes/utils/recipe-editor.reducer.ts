import { RECIPE_EDITOR_ACTION, RECIPE_EDITOR_STATUS, RECIPE_EDITOR_TEXT } from "../constants/recipes.constants";
import type { RecipeEditorAction } from "../models/RecipeEditorAction.type";
import type { RecipeEditorErrors } from "../models/RecipeEditorErrors.interface";
import type { RecipeEditorIngredient } from "../models/RecipeEditorIngredient.interface";
import type { RecipeEditorState } from "../models/RecipeEditorState.interface";

const NO_ERRORS: RecipeEditorErrors = { quantityByProductId: {} };

/**
 * Estado inicial: una receta nueva arranca editando con el formulario vacío;
 * una existente arranca cargando (así el efecto que la trae nunca tiene que
 * hacer un dispatch síncrono para "empezar a cargar").
 */
export const createInitialRecipeEditorState = (isEditingExistingRecipe: boolean): RecipeEditorState => ({
  errors: NO_ERRORS,
  ingredientNotice: null,
  saveErrorMessage: null,
  status: isEditingExistingRecipe ? RECIPE_EDITOR_STATUS.LOADING : RECIPE_EDITOR_STATUS.EDITING,
  values: { baseServings: "", ingredients: [], name: "" },
});

// Quita el error de cantidad de un ingrediente sin tocar los de los demás.
const withoutQuantityError = (errors: RecipeEditorErrors, productId: string): RecipeEditorErrors => ({
  ...errors,
  quantityByProductId: Object.fromEntries(
    Object.entries(errors.quantityByProductId).filter(([errorProductId]) => errorProductId !== productId),
  ),
});

const updateIngredient = (
  ingredients: RecipeEditorIngredient[],
  productId: string,
  changes: Partial<RecipeEditorIngredient>,
): RecipeEditorIngredient[] =>
  ingredients.map((ingredient) => (ingredient.productId === productId ? { ...ingredient, ...changes } : ingredient));

/**
 * Función pura: mismo estado + misma acción = mismo resultado, sin red ni
 * React. Todas las reglas de cómo cambia el formulario viven acá: no se
 * duplica un ingrediente, y escribir en un campo limpia solo el error de ese
 * campo.
 */
export const recipeEditorReducer = (state: RecipeEditorState, action: RecipeEditorAction): RecipeEditorState => {
  switch (action.type) {
    case RECIPE_EDITOR_ACTION.LOADED:
      return { ...state, status: RECIPE_EDITOR_STATUS.EDITING, values: action.values };

    case RECIPE_EDITOR_ACTION.NOT_FOUND:
      return { ...state, status: RECIPE_EDITOR_STATUS.NOT_FOUND };

    case RECIPE_EDITOR_ACTION.LOAD_FAILED:
      return { ...state, status: RECIPE_EDITOR_STATUS.LOAD_FAILED };

    case RECIPE_EDITOR_ACTION.NAME_CHANGED:
      return {
        ...state,
        errors: { ...state.errors, name: undefined },
        values: { ...state.values, name: action.name },
      };

    case RECIPE_EDITOR_ACTION.BASE_SERVINGS_CHANGED:
      return {
        ...state,
        errors: { ...state.errors, baseServings: undefined },
        values: { ...state.values, baseServings: action.baseServings },
      };

    case RECIPE_EDITOR_ACTION.INGREDIENT_ADDED: {
      const isAlreadyAdded = state.values.ingredients.some(
        (ingredient) => ingredient.productId === action.ingredient.productId,
      );
      if (isAlreadyAdded) {
        return { ...state, ingredientNotice: RECIPE_EDITOR_TEXT.DUPLICATE_INGREDIENT };
      }
      return {
        ...state,
        errors: { ...state.errors, ingredients: undefined },
        ingredientNotice: null,
        values: { ...state.values, ingredients: [...state.values.ingredients, action.ingredient] },
      };
    }

    case RECIPE_EDITOR_ACTION.INGREDIENT_REMOVED:
      return {
        ...state,
        errors: withoutQuantityError(state.errors, action.productId),
        ingredientNotice: null,
        values: {
          ...state.values,
          ingredients: state.values.ingredients.filter((ingredient) => ingredient.productId !== action.productId),
        },
      };

    case RECIPE_EDITOR_ACTION.INGREDIENT_QUANTITY_CHANGED:
      return {
        ...state,
        errors: withoutQuantityError(state.errors, action.productId),
        values: {
          ...state.values,
          ingredients: updateIngredient(state.values.ingredients, action.productId, { quantity: action.quantity }),
        },
      };

    case RECIPE_EDITOR_ACTION.INGREDIENT_UNIT_CHANGED:
      return {
        ...state,
        values: {
          ...state.values,
          ingredients: updateIngredient(state.values.ingredients, action.productId, { unit: action.unit }),
        },
      };

    case RECIPE_EDITOR_ACTION.VALIDATION_FAILED:
      return { ...state, errors: action.errors };

    case RECIPE_EDITOR_ACTION.SAVE_STARTED:
      return { ...state, errors: NO_ERRORS, saveErrorMessage: null, status: RECIPE_EDITOR_STATUS.SAVING };

    case RECIPE_EDITOR_ACTION.SAVE_FAILED:
      // Vuelve a editar con todo lo escrito intacto, para poder reintentar.
      return { ...state, saveErrorMessage: RECIPE_EDITOR_TEXT.SAVE_ERROR, status: RECIPE_EDITOR_STATUS.EDITING };

    default:
      return state;
  }
};
