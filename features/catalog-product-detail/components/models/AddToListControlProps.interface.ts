import type { NullableRef } from "@/types/nullable.types";

export interface AddToListControlProps {
  addErrorMessage: NullableRef<string>;
  canDecreaseQuantity: boolean;
  isAdding: boolean;
  onAddToList: () => void;
  onDecreaseQuantity: () => void;
  onIncreaseQuantity: () => void;
  quantity: number;
  wasJustAdded: boolean;
}
