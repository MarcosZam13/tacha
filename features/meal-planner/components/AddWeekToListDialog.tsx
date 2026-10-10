import { Button, Modal } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { WEEK_LIST_TEXT } from "../constants/meal-planner.constants";
import type { AddWeekToListDialogProps } from "./models/AddWeekToListDialogProps.type";

/**
 * Confirmación de agregar la semana: dice cuántas comidas se agregan y a qué
 * lista, con "Agregar" y "Cancelar", y el error si falla (el diálogo sigue
 * abierto para reintentar). Clic fuera y Escape cierran (Modal compartido) y el
 * hook no deja cerrar mientras agrega. Solo presentación.
 */
export const AddWeekToListDialog = ({
  confirmMessage,
  errorMessage,
  isAdding,
  isOpen,
  onClose,
  onConfirm,
}: AddWeekToListDialogProps): React.JSX.Element => (
  <Modal isOpen={isOpen} onClose={onClose} title={WEEK_LIST_TEXT.DIALOG_TITLE}>
    <div className="flex flex-col gap-4">
      {confirmMessage ? <p className="font-body text-sm text-tacha-text">{confirmMessage}</p> : null}

      {errorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isAdding} onClick={onClose}>
          {WEEK_LIST_TEXT.CANCEL}
        </Button>
        <Button isDisabled={isAdding} onClick={onConfirm}>
          {isAdding ? WEEK_LIST_TEXT.ADDING : WEEK_LIST_TEXT.CONFIRM}
        </Button>
      </div>
    </div>
  </Modal>
);
