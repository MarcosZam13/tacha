import { Button, Modal } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { RECIPE_DELETE_TEXT } from "../constants/recipes.constants";
import type { RecipeDeleteDialogProps } from "./models/RecipeDeleteDialogProps.type";

/**
 * Confirmación antes de borrar una receta. Solo presentación: qué pasa al
 * confirmar o cancelar lo decide useRecipeDeletion. Clic fuera y Escape
 * llaman a onDeleteCancel (comportamiento del Modal), que no cierra mientras borra.
 *
 * El rojo (destructive) va solo acá, en el botón que de verdad borra.
 */
export const RecipeDeleteDialog = ({
  errorMessage,
  isDeleting,
  isDialogOpen,
  onDeleteCancel,
  onDeleteConfirm,
  recipeName,
}: RecipeDeleteDialogProps): React.JSX.Element => (
  <Modal isOpen={isDialogOpen} onClose={onDeleteCancel} title={RECIPE_DELETE_TEXT.DIALOG_TITLE}>
    <div className="flex flex-col gap-4">
      <p className="font-body text-base font-semibold text-tacha-text">{recipeName}</p>
      <p className="font-body text-sm text-tacha-textsec">{RECIPE_DELETE_TEXT.IRREVERSIBLE_NOTICE}</p>
      {errorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isDeleting} onClick={onDeleteCancel}>
          {RECIPE_DELETE_TEXT.CANCEL}
        </Button>
        <Button variant={BUTTON_VARIANT.DESTRUCTIVE} isDisabled={isDeleting} onClick={onDeleteConfirm}>
          {isDeleting ? RECIPE_DELETE_TEXT.DELETING : RECIPE_DELETE_TEXT.CONFIRM}
        </Button>
      </div>
    </div>
  </Modal>
);
