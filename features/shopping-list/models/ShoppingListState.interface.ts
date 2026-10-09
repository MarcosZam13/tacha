import type { NullableRef } from "@/types/nullable.types";
import type { ShoppingListItem } from "./ShoppingListItem.interface";

export interface ShoppingListState {
  addErrorMessage: NullableRef<string>;
  checkErrorMessage: NullableRef<string>;
  isLoading: boolean;
  items: ShoppingListItem[];
  loadErrorMessage: NullableRef<string>;
  /** Filas con una escritura (cantidad o tachado) esperando respuesta: sus botones se deshabilitan. */
  pendingItemIds: string[];
  quantityErrorMessage: NullableRef<string>;
  removeErrorMessage: NullableRef<string>;
}
