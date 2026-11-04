import { useEffect, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { SPENDING_STATUS } from "../constants/finance.constants";
import type { SpendingPeriodType, SpendingStatusType } from "../constants/finance.constants";
import type { PeriodBounds } from "../models/PeriodBounds.interface";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import type { PeriodSpending } from "../models/PeriodSpending.interface";
import { getPeriodPurchases } from "../services/finance.service";
import { getPeriodBounds } from "../utils/getPeriodBounds";
import { summarizeSpending } from "../utils/summarizeSpending";

/** La última respuesta, guardada con la clave de la carga que la pidió. */
interface PurchasesResponse {
  bounds: PeriodBounds;
  /** null si la carga falló. */
  purchases: NullableRef<PeriodPurchase[]>;
  requestKey: string;
}

interface UsePeriodPurchasesReturn {
  /** Los límites con los que se pidieron las compras que se muestran; null mientras carga. */
  bounds: NullableRef<PeriodBounds>;
  onRetry: () => void;
  purchases: NullableRef<PeriodPurchase[]>;
  spending: NullableRef<PeriodSpending>;
  status: SpendingStatusType;
}

/**
 * Las compras del periodo en curso para el Historial (SCRUM-90). Pide los datos
 * solo si `isEnabled` (cuenta registrada, D6).
 *
 * Mismo patrón que usePeriodSpending: solo se guarda la última respuesta, con la
 * clave de quien la pidió (periodo + reintentos), y una que llegue tarde se
 * descarta. La lista y el total salen de las mismas filas (SPEC regla 25).
 */
export const usePeriodPurchases = (period: SpendingPeriodType, isEnabled: boolean): UsePeriodPurchasesReturn => {
  // Sube con "Reintentar": cambia la clave y vuelve a pedir el mismo periodo.
  const [reloadCount, setReloadCount] = useState<number>(0);
  const [response, setResponse] = useState<NullableRef<PurchasesResponse>>(null);
  const requestKey = `${period}:${reloadCount}`;

  useEffect(() => {
    if (!isEnabled) return undefined;

    // Si cambia el periodo o la pantalla se cierra antes de que responda la
    // base, la respuesta se ignora.
    let isCancelled = false;
    const bounds = getPeriodBounds(period, new Date());

    getPeriodPurchases(bounds)
      .then((purchases) => {
        if (!isCancelled) setResponse({ bounds, purchases, requestKey });
      })
      .catch(() => {
        if (!isCancelled) setResponse({ bounds, purchases: null, requestKey });
      });

    return () => {
      isCancelled = true;
    };
  }, [isEnabled, period, requestKey]);

  const currentResponse = isEnabled && response?.requestKey === requestKey ? response : null;
  const purchases = currentResponse?.purchases ?? null;

  const getStatus = (): SpendingStatusType => {
    if (!currentResponse) return SPENDING_STATUS.LOADING;
    if (!purchases) return SPENDING_STATUS.FAILED;
    return purchases.length === 0 ? SPENDING_STATUS.EMPTY : SPENDING_STATUS.READY;
  };

  return {
    bounds: currentResponse?.bounds ?? null,
    onRetry: () => setReloadCount((count) => count + 1),
    purchases,
    spending: purchases ? summarizeSpending(purchases.map((purchase) => purchase.totalAmount)) : null,
    status: getStatus(),
  };
};
