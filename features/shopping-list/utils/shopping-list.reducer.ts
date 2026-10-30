import { SHOPPING_LIST_ACTION } from "../constants/shopping-list.constants";
import type { ShoppingListAction } from "../models/ShoppingListAction.type";
import type { ShoppingListState } from "../models/ShoppingListState.interface";
import { mergeRecipeShortfalls } from "./mergeRecipeShortfalls";

// Arranca cargando: el efecto que trae la lista nunca tiene que hacer un
// dispatch síncrono para "empezar a cargar" (nextjs-enterprise-patterns §3).
export const INITIAL_SHOPPING_LIST_STATE: ShoppingListState = {
  addErrorMessage: null,
  checkErrorMessage: null,
  isLoading: true,
  items: [],
  loadErrorMessage: null,
  pendingItemIds: [],
  quantityErrorMessage: null,
  removeErrorMessage: null,
};

/**
 * Función pura: mismo estado + misma acción = mismo resultado, sin llamar a
 * la red ni a React. Todas las reglas de cómo cambia la lista viven acá.
 *
 * Hay un error separado por acción:
 * - carga: solo lo borra una carga exitosa (añadir no lo borra: la lista seguiría incompleta);
 * - añadir: lo borra el siguiente añadido exitoso;
 * - cantidad: es uno para toda la lista y lo borra el siguiente cambio de
 *   cantidad exitoso, de cualquier fila (el último intento es el que importa);
 * - eliminar: lo borra el siguiente borrado exitoso;
 * - tachar: como cantidad, uno para toda la lista; lo borra el siguiente tachado exitoso.
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
      // La base ya aplicó el merge y devuelve la fila que quedó; acá solo se
      // refleja, por id. Si esa fila ya estaba en pantalla se reemplaza (nueva
      // cantidad); si no, es nueva y va al final, aunque haya una tachada de la
      // misma variante: esa conserva su compra (regla 8, SCRUM-156).
      // Por id y no por variante: si otro miembro tachó la pendiente después de
      // cargar la lista, la base devuelve otra fila y no hay que pisar esa.
      // Añadir no toca los registros de recetas, así que la fila conserva sus
      // avisos de faltante (SCRUM-114, regla 32).
      const isAlreadyListed = state.items.some((item) => item.id === action.item.id);
      const items = isAlreadyListed
        ? state.items.map((item) =>
            item.id === action.item.id ? { ...action.item, recipeShortfalls: item.recipeShortfalls } : item,
          )
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

    case SHOPPING_LIST_ACTION.BOUGHT_QUANTITY_CHANGED:
      // Modo compra (SCRUM-67): mismo bloqueo y mismo error que la cantidad
      // pedida (QUANTITY_CHANGE_STARTED / FAILED), pero cambia lo comprado.
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.itemId ? { ...item, quantityBought: action.quantityBought } : item,
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

    case SHOPPING_LIST_ACTION.CHECK_TOGGLE_STARTED:
      // Comparte pendingItemIds con la cantidad: una sola escritura por fila a la vez.
      return { ...state, pendingItemIds: [...state.pendingItemIds, action.itemId] };

    case SHOPPING_LIST_ACTION.CHECK_TOGGLED:
      // Solo cambia el estado de tachado (cuándo, compra y lo comprado); la fila
      // no se mueve dentro de items. La sección se deriva de checkedAt en el
      // ViewModel, así destachar la devuelve a su lugar.
      return {
        ...state,
        checkErrorMessage: null,
        items: state.items.map((item) => (item.id === action.itemId ? { ...item, ...action.check } : item)),
        pendingItemIds: state.pendingItemIds.filter((itemId) => itemId !== action.itemId),
      };

    case SHOPPING_LIST_ACTION.CHECK_MERGED: {
      // Destachar juntó la fila con la pendiente de la misma variante
      // (SCRUM-156): la destachada desaparece y la pendiente queda con la
      // cantidad que confirmó la base y los avisos de las dos.
      const mergedAwayItem = state.items.find((item) => item.id === action.itemId);
      const isMergedItemListed = state.items.some((item) => item.id === action.mergedItemId);
      // Sin tiempo real, la pendiente puede no estar en pantalla (la agregó otro
      // miembro después de cargar la lista). Entonces la destachada toma su
      // lugar con el id y la cantidad de la base: es la misma variante, así que
      // nombre y tamaño son los mismos.
      if (!isMergedItemListed) {
        return {
          ...state,
          checkErrorMessage: null,
          items: state.items.map((item) =>
            item.id === action.itemId
              ? {
                  ...item,
                  checkedAt: null,
                  id: action.mergedItemId,
                  purchaseSessionId: null,
                  quantity: action.quantity,
                  quantityBought: null,
                }
              : item,
          ),
          pendingItemIds: state.pendingItemIds.filter((itemId) => itemId !== action.itemId),
        };
      }
      return {
        ...state,
        checkErrorMessage: null,
        items: state.items
          .filter((item) => item.id !== action.itemId)
          .map((item) =>
            item.id === action.mergedItemId
              ? {
                  ...item,
                  quantity: action.quantity,
                  recipeShortfalls: mergeRecipeShortfalls(
                    item.recipeShortfalls,
                    mergedAwayItem?.recipeShortfalls ?? [],
                  ),
                }
              : item,
          ),
        pendingItemIds: state.pendingItemIds.filter((itemId) => itemId !== action.itemId),
      };
    }

    case SHOPPING_LIST_ACTION.CHECK_TOGGLE_FAILED:
      // checkedAt no se toca: la fila sigue en la sección que confirmó la base.
      return {
        ...state,
        checkErrorMessage: action.errorMessage,
        pendingItemIds: state.pendingItemIds.filter((itemId) => itemId !== action.itemId),
      };

    case SHOPPING_LIST_ACTION.ITEM_REMOVED:
      // Sale recién cuando la base confirmó el borrado; hasta ahí solo estaba oculto.
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.itemId),
        removeErrorMessage: null,
      };

    case SHOPPING_LIST_ACTION.REMOVE_FAILED:
      // items no se toca: el item nunca salió de la lista, así que la fila vuelve sola.
      return { ...state, removeErrorMessage: action.errorMessage };

    default:
      return state;
  }
};
