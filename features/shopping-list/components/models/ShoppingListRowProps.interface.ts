import type { ShoppingListRowViewModel } from "../../models/ShoppingListRowViewModel.interface";

export interface ShoppingListRowProps {
  /** El campo "Encargado" (SCRUM-108), que arma la pantalla; la fila solo le da su lugar. */
  assigneeSlot?: React.ReactNode;
  onDecrease: () => void;
  onIncrease: () => void;
  onOpenDetail: () => void;
  onRemove: () => void;
  onToggleChecked: () => void;
  row: ShoppingListRowViewModel;
}
