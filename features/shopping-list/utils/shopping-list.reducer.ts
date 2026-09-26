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
  pendingItemIds: [],
  quantityErrorMessage: null,
};

/**
 * Función pura: mismo estado + misma acción = mismo resultado, sin llamar a
 * la red ni a React. Todas las reglas de cómo cambia la lista viven acá.
 *
 * Hay tres errores separados:
 * - carga: solo lo borra una carga exitosa (añadir no lo borra: la lista seguiría incompleta);
 * - añadir: lo borra el siguiente añadido exitoso;
 * - cantidad: es uno para toda la lista y lo borra el siguiente cambio de
 *   cantidad exitoso, de cualquier fila (el último intento es el que importa).
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

    case SHOPPING_LIST_ACTION.QUANTITY_CHANGE_STARTED:
      return { ...state, pendingItemIds: [...state.pendingItemIds, action.itemId] };

    case SHOPPING_LIST_ACTION.QUANTITY_CHANGED:
      // Se muestra la cantidad que quedó en la base, no la que calculó el cliente.
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.itemId ? { ...item, quantity: action.quantity } : item,
        ),
        pendingItemIds: state.pendingItemIds.filter((itemId) => itemId !== action.itemId),
        quantityErrorMessage: null,
      };

    case SHOPPING_LIST_ACTION.QUANTITY_CHANGE_FAILED:
      // La cantidad no se toca: la fila sigue mostrando lo último que confirmó la base.
      return {
        ...state,
        pendingItemIds: state.pendingItemIds.filter((itemId) => itemId !== action.itemId),
        quantityErrorMessage: action.errorMessage,
      };

    default:
      return state;
  }
};
