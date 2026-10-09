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

/** El modo del panel junto con la compra a la que pertenece: otra compra arranca en AUTO. */
interface ClosePanelState {
  mode: ClosePanelModeType;
  sessionId: NullableRef<string>;
}

/**
 * Panel "Cerrar compra": se ve solo cuando no queda nada pendiente o cuando
 * tocan "Terminar compra"; "Seguir comprando" lo esconde para esa compra.
 * Cerrar valida el total (opcional) y lo guarda con la compra.
 */
export const useClosePurchase = ({ isAllChecked, onClosed, sessionId }: UseClosePurchaseParams): UseClosePurchaseReturn => {
  const [panel, setPanel] = useState<ClosePanelState>({ mode: CLOSE_PANEL_MODE.AUTO, sessionId: null });
  const [totalText, setTotalText] = useState("");
  const [totalErrorMessage, setTotalErrorMessage] = useState<NullableRef<string>>(null);
  const [closeErrorMessage, setCloseErrorMessage] = useState<NullableRef<string>>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Derivado: si destachan algo con el panel automático abierto, se va solo.
  const mode = panel.sessionId === sessionId ? panel.mode : CLOSE_PANEL_MODE.AUTO;
  const isVisible =
    sessionId !== null &&
    (mode === CLOSE_PANEL_MODE.REQUESTED || (mode === CLOSE_PANEL_MODE.AUTO && isAllChecked));

  const request = (): void => {
    setPanel({ mode: CLOSE_PANEL_MODE.REQUESTED, sessionId });
  };

  const dismiss = (): void => {
    setPanel({ mode: CLOSE_PANEL_MODE.DISMISSED, sessionId });
  };

  const onTotalChange = (text: string): void => {
    setTotalText(text);
    setTotalErrorMessage(null);
  };

  const submit = async (): Promise<void> => {
    if (!sessionId) return;
    const parsed = parseSpentTotal(totalText);
    if (!parsed.isValid) {
      setTotalErrorMessage(PURCHASE_SESSION_TEXT.TOTAL_ERROR);
      return;
    }
    setIsClosing(true);
    setCloseErrorMessage(null);
    try {
      await closePurchaseSession(sessionId, parsed.total);
      setTotalText("");
      onClosed();
    } catch {
      setCloseErrorMessage(PURCHASE_SESSION_TEXT.CLOSE_ERROR);
    } finally {
      setIsClosing(false);
    }
  };

  return {
    closeErrorMessage,
    dismiss,
    isClosing,
    isVisible,
    onTotalChange,
    request,
    submit,
    totalErrorMessage,
    totalText,
  };
};
