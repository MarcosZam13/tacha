import { Button, Modal } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { WEEK_LIST_TEXT } from "../constants/meal-planner.constants";
import type { AddWeekToListDialogProps } from "./models/AddWeekToListDialogProps.type";
import { WeekListDestinationField } from "./WeekListDestinationField";

/**
 * Confirmación de agregar la semana: dice cuántas comidas se agregan y a qué
 * lista, con "Agregar" y "Cancelar", y el error si falla (el diálogo sigue
 * abierto para reintentar). Las sublistas del selector cargan aparte: mientras
 * tanto, o si fallan, se puede agregar a la general (SCRUM-160). Clic fuera y
 * Escape cierran (Modal compartido) y el hook no deja cerrar mientras agrega.
 * Solo presentación.
 */
export const AddWeekToListDialog = ({
  confirmMessage,
  dateListOptions,
  destination,
  errorMessage,
  hasOptionsError,
  isAdding,
  isLoadingOptions,
  isOpen,
  onClose,
  onConfirm,
  onDestinationChange,
  onOptionsRetry,
}: AddWeekToListDialogProps): React.JSX.Element => (
  <Modal isOpen={isOpen} onClose={onClose} title={WEEK_LIST_TEXT.DIALOG_TITLE}>
    <div className="flex flex-col gap-4">
      {confirmMessage ? <p className="font-body text-sm text-tacha-text">{confirmMessage}</p> : null}

      {isLoadingOptions ? (
        <p role="status" className="font-body text-sm text-tacha-textsec">
          {WEEK_LIST_TEXT.OPTIONS_LOADING}
        </p>
      ) : null}

      {hasOptionsError ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="font-body text-sm text-red-600">
            {WEEK_LIST_TEXT.OPTIONS_ERROR}
          </p>
          <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isAdding} onClick={onOptionsRetry}>
            {WEEK_LIST_TEXT.RETRY}
          </Button>
        </div>
      ) : null}

      <WeekListDestinationField
        dateListOptions={dateListOptions}
        destination={destination}
        isAdding={isAdding}
        onDestinationChange={onDestinationChange}
      />

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
