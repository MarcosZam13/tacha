import type { NullableRef } from "@/types/nullable.types";

export interface UseModalViewModelProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ModalViewModel {
  /** El contenedor con role="dialog": de ahí salen los elementos enfocables y adónde va el foco si no hay ninguno. */
  dialogRef: React.RefObject<NullableRef<HTMLDivElement>>;
  /** Un clic en el fondo no le saca el foco al diálogo; el click, y con él onClose, siguen igual (D3). */
  onOverlayMouseDown: (event: React.MouseEvent<HTMLElement>) => void;
}
