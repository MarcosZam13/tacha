import type { ShoppingListItem } from "./ShoppingListItem.interface";

/** Lo que necesita una fila para dibujarse, ya calculado por el ViewModel. */
export interface ShoppingListRowViewModel {
  canDecrease: boolean;
  canIncrease: boolean;
  canRemove: boolean;
  item: ShoppingListItem;
}
