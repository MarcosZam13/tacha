import { Button, Modal } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { RECIPE_ADD_TO_LIST_TEXT } from "../constants/recipes.constants";
import type { RecipeRepeatAddDialogProps } from "./models/RecipeRepeatAddDialogProps.type";

/**
 * Confirmación antes de agregar otra vez una receta que ya se agregó desde
 * este navegador (regla 27). Solo presentación: qué pasa al confirmar o
 * cancelar lo decide useRecipeListAddition. Clic fuera y Escape cancelan.
 */
export const RecipeRepeatAddDialog = ({
  isRepeatDialogOpen,
  onRepeatCancel,
  onRepeatConfirm,
  repeatRecipeName,
}: RecipeRepeatAddDialogProps): React.JSX.Element => (
  <Modal isOpen={isRepeatDialogOpen} onClose={onRepeatCancel} title={RECIPE_ADD_TO_LIST_TEXT.REPEAT_DIALOG_TITLE}>
    <div className="flex flex-col gap-4">
      <p className="font-body text-base font-semibold text-tacha-text">{repeatRecipeName}</p>
      <p className="font-body text-sm text-tacha-textsec">{RECIPE_ADD_TO_LIST_TEXT.REPEAT_NOTICE}</p>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onRepeatCancel}>
          {RECIPE_ADD_TO_LIST_TEXT.CANCEL}
        </Button>
        <Button onClick={onRepeatConfirm}>{RECIPE_ADD_TO_LIST_TEXT.REPEAT_CONFIRM}</Button>
      </div>
    </div>
  </Modal>
);
