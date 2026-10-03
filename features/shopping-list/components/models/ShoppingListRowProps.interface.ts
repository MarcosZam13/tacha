import type { ShoppingListRowViewModel } from "../../models/ShoppingListRowViewModel.interface";

export interface ShoppingListRowProps {
  onDecrease: () => void;
  onIncrease: () => void;
  onOpenDetail: () => void;
  row: ShoppingListRowViewModel;
}
