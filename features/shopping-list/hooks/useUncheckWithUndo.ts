import { useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { UNDO_UNCHECK_STATUS, UNDO_UNCHECK_TEXT } from "../constants/shortfall-resolution.constants";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import type { UndoUncheckState } from "../models/shortfall-resolution.types";
import { undoShortfallResolutionAndUncheck } from "../services/shortfall-resolution.service";

interface UseUncheckWithUndoParams {
  reload: () => Promise<NullableRef<ShoppingListItem[]>>;
}

interface UseUncheckWithUndoReturn {
  cancel: () => void;
  confirm: () => Promise<void>;
  request: (itemId: string) => void;
  state: UndoUncheckState;
}

const CLOSED_STATE: UndoUncheckState = { status: UNDO_UNCHECK_STATUS.CLOSED };

/**
 * Destachar una fila que "¿Qué hiciste?" cambió (SCRUM-115, regla 45): primero
 * se pregunta; al confirmar, la base deshace y destacha en una sola operación
 * y la lista se recarga (si se juntó con una pendiente, la fila ya no existe).
 */
export const useUncheckWithUndo = ({ reload }: UseUncheckWithUndoParams): UseUncheckWithUndoReturn => {
  const [state, setState] = useState<UndoUncheckState>(CLOSED_STATE);

  const request = (itemId: string): void => {
    setState({ itemId, status: UNDO_UNCHECK_STATUS.CONFIRMING });
  };

  const cancel = (): void => {
    // Mientras deshace no se cierra: el resultado tiene que llegar.
    if (state.status === UNDO_UNCHECK_STATUS.REVERTING) return;
    setState(CLOSED_STATE);
  };

  const confirm = async (): Promise<void> => {
    // Doble clic o diálogo cerrado: no sale una segunda petición.
    if (state.status !== UNDO_UNCHECK_STATUS.CONFIRMING && state.status !== UNDO_UNCHECK_STATUS.FAILED) return;
    const { itemId } = state;
    setState({ itemId, status: UNDO_UNCHECK_STATUS.REVERTING });
    try {
      // Si otro miembro ya la destachó (no se aplicó), recargar igual muestra cómo quedó.
      await undoShortfallResolutionAndUncheck(itemId);
      await reload();
      setState(CLOSED_STATE);
    } catch {
      setState({ errorMessage: UNDO_UNCHECK_TEXT.ERROR, itemId, status: UNDO_UNCHECK_STATUS.FAILED });
    }
  };

  return { cancel, confirm, request, state };
};
