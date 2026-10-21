import { useEffect, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { SPENDING_STATUS } from "../constants/finance.constants";
import type { SpendingPeriodType, SpendingStatusType } from "../constants/finance.constants";
import type { PeriodBounds } from "../models/PeriodBounds.interface";
import type { PeriodSpending } from "../models/PeriodSpending.interface";
import { getPeriodSpending } from "../services/finance.service";
import { getPeriodBounds } from "../utils/getPeriodBounds";

/** La última respuesta, guardada con la clave de la carga que la pidió. */
interface SpendingResponse {
  bounds: PeriodBounds;
  requestKey: string;
  /** null si la carga falló. */
  spending: NullableRef<PeriodSpending>;
}

interface UsePeriodSpendingReturn {
  /** Los límites con los que se calculó el gasto que se muestra; null mientras carga. */
  bounds: NullableRef<PeriodBounds>;
  onRetry: () => void;
  spending: NullableRef<PeriodSpending>;
  status: SpendingStatusType;
}

/**
 * El gasto del periodo en curso (SPEC regla 8 y D3). Pide los datos solo si
 * `isEnabled` (cuenta registrada, D6); si no, no llama a nada.
 *
 * Como useHouseholdMembers, solo se guarda lo que no se puede calcular: la
 * última respuesta, con la clave de quien la pidió (periodo + reintentos). Al
 * cambiar de periodo la clave cambia, así que la respuesta anterior deja de
 * mostrarse (vuelve a `loading`) y una que llegue tarde se descarta (regla 13).
 * Los límites se calculan con la hora de cada carga.
 */
export const usePeriodSpending = (period: SpendingPeriodType, isEnabled: boolean): UsePeriodSpendingReturn => {
  // Sube con "Reintentar": cambia la clave y vuelve a pedir el mismo periodo.
  const [reloadCount, setReloadCount] = useState<number>(0);
  const [response, setResponse] = useState<NullableRef<SpendingResponse>>(null);
  const requestKey = `${period}:${reloadCount}`;

  useEffect(() => {
    if (!isEnabled) return undefined;

    // Si cambia el periodo o la pantalla se cierra antes de que responda la
    // base, la respuesta se ignora.
    let isCancelled = false;
    const bounds = getPeriodBounds(period, new Date());

    getPeriodSpending(bounds)
      .then((spending) => {
        if (!isCancelled) setResponse({ bounds, requestKey, spending });
      })
      .catch(() => {
        if (!isCancelled) setResponse({ bounds, requestKey, spending: null });
      });

    return () => {
      isCancelled = true;
    };
  }, [isEnabled, period, requestKey]);

  const currentResponse = isEnabled && response?.requestKey === requestKey ? response : null;
  const spending = currentResponse?.spending ?? null;

  const getStatus = (): SpendingStatusType => {
    if (!currentResponse) return SPENDING_STATUS.LOADING;
    if (!spending) return SPENDING_STATUS.FAILED;
    return spending.closedCount + spending.withoutTotalCount === 0 ? SPENDING_STATUS.EMPTY : SPENDING_STATUS.READY;
  };

  return {
    bounds: currentResponse?.bounds ?? null,
    onRetry: () => setReloadCount((count) => count + 1),
    spending,
    status: getStatus(),
  };
};
