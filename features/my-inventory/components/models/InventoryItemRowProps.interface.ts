import type { InventoryItemActions, InventoryItemViewModel } from "../../models/MyInventoryViewModel.interface";

export interface InventoryItemRowProps {
  item: InventoryItemViewModel;
  actions: InventoryItemActions;
}
