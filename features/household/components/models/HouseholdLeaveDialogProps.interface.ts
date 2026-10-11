import type { NullableRef } from "@/types/nullable.types";

/**
 * Un radio para elegir al nuevo admin, ya armado: el diálogo no ve el id del
 * miembro (no queda en el HTML) ni su rol, solo qué mostrar y qué llamar.
 */
export interface HouseholdLeaveNewAdminOption {
  isSelected: boolean;
  /** El nombre del miembro, o "Miembro sin nombre". Nunca el correo. */
  label: string;
  onSelect: () => void;
  /** Solo para la key de React; no se dibuja. */
  optionKey: string;
}

/** El diálogo de salir de la familia, con todo ya resuelto por el ViewModel. */
export interface HouseholdLeaveDialogProps {
  /** Qué pasa al salir según el caso (miembro, admin único, admin que transfiere). */
  description: string;
  errorMessage: NullableRef<string>;
  isConfirmDisabled: boolean;
  isDialogOpen: boolean;
  isLeaving: boolean;
  isLoadingMembers: boolean;
  /** Vacío salvo que el admin tenga que elegir a quién pasarle el rol. */
  newAdminOptions: HouseholdLeaveNewAdminOption[];
  /** También lo llaman Escape y el clic afuera (Modal); no cierra mientras sale. */
  onLeaveCancel: () => void;
  onLeaveConfirm: () => void;
  /** Hay qué confirmar: la descripción y el botón "Salir". */
  showConfirm: boolean;
  title: string;
}
