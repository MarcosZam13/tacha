import { useEffect, useReducer } from "react";
import { SHOPPING_LIST_ACTION, SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import type { ItemQuantityStepType } from "../constants/shopping-list.constants";
import type { CatalogSearchResult } from "../models/CatalogSearchResult.interface";
import type { ShoppingListState } from "../models/ShoppingListState.interface";
import {
  addItemToGeneralList,
  changeItemQuantity,
  deleteListItem,
  getGeneralList,
} from "../services/shopping-list.service";
import { INITIAL_SHOPPING_LIST_STATE, shoppingListReducer } from "../utils/shopping-list.reducer";

interface UseShoppingListReturn {
  addItem: (searchResult: CatalogSearchResult) => Promise<void>;
  changeQuantity: (itemId: string, quantityStep: ItemQuantityStepType) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  state: ShoppingListState;
}

/** Estado de la lista general: carga al montar, añade, cambia cantidades y borra productos vía servicio. */
export const useShoppingList = (): UseShoppingListReturn => {
  const [state, dispatch] = useReducer(shoppingListReducer, INITIAL_SHOPPING_LIST_STATE);

  useEffect(() => {
    // Si el componente se desmonta antes de que responda la base, la
    // respuesta se ignora en vez de actualizar un estado que ya no existe.
    let isCancelled = false;

    getGeneralList()
      .then((items) => {
        if (!isCancelled) dispatch({ items, type: SHOPPING_LIST_ACTION.LOADED });
      })
      .catch(() => {
        if (!isCancelled) {
          dispatch({ errorMessage: SHOPPING_LIST_TEXT.LOAD_ERROR, type: SHOPPING_LIST_ACTION.LOAD_FAILED });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const addItem = async (searchResult: CatalogSearchResult): Promise<void> => {
    try {
      const item = await addItemToGeneralList(searchResult);
      dispatch({ item, type: SHOPPING_LIST_ACTION.ITEM_UPSERTED });
    } catch {
      dispatch({ errorMessage: SHOPPING_LIST_TEXT.ADD_ERROR, type: SHOPPING_LIST_ACTION.ADD_FAILED });
    }
  };

  const changeQuantity = async (itemId: string, quantityStep: ItemQuantityStepType): Promise<void> => {
    // Síncrono dentro de un handler (no de un efecto): marca la fila como
    // pendiente para que no salga otro cambio antes de que vuelva este.
    dispatch({ itemId, type: SHOPPING_LIST_ACTION.QUANTITY_CHANGE_STARTED });
    try {
      const quantity = await changeItemQuantity(itemId, quantityStep);
      dispatch({ itemId, quantity, type: SHOPPING_LIST_ACTION.QUANTITY_CHANGED });
    } catch {
      dispatch({
        errorMessage: SHOPPING_LIST_TEXT.QUANTITY_ERROR,
        itemId,
        type: SHOPPING_LIST_ACTION.QUANTITY_CHANGE_FAILED,
      });
    }
  };

  // Se llama cuando vence el plazo para deshacer (useItemRemoval), no al tocar eliminar.
  const removeItem = async (itemId: string): Promise<void> => {
    try {
      await deleteListItem(itemId);
      dispatch({ itemId, type: SHOPPING_LIST_ACTION.ITEM_REMOVED });
    } catch {
      dispatch({ errorMessage: SHOPPING_LIST_TEXT.REMOVE_ERROR, type: SHOPPING_LIST_ACTION.REMOVE_FAILED });
    }
  };

  return { addItem, changeQuantity, removeItem, state };
};
