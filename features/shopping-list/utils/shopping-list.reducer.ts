import { SHOPPING_LIST_ACTION } from "../constants/shopping-list.constants";
import type { ShoppingListAction } from "../models/ShoppingListAction.type";
import type { ShoppingListState } from "../models/ShoppingListState.interface";

// Arranca cargando: el efecto que trae la lista nunca tiene que hacer un
// dispatch síncrono para "empezar a cargar" (nextjs-enterprise-patterns §3).
export const INITIAL_SHOPPING_LIST_STATE: ShoppingListState = {
  addErrorMessage: null,
  isLoading: true,
  items: [],
  loadErrorMessage: null,
};

/**
 * Función pura: mismo estado + misma acción = mismo resultado, sin llamar a
 * la red ni a React. Todas las reglas de cómo cambia la lista viven acá.
 *
 * Los errores de cargar y de añadir van separados: añadir con éxito borra el
 * error de añadir, pero nunca el de carga (la lista seguiría incompleta).
 */
export const shoppingListReducer = (
  state: ShoppingListState,
  action: ShoppingListAction,
): ShoppingListState => {
  switch (action.type) {
    case SHOPPING_LIST_ACTION.LOADED:
      return { ...state, isLoading: false, items: action.items, loadErrorMessage: null };

    case SHOPPING_LIST_ACTION.LOAD_FAILED:
      return { ...state, isLoading: false, loadErrorMessage: action.errorMessage };

    case SHOPPING_LIST_ACTION.ITEM_UPSERTED: {
      // La base ya aplicó el merge; acá solo se refleja: si la variante ya
      // tenía fila se reemplaza (nueva cantidad), si no, se agrega al final.
      const isAlreadyListed = state.items.some(
        (item) => item.variantId === action.item.variantId,
      );
      const items = isAlreadyListed
        ? state.items.map((item) => (item.variantId === action.item.variantId ? action.item : item))
        : [...state.items, action.item];
      return { ...state, addErrorMessage: null, items };
    }

    case SHOPPING_LIST_ACTION.ADD_FAILED:
      return { ...state, addErrorMessage: action.errorMessage };

    default:
      return state;
  }
};
