import { Button, Modal } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { HOUSEHOLD_REMOVE_MEMBER_TEXT } from "../constants/household.constants";
import type { HouseholdRemoveMemberDialogProps } from "./models/HouseholdRemoveMemberDialogProps.interface";

/**
 * Confirmación antes de eliminar a un integrante (SCRUM-61, CA-02). Solo
 * presentación: qué pasa al confirmar o cancelar lo decide
 * useHouseholdMemberRemoval. Clic fuera y Escape llaman a onRemoveCancel
 * (comportamiento del Modal), que no cierra mientras elimina.
 *
 * El título aprobado (D3) no nombra a la persona: su nombre va en el cuerpo,
 * para que quede claro a quién se elimina (SPEC §8). El rojo (destructive) va
 * solo en el botón que de verdad elimina.
 */
export const HouseholdRemoveMemberDialog = ({
  errorMessage,
  isDialogOpen,
  isRemoving,
  memberLabel,
  onRemoveCancel,
  onRemoveConfirm,
}: HouseholdRemoveMemberDialogProps): React.JSX.Element => (
  <Modal isOpen={isDialogOpen} onClose={onRemoveCancel} title={HOUSEHOLD_REMOVE_MEMBER_TEXT.DIALOG_TITLE}>
    <div className="flex flex-col gap-4" aria-busy={isRemoving}>
      <p className="font-body text-base font-semibold text-tacha-text">{memberLabel}</p>
      <p className="font-body text-sm text-tacha-textsec">{HOUSEHOLD_REMOVE_MEMBER_TEXT.DIALOG_MESSAGE}</p>
      {errorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isRemoving} onClick={onRemoveCancel}>
          {HOUSEHOLD_REMOVE_MEMBER_TEXT.CANCEL}
        </Button>
        <Button variant={BUTTON_VARIANT.DESTRUCTIVE} isDisabled={isRemoving} onClick={onRemoveConfirm}>
          {HOUSEHOLD_REMOVE_MEMBER_TEXT.CONFIRM}
        </Button>
      </div>
    </div>
  </Modal>
);
