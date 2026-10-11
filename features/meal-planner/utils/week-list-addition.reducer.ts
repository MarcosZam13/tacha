import { WEEK_LIST_ACTION, WEEK_LIST_STATUS } from "../constants/meal-planner.constants";
import type { WeekListAction, WeekListState } from "../models/week-list-addition.types";

export const CLOSED_WEEK_LIST_STATE: WeekListState = { status: WEEK_LIST_STATUS.CLOSED };

/**
 * Reducer puro del diálogo de agregar la semana. Las reglas viven acá y no en el
 * hook: solo se abre desde cerrado (o desde el aviso anterior), no se cierra
 * mientras agrega y un segundo "Agregar" no cambia nada.
 */
export const weekListReducer = (state: WeekListState, action: WeekListAction): WeekListState => {
  switch (action.type) {
    case WEEK_LIST_ACTION.OPENED:
      // Un aviso anterior (done) se reemplaza; con el diálogo abierto o agregando, otra apertura no cambia nada.
      return state.status === WEEK_LIST_STATUS.CLOSED || state.status === WEEK_LIST_STATUS.DONE
        ? { status: WEEK_LIST_STATUS.CONFIRMING, range: action.range, mealCount: action.mealCount }
        : state;

    case WEEK_LIST_ACTION.CONFIRMED:
      // Desde la confirmación o desde un error (reintentar). Ya agregando: un segundo clic no hace nada.
      return state.status === WEEK_LIST_STATUS.CONFIRMING || state.status === WEEK_LIST_STATUS.FAILED
        ? { status: WEEK_LIST_STATUS.ADDING, range: state.range, mealCount: state.mealCount }
        : state;

    case WEEK_LIST_ACTION.SUCCEEDED:
      return state.status === WEEK_LIST_STATUS.ADDING
        ? { status: WEEK_LIST_STATUS.DONE, range: state.range, summaryLines: action.summaryLines }
        : state;

    case WEEK_LIST_ACTION.FAILED:
      return state.status === WEEK_LIST_STATUS.ADDING
        ? {
            status: WEEK_LIST_STATUS.FAILED,
            range: state.range,
            mealCount: state.mealCount,
            errorMessage: action.errorMessage,
          }
        : state;

    case WEEK_LIST_ACTION.CLOSED:
      // Mientras agrega no se cierra: la petición ya salió y su resultado se tiene que ver.
      return state.status === WEEK_LIST_STATUS.ADDING ? state : CLOSED_WEEK_LIST_STATE;

    default:
      // Ninguna acción conocida llega acá (la unión es cerrada); si llegara una
      // nueva sin caso, el estado no cambia en vez de romperse.
      return state;
  }
};
