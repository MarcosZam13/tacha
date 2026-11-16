import { startTransition, useEffect, useOptimistic, useReducer, useRef } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { SHOPPING_LIST_ACTION, SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import type { ItemQuantityStepType } from "../constants/shopping-list.constants";
import type { CatalogSearchResult } from "../models/CatalogSearchResult.interface";
import type { ItemCheck } from "../models/ItemCheck.interface";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import type { ShoppingListState } from "../models/ShoppingListState.interface";
import {
  addItemToGeneralList,
  changeItemBoughtQuantity,
  changeItemQuantity,
  checkItemInSession,
  deleteListItem,
  getGeneralList,
  getGeneralListShortfalls,
  setItemChecked,
} from "../services/shopping-list.service";
import { INITIAL_SHOPPING_LIST_STATE, shoppingListReducer } from "../utils/shopping-list.reducer";

interface UseShoppingListReturn {
  addItem: (searchResult: CatalogSearchResult) => Promise<void>;
  /** Modo compra (SCRUM-67): ±1 a lo comprado de una fila tachada en la compra. */
  changeBoughtQuantity: (itemId: string, quantityStep: ItemQuantityStepType) => Promise<void>;
  changeQuantity: (itemId: string, quantityStep: ItemQuantityStepType) => Promise<void>;
  /** La base cerró esa compra: sus filas dejan de ofrecer deshacer al destachar (SCRUM-115, regla 45). */
  markPurchaseClosed: (sessionId: string) => void;
  /** Vuelve a pedir la lista entera; devuelve lo que quedó en pantalla, o null si falló (SCRUM-115). */
  reload: () => Promise<NullableRef<ShoppingListItem[]>>;
  removeItem: (itemId: string) => Promise<void>;
  state: ShoppingListState;
  /**
   * sessionId = la compra activa (modo compra) o null. onChecked se llama
   * cuando la base confirma un tachado (abre "¿Qué hiciste?", SCRUM-115).
   */
  toggleChecked: (
    itemId: string,
    isChecked: boolean,
    sessionId: NullableRef<string>,
    onChecked?: () => void,
  ) => void;
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
  // Número de la última vez que se pidieron los avisos: una respuesta vieja
  // que llega después de una nueva se ignora.
  const latestShortfallsRequestRef = useRef(0);

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

  // El faltante es una cuenta en vivo (SCRUM-115, regla 47): después de un
  // cambio que puede moverlo (cantidad, añadir, borrar, tachar, juntar) se
  // vuelven a pedir solo los avisos. Si falla se quedan los últimos que se
  // vieron: la acción ya se guardó y no se le muestra un error por esto.
  const refreshShortfalls = async (): Promise<void> => {
    latestShortfallsRequestRef.current += 1;
    const requestNumber = latestShortfallsRequestRef.current;
    try {
      const shortfallsByItemId = await getGeneralListShortfalls();
      if (requestNumber !== latestShortfallsRequestRef.current) return;
      startTransition(() => dispatch({ shortfallsByItemId, type: SHOPPING_LIST_ACTION.SHORTFALLS_REFRESHED }));
    } catch {
      // Se conservan los avisos anteriores (ver arriba).
    }
  };

  const reload = async (): Promise<NullableRef<ShoppingListItem[]>> => {
    // La recarga trae avisos nuevos: un refresco de avisos que salió antes y
    // responde después ya no tiene que pisarlos.
    latestShortfallsRequestRef.current += 1;
    try {
      const items = await getGeneralList();
      dispatch({ items, type: SHOPPING_LIST_ACTION.LOADED });
      return items;
    } catch {
      dispatch({ errorMessage: SHOPPING_LIST_TEXT.LOAD_ERROR, type: SHOPPING_LIST_ACTION.LOAD_FAILED });
      return null;
    }
  };

  const addItem = async (searchResult: CatalogSearchResult): Promise<void> => {
    try {
      const item = await addItemToGeneralList(searchResult);
      dispatch({ item, type: SHOPPING_LIST_ACTION.ITEM_UPSERTED });
      void refreshShortfalls();
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
      void refreshShortfalls();
    } catch {
      dispatch({
        errorMessage: SHOPPING_LIST_TEXT.QUANTITY_ERROR,
        itemId,
        type: SHOPPING_LIST_ACTION.QUANTITY_CHANGE_FAILED,
      });
    }
  };

  // Igual que changeQuantity, sobre lo comprado. Comparte el bloqueo por fila y el error.
  const changeBoughtQuantity = async (itemId: string, quantityStep: ItemQuantityStepType): Promise<void> => {
    dispatch({ itemId, type: SHOPPING_LIST_ACTION.QUANTITY_CHANGE_STARTED });
    try {
      const quantityBought = await changeItemBoughtQuantity(itemId, quantityStep);
      dispatch({ itemId, quantityBought, type: SHOPPING_LIST_ACTION.BOUGHT_QUANTITY_CHANGED });
      void refreshShortfalls();
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
  // Después de confirmar se vuelven a pedir los avisos: destachar quita un
  // descarte de "¿Qué hiciste?" y juntar mueve los pedidos (SCRUM-115).
  const toggleChecked = (
    itemId: string,
    isChecked: boolean,
    sessionId: NullableRef<string>,
    onChecked?: () => void,
  ): void => {
    const item = state.items.find((listedItem) => listedItem.id === itemId);
    if (!item) return;
    dispatch({ itemId, type: SHOPPING_LIST_ACTION.CHECK_TOGGLE_STARTED });
    startTransition(async () => {
      setOptimisticCheck({ ...toOptimisticCheck(item, isChecked, sessionId), itemId });
      try {
        if (isChecked && sessionId) {
          const check = await checkItemInSession(itemId, sessionId);
          // Después de un await, React pide envolver otra vez en startTransition
          // para que el cambio siga siendo parte de la misma transición.
          startTransition(() => dispatch({ check, itemId, type: SHOPPING_LIST_ACTION.CHECK_TOGGLED }));
          onChecked?.();
          void refreshShortfalls();
          return;
        }
        const result = await setItemChecked(itemId, isChecked);
        // Otro id: al destachar, la base la juntó con la pendiente de la misma
        // presentación (SCRUM-156) y esta fila ya no existe.
        startTransition(() =>
          dispatch(
            result.itemId === itemId
              ? { check: result.check, itemId, type: SHOPPING_LIST_ACTION.CHECK_TOGGLED }
              : {
                  itemId,
                  mergedItemId: result.itemId,
                  quantity: result.quantity,
                  type: SHOPPING_LIST_ACTION.CHECK_MERGED,
                },
          ),
        );
        if (isChecked) onChecked?.();
        void refreshShortfalls();
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
      void refreshShortfalls();
    } catch {
      dispatch({ errorMessage: SHOPPING_LIST_TEXT.REMOVE_ERROR, type: SHOPPING_LIST_ACTION.REMOVE_FAILED });
    }
  };

  const markPurchaseClosed = (sessionId: string): void => {
    dispatch({ sessionId, type: SHOPPING_LIST_ACTION.PURCHASE_CLOSED });
  };

  return {
    addItem,
    changeBoughtQuantity,
    changeQuantity,
    markPurchaseClosed,
    reload,
    removeItem,
    state: { ...state, items: optimisticItems },
    toggleChecked,
  };
};
