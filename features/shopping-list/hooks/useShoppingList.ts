import { useEffect, useReducer } from "react";
import { SHOPPING_LIST_ACTION, SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import type { CatalogSearchResult } from "../models/CatalogSearchResult.interface";
import type { ShoppingListState } from "../models/ShoppingListState.interface";
import { addItemToGeneralList, getGeneralList } from "../services/shopping-list.service";
import { INITIAL_SHOPPING_LIST_STATE, shoppingListReducer } from "../utils/shopping-list.reducer";

interface UseShoppingListReturn {
  addItem: (searchResult: CatalogSearchResult) => Promise<void>;
  state: ShoppingListState;
}

/** Estado de la lista general: carga al montar y añade productos vía servicio. */
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

  return { addItem, state };
};
