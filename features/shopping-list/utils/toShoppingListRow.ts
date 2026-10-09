import type { NullableRef } from "@/types/nullable.types";
import { PURCHASE_SESSION_TEXT } from "../constants/purchase-session.constants";
import { ITEM_QUANTITY } from "../constants/shopping-list.constants";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import type { ShoppingListRowViewModel } from "../models/ShoppingListRowViewModel.interface";

interface ToShoppingListRowParams {
  /** La compra activa (modo compra) o null. */
  activeSessionId: NullableRef<string>;
  /** La fila espera respuesta de la base: sus botones se deshabilitan. */
  isPending: boolean;
  item: ShoppingListItem;
}

/**
 * Modo compra (SCRUM-67, regla 16): una fila tachada en ESTA compra muestra
 * y ajusta lo comprado; cualquier otra, lo pedido.
 */
export const isBoughtInSession = (item: ShoppingListItem, activeSessionId: NullableRef<string>): boolean =>
  activeSessionId !== null && item.purchaseSessionId === activeSessionId && item.quantityBought !== null;

/** Una fila de la lista → lo que dibuja ShoppingListRow. Función pura, sin React. */
export const toShoppingListRow = ({ activeSessionId, isPending, item }: ToShoppingListRowParams): ShoppingListRowViewModel => {
  const boughtQuantity = isBoughtInSession(item, activeSessionId) ? item.quantityBought : null;
  const displayedQuantity = boughtQuantity ?? item.quantity;

  return {
    canDecrease: !isPending && displayedQuantity > ITEM_QUANTITY.MIN,
    canIncrease: !isPending,
    // Mientras la cantidad se guarda no se elimina: la respuesta podría llegar después del borrado.
    canRemove: !isPending,
    canToggleChecked: !isPending,
    displayedQuantity,
    isChecked: item.checkedAt !== null,
    item,
    requestedNote:
      boughtQuantity !== null && boughtQuantity !== item.quantity
        ? `${PURCHASE_SESSION_TEXT.REQUESTED} ${item.quantity}`
        : null,
  };
};
