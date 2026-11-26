import type { NullableRef } from "@/types/nullable.types";
import type { EditTotalButtonProps } from "./EditTotalButtonProps.interface";
import type { InlineTotalEditorProps } from "./InlineTotalEditorProps.interface";

/** Una compra del Historial, con solo lo que dibuja (SPEC §8). */
export interface PurchaseSessionRowProps {
  /** "₡15 000", "₡0" o "Sin total" (D8). */
  amountText: string;
  /** "Domingo 18 de octubre". */
  dateText: string;
  /** El lápiz del total (SCRUM-91); también en las "Sin total" (D12). */
  edit: EditTotalButtonProps;
  /** El campo abierto, si es el de esta compra; null si no (D21). */
  editor: NullableRef<InlineTotalEditorProps>;
  /** true si no tiene total (`total_amount` nulo): "Sin total" va como badge (SCRUM-92, CA-01). Un ₡0 es false (D8). */
  hasNoTotal: boolean;
  id: string;
  /** El nombre del supermercado, o "Supermercado no disponible" (regla 29). */
  storeText: string;
}
