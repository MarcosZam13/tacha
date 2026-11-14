import { useEffect, useRef, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { SPENDING_STATUS } from "../constants/finance.constants";
import type { SpendingPeriodType, SpendingStatusType } from "../constants/finance.constants";
import type { PeriodAdjustment } from "../models/PeriodAdjustment.interface";
import type { PeriodBounds } from "../models/PeriodBounds.interface";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import type { PeriodSpending } from "../models/PeriodSpending.interface";
import type { SetPeriodTotalResponse, SetPurchaseTotalResponse } from "../models/TotalMutations.interface";
import { getPeriodFinance, getPeriodPurchases } from "../services/finance.service";
import { getPeriodBounds } from "../utils/getPeriodBounds";
import { summarizeSpending } from "../utils/summarizeSpending";

/** Lo que trae una carga que terminó bien. */
interface PurchasesRead {
  /** Vacío sin zona guardada: sin zona no hay ajustes (regla 59). */
  adjustments: PeriodAdjustment[];
  bounds: PeriodBounds;
  purchases: PeriodPurchase[];
  spending: PeriodSpending;
  /** La zona guardada; null sin zona, cuando los límites son los del navegador. */
  timeZone: NullableRef<string>;
}

/** La última respuesta, guardada con la clave de la carga que la pidió. */
interface PurchasesResponse {
  /** true con TZ002: no hay totales hasta confirmar otra zona (regla 60). */
  needsTimeZoneConfirmation: boolean;
  /** El periodo que se pidió: un total guardado solo se aplica a ese periodo. */
  period: SpendingPeriodType;
  /** null si la carga falló o con TZ002. */
  read: NullableRef<PurchasesRead>;
  requestKey: string;
}

interface UsePeriodPurchasesReturn {
  adjustments: NullableRef<PeriodAdjustment[]>;
  /** Aplica el total guardado de un periodo si sigue en pantalla (SCRUM-91, regla 55). */
  applySavedPeriodTotal: (period: SpendingPeriodType, saved: SetPeriodTotalResponse, total: number) => void;
  /** Aplica una compra guardada si su fila sigue en pantalla (SCRUM-91, regla 55). */
  applySavedPurchase: (saved: SetPurchaseTotalResponse) => void;
  /** Los límites con los que se pidieron las compras que se muestran; null mientras carga o si falló. */
  bounds: NullableRef<PeriodBounds>;
  /** La zona guardada ya no se reconoce (TZ002): el estado es `failed` y la pantalla pide confirmar. */
  needsTimeZoneConfirmation: boolean;
  onRetry: () => void;
  purchases: NullableRef<PeriodPurchase[]>;
  spending: NullableRef<PeriodSpending>;
  status: SpendingStatusType;
  /** La zona con la que se dan formato a las fechas; null = la del navegador. */
  timeZone: NullableRef<string>;
}

// Con zona guardada, todo sale de get_period_finance en una sola lectura (SPEC
// §12). Sin zona se lee como antes y la lista y el total salen de las mismas
// filas (regla 25). Con TZ002, null.
const readPeriodPurchases = async (period: SpendingPeriodType): Promise<NullableRef<PurchasesRead>> => {
  const periodFinance = await getPeriodFinance(period);
  if (periodFinance === null) return null;
  if (periodFinance.timeZone !== null) return periodFinance;

  const bounds = getPeriodBounds(period, new Date());
  const purchases = await getPeriodPurchases(bounds);
  return {
    adjustments: [],
    bounds,
    purchases,
    spending: summarizeSpending(purchases.map((purchase) => purchase.totalAmount)),
    timeZone: null,
  };
};

// La lista y el total vuelven a salir de las mismas filas (regla 25), con los
// ajustes (regla 49).
const withRows = (read: PurchasesRead, purchases: PeriodPurchase[], adjustments: PeriodAdjustment[]): PurchasesRead => ({
  ...read,
  adjustments,
  purchases,
  spending: summarizeSpending(
    purchases.map((purchase) => purchase.totalAmount),
    adjustments.map((adjustment) => adjustment.amount),
  ),
});

// El orden de get_period_finance: por fecha y, a igual fecha, por id.
const byEffectiveAt = (first: PeriodAdjustment, second: PeriodAdjustment): number =>
  new Date(first.effectiveAt).getTime() - new Date(second.effectiveAt).getTime() || first.id.localeCompare(second.id);

/**
 * Las compras y los ajustes del periodo en curso para el Historial (SCRUM-90 y
 * SCRUM-91). Pide los datos solo si `isEnabled` (cuenta registrada, D6).
 *
 * Mismo patrón que usePeriodSpending: solo se guarda la última respuesta, con la
 * clave de quien la pidió (periodo + reintentos), y una que llegue tarde se
 * descarta.
 *
 * Un total guardado se aplica sin pasar por `loading`. Se vuelve a leer, en
 * cambio, si la lectura era sin zona (guardar exige una, así que se acaba de
 * confirmar) o si el total no da lo escrito: otra pestaña cambió algo (D20).
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

    readPeriodPurchases(period)
      .then((read) => {
        if (!isCancelled) setResponse({ needsTimeZoneConfirmation: read === null, period, read, requestKey });
      })
      .catch(() => {
        if (!isCancelled) setResponse({ needsTimeZoneConfirmation: false, period, read: null, requestKey });
      });

    return () => {
      isCancelled = true;
    };
  }, [isEnabled, period, requestKey]);

  const currentResponse = isEnabled && response?.requestKey === requestKey ? response : null;
  const read = currentResponse?.read ?? null;

  // Lo guardado llega después de un await: se aplica sobre la respuesta más
  // reciente, no sobre la del render en que se empezó a guardar.
  const currentResponseRef = useRef<NullableRef<PurchasesResponse>>(currentResponse);
  useEffect(() => {
    currentResponseRef.current = currentResponse;
  });

  const reload = (): void => setReloadCount((count) => count + 1);

  // `update` da la lectura nueva, o null si hay que volver a leer.
  const applyToRead = (update: (currentRead: PurchasesRead) => NullableRef<PurchasesRead>): void => {
    const latestResponse = currentResponseRef.current;
    if (!latestResponse?.read) return;
    if (latestResponse.read.timeZone === null) {
      reload();
      return;
    }
    const nextRead = update(latestResponse.read);
    if (nextRead === null) {
      reload();
      return;
    }
    setResponse({ ...latestResponse, read: nextRead });
  };

  const applySavedPurchase = (saved: SetPurchaseTotalResponse): void => {
    applyToRead((currentRead) => {
      // Si la fila ya no está en pantalla, no hay nada que aplicar.
      if (!currentRead.purchases.some((purchase) => purchase.id === saved.id)) return currentRead;
      const purchases = currentRead.purchases.map((purchase) =>
        purchase.id === saved.id ? { ...purchase, totalAmount: saved.totalAmount } : purchase,
      );
      return withRows(currentRead, purchases, currentRead.adjustments);
    });
  };

  const applySavedPeriodTotal = (savedPeriod: SpendingPeriodType, saved: SetPeriodTotalResponse, total: number): void => {
    if (currentResponseRef.current?.period !== savedPeriod) return;
    applyToRead((currentRead) => {
      // El ajuste guardado reemplaza a los de su nivel en el periodo (regla 50).
      const otherAdjustments = currentRead.adjustments.filter((adjustment) => adjustment.scope !== savedPeriod);
      const adjustments = saved.adjustment ? [...otherAdjustments, saved.adjustment] : otherAdjustments;
      const nextRead = withRows(currentRead, currentRead.purchases, adjustments.sort(byEffectiveAt));
      return nextRead.spending.total === total ? nextRead : null;
    });
  };

  const getStatus = (): SpendingStatusType => {
    if (!currentResponse) return SPENDING_STATUS.LOADING;
    if (!read) return SPENDING_STATUS.FAILED;
    // Un periodo solo con un ajuste no está vacío (SPEC §6, D17).
    return read.purchases.length + read.adjustments.length === 0 ? SPENDING_STATUS.EMPTY : SPENDING_STATUS.READY;
  };

  return {
    adjustments: read?.adjustments ?? null,
    applySavedPeriodTotal,
    applySavedPurchase,
    bounds: read?.bounds ?? null,
    needsTimeZoneConfirmation: currentResponse?.needsTimeZoneConfirmation ?? false,
    onRetry: reload,
    purchases: read?.purchases ?? null,
    spending: read?.spending ?? null,
    status: getStatus(),
    timeZone: read?.timeZone ?? null,
  };
};
