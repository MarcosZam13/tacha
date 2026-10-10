import { MEAL_SLOT_DIALOG_ACTION, MEAL_SLOT_DIALOG_STATUS, SERVINGS_MULTIPLIER } from "../constants/meal-planner.constants";
import type { MealSlotFormValues } from "../models/meal-plan.interfaces";
import type { MealSlotDialogAction, MealSlotDialogState } from "../models/meal-plan.types";
import { clampServingsMultiplier } from "./clampServingsMultiplier";

export const CLOSED_DIALOG_STATE: MealSlotDialogState = { status: MEAL_SLOT_DIALOG_STATUS.CLOSED };

/**
 * Cambia los valores del formulario solo mientras se puede editar: abierto sin
 * guardar (`editing`) o después de un error (`failed`, que vuelve a `editing`
 * y limpia el mensaje). Cerrado o guardando, ignora el cambio.
 */
const updateValues = (
  state: MealSlotDialogState,
  update: (values: MealSlotFormValues) => MealSlotFormValues,
): MealSlotDialogState =>
  state.status === MEAL_SLOT_DIALOG_STATUS.EDITING || state.status === MEAL_SLOT_DIALOG_STATUS.FAILED
    ? { status: MEAL_SLOT_DIALOG_STATUS.EDITING, target: state.target, values: update(state.values) }
    : state;

/**
 * Reducer puro del diálogo de asignar. Las reglas viven acá y no en el hook:
 * el multiplicador no sale de ×0,5 a ×4, no se edita ni se cierra mientras
 * guarda, y un error se limpia al volver a editar.
 */
export const mealSlotDialogReducer = (state: MealSlotDialogState, action: MealSlotDialogAction): MealSlotDialogState => {
  switch (action.type) {
    case MEAL_SLOT_DIALOG_ACTION.OPENED:
      return { status: MEAL_SLOT_DIALOG_STATUS.EDITING, target: action.target, values: action.values };

    case MEAL_SLOT_DIALOG_ACTION.RECIPE_CHOSEN:
      return updateValues(state, (values) => ({ ...values, recipeId: action.recipeId }));

    case MEAL_SLOT_DIALOG_ACTION.COOK_CHANGED:
      return updateValues(state, (values) => ({ ...values, cookChoice: action.cookChoice }));

    case MEAL_SLOT_DIALOG_ACTION.MULTIPLIER_INCREASED:
      return updateValues(state, (values) => ({
        ...values,
        servingsMultiplier: clampServingsMultiplier(values.servingsMultiplier + SERVINGS_MULTIPLIER.STEP),
      }));

    case MEAL_SLOT_DIALOG_ACTION.MULTIPLIER_DECREASED:
      return updateValues(state, (values) => ({
        ...values,
        servingsMultiplier: clampServingsMultiplier(values.servingsMultiplier - SERVINGS_MULTIPLIER.STEP),
      }));

    case MEAL_SLOT_DIALOG_ACTION.SAVE_STARTED:
      // Ya guardando: un segundo clic no cambia nada (SPEC regla 19). Sin
      // receta elegida tampoco se guarda: la UI deshabilita el botón y acá no se
      // confía solo en eso.
      return (state.status === MEAL_SLOT_DIALOG_STATUS.EDITING || state.status === MEAL_SLOT_DIALOG_STATUS.FAILED) &&
        state.values.recipeId !== null
        ? { status: MEAL_SLOT_DIALOG_STATUS.SAVING, target: state.target, values: state.values }
        : state;

    case MEAL_SLOT_DIALOG_ACTION.SAVE_FAILED:
      return state.status === MEAL_SLOT_DIALOG_STATUS.SAVING
        ? {
            status: MEAL_SLOT_DIALOG_STATUS.FAILED,
            target: state.target,
            values: state.values,
            errorMessage: action.errorMessage,
          }
        : state;

    case MEAL_SLOT_DIALOG_ACTION.CLOSED:
      // Mientras guarda no se cierra: la petición ya salió y su resultado se tiene que ver.
      return state.status === MEAL_SLOT_DIALOG_STATUS.SAVING ? state : CLOSED_DIALOG_STATE;

    default:
      // Ninguna acción conocida llega acá (la unión es cerrada); si llegara una
      // nueva sin caso, el estado no cambia en vez de romperse.
      return state;
  }
};
