import { Button, Modal } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { UNDO_UNCHECK_TEXT } from "../constants/shortfall-resolution.constants";
import type { UndoResolutionDialogProps } from "./models/UndoResolutionDialogProps.interface";

/**
 * Confirmación antes de destachar una fila que "¿Qué hiciste?" cambió
 * (SCRUM-115, regla 45). Dice a qué vuelve la fila y que se pierden los
 * cambios hechos a mano después. Solo presentación: lo decide useUncheckWithUndo.
 */
export const UndoResolutionDialog = ({ dialog }: UndoResolutionDialogProps): React.JSX.Element => (
  <Modal isOpen={dialog.isOpen} onClose={dialog.onCancel} title={UNDO_UNCHECK_TEXT.TITLE}>
    <div className="flex flex-col gap-4">
      <p className="font-body text-sm text-tacha-text">{dialog.returnsToText}</p>
      <p className="font-body text-sm text-tacha-textsec">{UNDO_UNCHECK_TEXT.MANUAL_CHANGES_LOST}</p>
      {dialog.errorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {dialog.errorMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={dialog.isReverting} onClick={dialog.onCancel}>
          {UNDO_UNCHECK_TEXT.CANCEL}
        </Button>
        <Button isDisabled={dialog.isReverting} onClick={dialog.onConfirm}>
          {dialog.isReverting ? UNDO_UNCHECK_TEXT.REVERTING : UNDO_UNCHECK_TEXT.CONFIRM}
        </Button>
      </div>
    </div>
  </Modal>
);
