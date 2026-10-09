import { startTransition, useEffect, useOptimistic, useReducer } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { SHOPPING_LIST_ACTION, SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import type { ItemQuantityStepType } from "../constants/shopping-list.constants";
import type { CatalogSearchResult } from "../models/CatalogSearchResult.interface";
import type { ItemCheck } from "../models/ItemCheck.interface";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import type { ShoppingListState } from "../models/ShoppingListState.interface";
import {
  addItemToGeneralList,
  changeBoughtQuantity,
  changeItemQuantity,
  checkItemInSession,
  deleteListItem,
  getGeneralList,
  setItemChecked,
} from "../services/shopping-list.service";
import { INITIAL_SHOPPING_LIST_STATE, shoppingListReducer } from "../utils/shopping-list.reducer";

interface UseShoppingListReturn {
  addItem: (searchResult: CatalogSearchResult) => Promise<void>;
  /** Modo compra (SCRUM-67): ±1 a lo comprado de una fila tachada en la compra. */
  changeBoughtQuantity: (itemId: string, quantityStep: ItemQuantityStepType) => Promise<void>;
  changeQuantity: (itemId: string, quantityStep: ItemQuantityStepType) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  state: ShoppingListState;
  /** sessionId = la compra activa (modo compra) o null. */
  toggleChecked: (itemId: string, isChecked: boolean, sessionId: NullableRef<string>) => void;
}

/** Un tachado que todavía viaja a la base. */
interface OptimisticCheck extends ItemCheck {
  itemId: string;
}

const applyOptimisticCheck = (items: ShoppingListItem[], { itemId, ...check }: OptimisticCheck): ShoppingListItem[] =>
  items.map((item) => (item.id === itemId ? { ...item, ...check } : item));

/**
 * Lo que se ve mientras viaja el tachado. La hora es provisoria (del
 * navegador, solo para dibujar); la real la pone la base. En modo compra lo
 * comprado arranca igual a lo pedido, como hace la base (016).
 */
const toOptimisticCheck = (item: ShoppingListItem, isChecked: boolean, sessionId: NullableRef<string>): ItemCheck => {
  if (!isChecked) return { checkedAt: null, purchaseSessionId: null, quantityBought: null };
  return {
    checkedAt: new Date().toISOString(),
    purchaseSessionId: sessionId,
    quantityBought: sessionId ? (item.quantityBought ?? item.quantity) : null,
  };
};

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

  // Igual que changeQuantity, sobre lo comprado. Comparte el bloqueo por fila y el error.
  const updateBoughtQuantity = async (itemId: string, quantityStep: ItemQuantityStepType): Promise<void> => {
    dispatch({ itemId, type: SHOPPING_LIST_ACTION.QUANTITY_CHANGE_STARTED });
    try {
      const quantityBought = await changeBoughtQuantity(itemId, quantityStep);
      dispatch({ itemId, quantityBought, type: SHOPPING_LIST_ACTION.BOUGHT_QUANTITY_CHANGED });
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
  // En modo compra, tachar usa la RPC de la compra; destachar es igual en los
  // dos modos: la base borra la compra y lo comprado (trigger de 016).
  const toggleChecked = (itemId: string, isChecked: boolean, sessionId: NullableRef<string>): void => {
    const item = state.items.find((listedItem) => listedItem.id === itemId);
    if (!item) return;
    dispatch({ itemId, type: SHOPPING_LIST_ACTION.CHECK_TOGGLE_STARTED });
    startTransition(async () => {
      setOptimisticCheck({ ...toOptimisticCheck(item, isChecked, sessionId), itemId });
      try {
        const check =
          isChecked && sessionId ? await checkItemInSession(itemId, sessionId) : await setItemChecked(itemId, isChecked);
        // Después de un await, React pide envolver otra vez en startTransition
        // para que el cambio siga siendo parte de la misma transición.
        startTransition(() => dispatch({ check, itemId, type: SHOPPING_LIST_ACTION.CHECK_TOGGLED }));
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

  return {
    addItem,
    changeBoughtQuantity: updateBoughtQuantity,
    changeQuantity,
    removeItem,
    state: { ...state, items: optimisticItems },
    toggleChecked,
  };
};
