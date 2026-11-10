import { SHORTFALL_PANEL_ACTION, SHORTFALL_PANEL_STATUS } from "../constants/shortfall-resolution.constants";
import type { ShortfallPanelAction, ShortfallPanelState } from "../models/shortfall-resolution.types";

export const INITIAL_SHORTFALL_PANEL_STATE: ShortfallPanelState = { status: SHORTFALL_PANEL_STATUS.CLOSED };

/**
 * Estados del panel "¿Qué hiciste?" (SPEC §18.6). Función pura: todas las
 * transiciones viven acá. Una acción que no tiene sentido en el estado actual
 * (ej. elegir con el panel cerrado) deja el estado como está.
 */
export const shortfallPanelReducer = (
  state: ShortfallPanelState,
  action: ShortfallPanelAction,
): ShortfallPanelState => {
  if (action.type === SHORTFALL_PANEL_ACTION.OPENED) {
    return { isStillShort: false, itemId: action.itemId, status: SHORTFALL_PANEL_STATUS.CHOOSING };
  }
  if (action.type === SHORTFALL_PANEL_ACTION.CLOSED || state.status === SHORTFALL_PANEL_STATUS.CLOSED) {
    return INITIAL_SHORTFALL_PANEL_STATE;
  }

  const { itemId } = state;
  switch (action.type) {
    case SHORTFALL_PANEL_ACTION.RESOLVE_STARTED:
      // Mientras se guarda no se puede elegir otra cosa: una sola escritura a la vez.
      if (state.status === SHORTFALL_PANEL_STATUS.RESOLVING) return state;
      return { itemId, status: SHORTFALL_PANEL_STATUS.RESOLVING };

    case SHORTFALL_PANEL_ACTION.RESOLVE_FAILED:
      return { errorMessage: action.errorMessage, itemId, status: SHORTFALL_PANEL_STATUS.FAILED };

    // Se guardó, pero la fila todavía tiene avisos: el panel sigue abierto (regla 39).
    case SHORTFALL_PANEL_ACTION.STILL_SHORT:
      return { isStillShort: true, itemId, status: SHORTFALL_PANEL_STATUS.CHOOSING };

    case SHORTFALL_PANEL_ACTION.PRESENTATIONS_REQUESTED:
      return { itemId, status: SHORTFALL_PANEL_STATUS.LOADING_PRESENTATIONS };

    case SHORTFALL_PANEL_ACTION.PRESENTATIONS_LOADED:
      // Una respuesta que llega después de "Volver" o de cerrar no reabre la vista.
      if (state.status !== SHORTFALL_PANEL_STATUS.LOADING_PRESENTATIONS) return state;
      return { itemId, presentations: action.presentations, status: SHORTFALL_PANEL_STATUS.CHOOSING_PRESENTATION };

    case SHORTFALL_PANEL_ACTION.PRESENTATIONS_FAILED:
      if (state.status !== SHORTFALL_PANEL_STATUS.LOADING_PRESENTATIONS) return state;
      return { errorMessage: action.errorMessage, itemId, status: SHORTFALL_PANEL_STATUS.PRESENTATIONS_FAILED };

    case SHORTFALL_PANEL_ACTION.BACK_TO_CHOICES:
      return { isStillShort: false, itemId, status: SHORTFALL_PANEL_STATUS.CHOOSING };

    default:
      return state;
  }
};
