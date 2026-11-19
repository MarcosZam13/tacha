import { useEffect, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { PENDING_REMINDER_STATUS, SPENDING_STATUS } from "../constants/finance.constants";
import type { PendingReminderStatusType, SpendingStatusType } from "../constants/finance.constants";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import { getPurchasesWithoutTotal } from "../services/finance.service";
import { getOverduePurchases } from "../utils/getOverduePurchases";

/** La última respuesta, guardada con la carga que la pidió. */
interface PendingResponse {
  /** La hora de la carga: el corte de 24 horas se mide contra ella (SPEC regla 65). */
  loadedAt: Date;
  /** null si la carga falló. */
  purchases: NullableRef<PeriodPurchase[]>;
  reloadCount: number;
}

interface UsePendingPurchasesReturn {
  onRetry: () => void;
  /** Cuántas llevan 24 horas o más sin total (D23); 0 mientras carga o si falló. */
  overdueCount: number;
  /** Todas las compras sin total, de cualquier fecha (D25); null mientras carga o si falló. */
  purchases: NullableRef<PeriodPurchase[]>;
  /** El recordatorio, persistente y sin descartar (D24, D26). */
  reminderStatus: PendingReminderStatusType;
  /** Quita una compra que se acaba de completar, sin volver a leer (regla 69). */
  removePurchase: (purchaseId: string) => void;
  /** La sección "Compras sin total", con el patrón de SPENDING_STATUS. */
  status: SpendingStatusType;
}

/**
 * Las compras cerradas propias sin total (SCRUM-92). Pide los datos solo si
 * `isEnabled` (cuenta registrada, D6). Una sola lectura alimenta la sección y
 * el recordatorio, para que no se contradigan (regla 66), y no depende del
 * periodo elegido.
 *
 * Mismo patrón que usePeriodPurchases: solo se guarda la última respuesta, con
 * la clave de quien la pidió (los reintentos), y una que llegue tarde o después
 * de cerrar la pantalla se descarta. `onRetry` también sirve para volver a leer
 * cuando una compra ya no está disponible (P0002).
 */
export const usePendingPurchases = (isEnabled: boolean): UsePendingPurchasesReturn => {
  // Sube con "Reintentar": cambia la clave y vuelve a pedir.
  const [reloadCount, setReloadCount] = useState<number>(0);
  const [response, setResponse] = useState<NullableRef<PendingResponse>>(null);

  useEffect(() => {
    if (!isEnabled) return undefined;

    let isCancelled = false;
    const loadedAt = new Date();

    getPurchasesWithoutTotal()
      .then((purchases) => {
        if (!isCancelled) setResponse({ loadedAt, purchases, reloadCount });
      })
      .catch(() => {
        if (!isCancelled) setResponse({ loadedAt, purchases: null, reloadCount });
      });

    return () => {
      isCancelled = true;
    };
  }, [isEnabled, reloadCount]);

  const currentResponse = isEnabled && response?.reloadCount === reloadCount ? response : null;
  const purchases = currentResponse?.purchases ?? null;
  const overdueCount = currentResponse && purchases ? getOverduePurchases(purchases, currentResponse.loadedAt).length : 0;

  const getStatus = (): SpendingStatusType => {
    if (!currentResponse) return SPENDING_STATUS.LOADING;
    if (!purchases) return SPENDING_STATUS.FAILED;
    return purchases.length === 0 ? SPENDING_STATUS.EMPTY : SPENDING_STATUS.READY;
  };

  const getReminderStatus = (): PendingReminderStatusType => {
    if (!currentResponse) return PENDING_REMINDER_STATUS.LOADING;
    if (!purchases) return PENDING_REMINDER_STATUS.FAILED;
    return overdueCount > 0 ? PENDING_REMINDER_STATUS.PENDING : PENDING_REMINDER_STATUS.NONE;
  };

  const removePurchase = (purchaseId: string): void => {
    setResponse((previous) =>
      previous?.purchases
        ? { ...previous, purchases: previous.purchases.filter((purchase) => purchase.id !== purchaseId) }
        : previous,
    );
  };

  return {
    onRetry: () => setReloadCount((count) => count + 1),
    overdueCount,
    purchases,
    reminderStatus: getReminderStatus(),
    removePurchase,
    status: getStatus(),
  };
};
