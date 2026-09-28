import type { SHOPPING_LIST_ACTION } from "../constants/shopping-list.constants";
import type { ShoppingListItem } from "./ShoppingListItem.interface";

/**
 * Unión discriminada por `type`: en cada `case` del reducer TypeScript sabe
 * qué otros campos trae la acción (ej. `items` solo existe en LOADED).
 */
export type ShoppingListAction =
  | { type: typeof SHOPPING_LIST_ACTION.ADD_FAILED; errorMessage: string }
  | { type: typeof SHOPPING_LIST_ACTION.ITEM_UPSERTED; item: ShoppingListItem }
  | { type: typeof SHOPPING_LIST_ACTION.LOADED; items: ShoppingListItem[] }
  | { type: typeof SHOPPING_LIST_ACTION.LOAD_FAILED; errorMessage: string }
  | { type: typeof SHOPPING_LIST_ACTION.QUANTITY_CHANGE_STARTED; itemId: string }
  | { type: typeof SHOPPING_LIST_ACTION.QUANTITY_CHANGED; itemId: string; quantity: number }
  | { type: typeof SHOPPING_LIST_ACTION.QUANTITY_CHANGE_FAILED; errorMessage: string; itemId: string };
