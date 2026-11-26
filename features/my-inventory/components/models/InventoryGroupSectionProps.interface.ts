import type { InventoryGroupViewModel, InventoryItemActions } from "../../models/MyInventoryViewModel.interface";

export interface InventoryGroupSectionProps {
  group: InventoryGroupViewModel;
  actions: InventoryItemActions;
}
