import { startTransition, useEffect, useOptimistic, useReducer } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { SHOPPING_LIST_ACTION, SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import type { ItemQuantityStepType } from "../constants/shopping-list.constants";
import type { CatalogSearchResult } from "../models/CatalogSearchResult.interface";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import type { ShoppingListState } from "../models/ShoppingListState.interface";
import {
  addItemToGeneralList,
  changeItemQuantity,
  deleteListItem,
  getGeneralList,
  setItemChecked,
} from "../services/shopping-list.service";
import { INITIAL_SHOPPING_LIST_STATE, shoppingListReducer } from "../utils/shopping-list.reducer";

interface UseShoppingListReturn {
  addItem: (searchResult: CatalogSearchResult) => Promise<void>;
  changeQuantity: (itemId: string, quantityStep: ItemQuantityStepType) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  state: ShoppingListState;
  toggleChecked: (itemId: string, isChecked: boolean) => void;
}

/** Un tachado que todavía viaja a la base. */
interface OptimisticCheck {
  checkedAt: NullableRef<string>;
  itemId: string;
}

const applyOptimisticCheck = (items: ShoppingListItem[], check: OptimisticCheck): ShoppingListItem[] =>
  items.map((item) => (item.id === check.itemId ? { ...item, checkedAt: check.checkedAt } : item));

/** Estado de la lista general: carga al montar, añade, cambia cantidades, tacha y borra productos vía servicio. */
export const useShoppingList = (): UseShoppingListReturn => {
  const [state, dispatch] = useReducer(shoppingListReducer, INITIAL_SHOPPING_LIST_STATE);
  // Lo que se ve: los items confirmados por la base más el tachado que todavía
  // viaja. React muestra el valor optimista mientras dura la transición de
  // toggleChecked y lo descarta al terminar; el reducer guarda solo lo confirmado.
  const [optimisticItems, setOptimisticCheck] = useOptimistic(state.items, applyOptimisticCheck);

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

  // Optimista (a diferencia de la cantidad): la fila cambia de sección al
  // tocarla. Sigue pendiente (deshabilitada) hasta que responde la base, y si
  // la base falla la fila vuelve sola: al terminar la transición React descarta
  // el valor optimista y queda lo del reducer, que nunca cambió.
  const toggleChecked = (itemId: string, isChecked: boolean): void => {
    dispatch({ itemId, type: SHOPPING_LIST_ACTION.CHECK_TOGGLE_STARTED });
    startTransition(async () => {
      // Hora provisoria del navegador, solo para dibujar; la real la pone la base.
      setOptimisticCheck({ checkedAt: isChecked ? new Date().toISOString() : null, itemId });
      try {
        const checkedAt = await setItemChecked(itemId, isChecked);
        // Después de un await, React pide envolver otra vez en startTransition
        // para que el cambio siga siendo parte de la misma transición.
        startTransition(() => dispatch({ checkedAt, itemId, type: SHOPPING_LIST_ACTION.CHECK_TOGGLED }));
      } catch {
        startTransition(() =>
          dispatch({
            errorMessage: SHOPPING_LIST_TEXT.CHECK_ERROR,
            itemId,
            type: SHOPPING_LIST_ACTION.CHECK_TOGGLE_FAILED,
          }),
        );
      }
    });
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

  return { addItem, changeQuantity, removeItem, state: { ...state, items: optimisticItems }, toggleChecked };
};
