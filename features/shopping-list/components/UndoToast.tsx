import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import type { UndoToastProps } from "./models/UndoToastProps.interface";

/**
 * Aviso de "Producto eliminado" con "Deshacer". Solo presentación: cuándo
 * aparece y cuánto dura lo decide useItemRemoval. role="status" hace que un
 * lector de pantalla lo anuncie sin quitarle el foco a lo que estaba usando.
 */
export const UndoToast = ({ onUndo }: UndoToastProps): React.JSX.Element => (
  <div
    role="status"
    className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-tacha-badge border border-tacha-border bg-tacha-surface px-4 py-3 shadow-lg"
  >
    <span className="font-body text-sm text-tacha-text">{SHOPPING_LIST_TEXT.REMOVED_TOAST}</span>
    <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onUndo}>
      {SHOPPING_LIST_TEXT.UNDO_REMOVE}
    </Button>
  </div>
);
