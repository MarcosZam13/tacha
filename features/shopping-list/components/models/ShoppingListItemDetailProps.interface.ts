import type { ItemDetailViewModel } from "../../models/ItemDetailViewModel.interface";

export interface ShoppingListItemDetailProps {
  detail: ItemDetailViewModel;
  onClose: () => void;
}
