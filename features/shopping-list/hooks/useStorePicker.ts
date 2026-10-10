import { useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { PURCHASE_SESSION_TEXT } from "../constants/purchase-session.constants";
import type { StoreOption } from "../models/StoreOption.interface";
import { getStores, startPurchaseSession } from "../services/purchase-session.service";

interface UseStorePickerParams {
  /** Recibe la compra iniciada o retomada (entra al modo compra). */
  onStarted: (sessionId: string) => void;
}

interface UseStorePickerReturn {
  close: () => void;
  errorMessage: NullableRef<string>;
  isLoadingStores: boolean;
  isOpen: boolean;
  isStarting: boolean;
  open: () => void;
  pickStore: (storeId: string) => Promise<void>;
  stores: StoreOption[];
}

/**
 * "Iniciar compra": abre el modal de supermercados (HU-36f CA-02) y, al elegir
 * uno, inicia la compra o retoma la de hoy en ese súper (CA-05). Los súper se
 * piden la primera vez que se abre, no al cargar la lista.
 */
export const useStorePicker = ({ onStarted }: UseStorePickerParams): UseStorePickerReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [stores, setStores] = useState<NullableRef<StoreOption[]>>(null);
  const [errorMessage, setErrorMessage] = useState<NullableRef<string>>(null);
  const [isStarting, setIsStarting] = useState(false);

  // En un handler, no en un efecto: se piden porque el usuario abrió el modal.
  const open = (): void => {
    setIsOpen(true);
    if (stores) return;
    setErrorMessage(null);
    getStores()
      .then(setStores)
      .catch(() => setErrorMessage(PURCHASE_SESSION_TEXT.STORES_ERROR));
  };

  const close = (): void => {
    setIsOpen(false);
  };

  const pickStore = async (storeId: string): Promise<void> => {
    setIsStarting(true);
    setErrorMessage(null);
    try {
      const sessionId = await startPurchaseSession(storeId);
      setIsOpen(false);
      onStarted(sessionId);
    } catch {
      setErrorMessage(PURCHASE_SESSION_TEXT.START_ERROR);
    } finally {
      setIsStarting(false);
    }
  };

  return {
    close,
    errorMessage,
    isLoadingStores: isOpen && stores === null && errorMessage === null,
    isOpen,
    isStarting,
    open,
    pickStore,
    stores: stores ?? [],
  };
};
