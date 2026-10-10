import { useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { CLOSE_PANEL_MODE, PURCHASE_SESSION_TEXT } from "../constants/purchase-session.constants";
import type { ClosePanelModeType } from "../constants/purchase-session.constants";
import { closePurchaseSession } from "../services/purchase-session.service";
import { parseSpentTotal } from "../utils/parseSpentTotal";

interface UseClosePurchaseParams {
  /** No queda nada pendiente: se sugiere cerrar (HU-36f CA-07). */
  isAllChecked: boolean;
  /** Se llama con la compra ya cerrada (vuelve a la lista normal). */
  onClosed: () => void;
  /** La compra activa; null fuera de modo compra. */
  sessionId: NullableRef<string>;
}

interface UseClosePurchaseReturn {
  closeErrorMessage: NullableRef<string>;
  dismiss: () => void;
  isClosing: boolean;
  isVisible: boolean;
  onTotalChange: (text: string) => void;
  request: () => void;
  submit: () => Promise<void>;
  totalErrorMessage: NullableRef<string>;
  totalText: string;
}

/**
 * El panel y su formulario, junto con la compra a la que pertenecen. Al
 * cambiar de compra todo vuelve al inicio (AUTO, sin texto ni errores): un
 * error o un total de otra compra nunca aparece en esta.
 */
interface ClosePanelState {
  closeErrorMessage: NullableRef<string>;
  mode: ClosePanelModeType;
  sessionId: NullableRef<string>;
  totalErrorMessage: NullableRef<string>;
  totalText: string;
}

const createInitialPanel = (sessionId: NullableRef<string>): ClosePanelState => ({
  closeErrorMessage: null,
  mode: CLOSE_PANEL_MODE.AUTO,
  sessionId,
  totalErrorMessage: null,
  totalText: "",
});

/**
 * Panel "Cerrar compra": se ve solo cuando no queda nada pendiente o cuando
 * tocan "Terminar compra"; "Seguir comprando" lo esconde para esa compra.
 * Cerrar valida el total (opcional) y lo guarda con la compra.
 */
export const useClosePurchase = ({ isAllChecked, onClosed, sessionId }: UseClosePurchaseParams): UseClosePurchaseReturn => {
  const [storedPanel, setStoredPanel] = useState<ClosePanelState>(() => createInitialPanel(null));
  const [isClosing, setIsClosing] = useState(false);

  // Derivado: lo guardado solo vale para su compra; otra compra arranca de cero.
  const panel = storedPanel.sessionId === sessionId ? storedPanel : createInitialPanel(sessionId);
  // Si destachan algo con el panel automático abierto, se va solo.
  const isVisible =
    sessionId !== null &&
    (panel.mode === CLOSE_PANEL_MODE.REQUESTED || (panel.mode === CLOSE_PANEL_MODE.AUTO && isAllChecked));

  const request = (): void => {
    setStoredPanel({ ...panel, mode: CLOSE_PANEL_MODE.REQUESTED });
  };

  const dismiss = (): void => {
    setStoredPanel({ ...panel, mode: CLOSE_PANEL_MODE.DISMISSED });
  };

  const onTotalChange = (text: string): void => {
    setStoredPanel({ ...panel, totalErrorMessage: null, totalText: text });
  };

  const submit = async (): Promise<void> => {
    if (!sessionId) return;
    const parsed = parseSpentTotal(panel.totalText);
    if (!parsed.isValid) {
      setStoredPanel({ ...panel, totalErrorMessage: PURCHASE_SESSION_TEXT.TOTAL_ERROR });
      return;
    }
    setIsClosing(true);
    setStoredPanel({ ...panel, closeErrorMessage: null });
    try {
      await closePurchaseSession(sessionId, parsed.total);
      setStoredPanel(createInitialPanel(null));
      onClosed();
    } catch {
      setStoredPanel({ ...panel, closeErrorMessage: PURCHASE_SESSION_TEXT.CLOSE_ERROR });
    } finally {
      setIsClosing(false);
    }
  };

  return {
    closeErrorMessage: panel.closeErrorMessage,
    dismiss,
    isClosing,
    isVisible,
    onTotalChange,
    request,
    submit,
    totalErrorMessage: panel.totalErrorMessage,
    totalText: panel.totalText,
  };
};
