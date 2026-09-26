import type { ShoppingListItem } from "./ShoppingListItem.interface";

/** Lo que necesita una fila para dibujarse, ya calculado por el ViewModel. */
export interface ShoppingListRowViewModel {
  canDecrease: boolean;
  canIncrease: boolean;
  item: ShoppingListItem;
}
