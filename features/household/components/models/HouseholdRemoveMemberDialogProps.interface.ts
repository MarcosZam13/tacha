import type { NullableRef } from "@/types/nullable.types";

/**
 * El diálogo de eliminar a un integrante (SCRUM-61), con todo ya resuelto por
 * el ViewModel: el diálogo no ve el id de la persona, solo su nombre.
 */
export interface HouseholdRemoveMemberDialogProps {
  /** "No se pudo eliminar al integrante. Inténtalo de nuevo", o null. */
  errorMessage: NullableRef<string>;
  isDialogOpen: boolean;
  /** Mientras espera a la base: botones deshabilitados y no se cierra. */
  isRemoving: boolean;
  /** El nombre de la persona, o "Miembro sin nombre"; null con el diálogo cerrado. */
  memberLabel: NullableRef<string>;
  /** También lo llaman Escape y el clic afuera (Modal); no cierra mientras elimina. */
  onRemoveCancel: () => void;
  onRemoveConfirm: () => void;
}
