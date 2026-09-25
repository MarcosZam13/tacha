import type { NullableRef } from "@/types/nullable.types";
import type { ShoppingListItem } from "./ShoppingListItem.interface";

export interface ShoppingListState {
  addErrorMessage: NullableRef<string>;
  isLoading: boolean;
  items: ShoppingListItem[];
  loadErrorMessage: NullableRef<string>;
}
