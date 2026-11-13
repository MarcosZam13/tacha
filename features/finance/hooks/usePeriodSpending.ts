import { useEffect, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { SPENDING_STATUS } from "../constants/finance.constants";
import type { SpendingPeriodType, SpendingStatusType } from "../constants/finance.constants";
import type { PeriodBounds } from "../models/PeriodBounds.interface";
import type { PeriodSpending } from "../models/PeriodSpending.interface";
import { getPeriodFinance, getPeriodSpending } from "../services/finance.service";
import { getPeriodBounds } from "../utils/getPeriodBounds";

/** Lo que trae una carga que terminó bien. */
interface SpendingRead {
  bounds: PeriodBounds;
  spending: PeriodSpending;
  /** La zona guardada; null sin zona, cuando los límites son los del navegador. */
  timeZone: NullableRef<string>;
}

/** La última respuesta, guardada con la clave de la carga que la pidió. */
interface SpendingResponse {
  /** true con TZ002: no hay totales hasta confirmar otra zona (regla 60). */
  needsTimeZoneConfirmation: boolean;
  /** null si la carga falló o con TZ002. */
  read: NullableRef<SpendingRead>;
  requestKey: string;
}

interface UsePeriodSpendingReturn {
  /** Los límites con los que se calculó el gasto que se muestra; null mientras carga o si falló. */
  bounds: NullableRef<PeriodBounds>;
  /** La zona guardada ya no se reconoce (TZ002): el estado es `failed` y la pantalla pide confirmar. */
  needsTimeZoneConfirmation: boolean;
  onRetry: () => void;
  spending: NullableRef<PeriodSpending>;
  status: SpendingStatusType;
  /** La zona con la que se dan formato a las fechas; null = la del navegador. */
  timeZone: NullableRef<string>;
}

// Con zona guardada, todo sale de get_period_finance, con sus ajustes (SPEC
// §12). Sin zona no hay ajustes y se lee como antes, con los límites del
// navegador (regla 59). Con TZ002, null.
const readPeriodSpending = async (period: SpendingPeriodType): Promise<NullableRef<SpendingRead>> => {
  const periodFinance = await getPeriodFinance(period);
  if (periodFinance === null) return null;
  if (periodFinance.timeZone !== null) {
    return { bounds: periodFinance.bounds, spending: periodFinance.spending, timeZone: periodFinance.timeZone };
  }

  const bounds = getPeriodBounds(period, new Date());
  return { bounds, spending: await getPeriodSpending(bounds), timeZone: null };
};

/**
 * El gasto del periodo en curso (SPEC regla 8, D3 y D19). Pide los datos solo
 * si `isEnabled` (cuenta registrada, D6); si no, no llama a nada.
 *
 * Como useHouseholdMembers, solo se guarda lo que no se puede calcular: la
 * última respuesta, con la clave de quien la pidió (periodo + reintentos). Al
 * cambiar de periodo la clave cambia, así que la respuesta anterior deja de
 * mostrarse (vuelve a `loading`) y una que llegue tarde se descarta (regla 13).
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

    readPeriodSpending(period)
      .then((read) => {
        if (!isCancelled) setResponse({ needsTimeZoneConfirmation: read === null, read, requestKey });
      })
      .catch(() => {
        if (!isCancelled) setResponse({ needsTimeZoneConfirmation: false, read: null, requestKey });
      });

    return () => {
      isCancelled = true;
    };
  }, [isEnabled, period, requestKey]);

  const currentResponse = isEnabled && response?.requestKey === requestKey ? response : null;
  const read = currentResponse?.read ?? null;
  const spending = read?.spending ?? null;

  const getStatus = (): SpendingStatusType => {
    if (!currentResponse) return SPENDING_STATUS.LOADING;
    if (!spending) return SPENDING_STATUS.FAILED;
    // Un periodo solo con un ajuste no está vacío (SPEC §6).
    return spending.closedCount + spending.withoutTotalCount + spending.adjustmentCount === 0
      ? SPENDING_STATUS.EMPTY
      : SPENDING_STATUS.READY;
  };

  return {
    bounds: read?.bounds ?? null,
    needsTimeZoneConfirmation: currentResponse?.needsTimeZoneConfirmation ?? false,
    onRetry: () => setReloadCount((count) => count + 1),
    spending,
    status: getStatus(),
    timeZone: read?.timeZone ?? null,
  };
};
