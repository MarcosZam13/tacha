import type { ListAssigneeViewModel } from "../../models/ListAssigneeViewModel.interface";

export interface AssigneeFieldProps {
  /** Espaciado del botón en la fila donde se usa (cada pantalla lo decide). */
  className?: string;
  itemId: string;
  viewModel: ListAssigneeViewModel;
}
