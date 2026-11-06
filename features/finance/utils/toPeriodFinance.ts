import { FINANCE_DB } from "../constants/finance.constants";
import type { PeriodAdjustment } from "../models/PeriodAdjustment.interface";
import type { PeriodFinance, PeriodFinanceResponse } from "../models/PeriodFinance.type";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import { isSpendingPeriod } from "./isSpendingPeriod";
import { summarizeSpending } from "./summarizeSpending";

const contractError = (reason: string): Error => new Error(`${FINANCE_DB.RPC.GET_PERIOD_FINANCE} devolvió ${reason}`);

const toInstant = (isoText: string): Date => {
  const instant = new Date(isoText);
  if (Number.isNaN(instant.getTime())) throw contractError("una fecha inválida");
  return instant;
};

/**
 * Adapter: convierte lo que devuelve get_period_finance (SPEC §12) en lo que
 * usan el Dashboard y el Historial. Función pura: la forma de la base no sale
 * de acá. Respeta el orden de la base.
 *
 * Un resultado fuera del contrato es un error, no un total falso (como la regla
 * 30): un nivel desconocido, fechas inválidas, datos sin zona, o un total y unos
 * contadores que no cuadran con las compras y los ajustes que llegaron. Se
 * recalculan con summarizeSpending, la misma suma que usa la pantalla (D19).
 */
export const toPeriodFinance = (response: PeriodFinanceResponse): PeriodFinance => {
  if (response.time_zone === null) {
    // Sin zona no hay periodo (regla 59): cualquier dato es un contrato roto.
    if (
      response.period_start !== null ||
      response.period_end !== null ||
      response.total !== null ||
      response.purchases.length > 0 ||
      response.adjustments.length > 0
    ) {
      throw contractError("datos de un periodo sin zona");
    }
    return { timeZone: null };
  }

  if (response.period_start === null || response.period_end === null || response.total === null) {
    throw contractError("un periodo sin límites o sin total");
  }
  const bounds = { end: toInstant(response.period_end), start: toInstant(response.period_start) };
  if (!(bounds.start.getTime() < bounds.end.getTime())) throw contractError("un periodo que no avanza");

  const purchases: PeriodPurchase[] = response.purchases.map((purchaseRow) => ({
    closedAt: purchaseRow.closed_at,
    id: purchaseRow.id,
    storeName: purchaseRow.store_name,
    totalAmount: purchaseRow.total_amount,
  }));

  const adjustments: PeriodAdjustment[] = response.adjustments.map((adjustmentRow) => {
    if (!isSpendingPeriod(adjustmentRow.scope)) throw contractError("un nivel de ajuste desconocido");
    return {
      amount: adjustmentRow.amount,
      effectiveAt: adjustmentRow.effective_at,
      id: adjustmentRow.id,
      scope: adjustmentRow.scope,
    };
  });

  const spending = summarizeSpending(
    purchases.map((purchase) => purchase.totalAmount),
    adjustments.map((adjustment) => adjustment.amount),
  );
  if (
    spending.total !== response.total ||
    spending.closedCount !== response.closed_count ||
    spending.withoutTotalCount !== response.without_total_count ||
    spending.adjustmentCount !== response.adjustment_count
  ) {
    throw contractError("un total que no cuadra con sus compras y ajustes");
  }

  return { adjustments, bounds, purchases, spending, timeZone: response.time_zone };
};
