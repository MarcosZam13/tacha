import type { NullableRef } from "@/types/nullable.types";

/** Lo que dibuja el panel "Cerrar compra" (ClosePurchasePanel), ya calculado. */
export interface ClosePurchaseViewModel {
  closeErrorMessage: NullableRef<string>;
  /** Ya no queda nada pendiente: el panel lo dice (CA-07). */
  isAllChecked: boolean;
  isClosing: boolean;
  isVisible: boolean;
  onDismiss: () => void;
  onSubmit: () => void;
  onTotalChange: (text: string) => void;
  totalErrorMessage: NullableRef<string>;
  totalText: string;
}
