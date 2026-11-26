import type { SignOutStatusType } from "../constants/sign-out.constants";

export interface SignOutViewModel {
  /** Cierra el diálogo de confirmación sin cerrar la sesión. */
  handleCancel: () => void;
  /** Cierra la sesión sin volver a preguntar: el botón "Cerrar sesión" del diálogo. */
  handleConfirm: () => Promise<void>;
  /** El clic en el botón: cierra de inmediato o, con cambios sin guardar, pide confirmación. */
  handleRequest: () => Promise<void>;
  isConfirmOpen: boolean;
  isSigningOut: boolean;
  status: SignOutStatusType;
}
