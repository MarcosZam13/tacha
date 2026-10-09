import type { NullableRef } from "@/types/nullable.types";
import type { ShoppingListItem } from "./ShoppingListItem.interface";

/** Lo que necesita una fila para dibujarse, ya calculado por el ViewModel. */
export interface ShoppingListRowViewModel {
  canDecrease: boolean;
  canIncrease: boolean;
  canRemove: boolean;
  canToggleChecked: boolean;
  /** El número del "−"/"+": lo comprado en una fila tachada de la compra activa (SCRUM-67), si no lo pedido. */
  displayedQuantity: number;
  isChecked: boolean;
  item: ShoppingListItem;
  /** "Pedido N" cuando lo comprado difiere de lo pedido; null si no hay nada que aclarar. */
  requestedNote: NullableRef<string>;
}
