import type { NullableRef } from "@/types/nullable.types";
import { CENTS_PER_COLON } from "../constants/finance.constants";
import type { PeriodSpending } from "../models/PeriodSpending.interface";

/**
 * Los totales de las compras cerradas de un periodo y los montos de sus ajustes
 * → el gasto del periodo (SPEC D3 y regla 49). Un total nulo es una compra "sin
 * total": no suma ni cuenta como ₡0, se cuenta aparte. Los ajustes suman con su
 * signo y se cuentan aparte: no son compras. Sin zona guardada no hay ajustes.
 * Se suma en centavos enteros, así 0,10 + 0,20 da 0,30.
 */
export const summarizeSpending = (
  totals: readonly NullableRef<number>[],
  adjustmentAmounts: readonly number[] = [],
): PeriodSpending => {
  let totalCents = 0;
  let closedCount = 0;
  let withoutTotalCount = 0;

  for (const total of totals) {
    if (total === null) {
      withoutTotalCount += 1;
    } else {
      totalCents += Math.round(total * CENTS_PER_COLON);
      closedCount += 1;
    }
  }

  for (const amount of adjustmentAmounts) {
    totalCents += Math.round(amount * CENTS_PER_COLON);
  }

  return {
    adjustmentCount: adjustmentAmounts.length,
    closedCount,
    total: totalCents / CENTS_PER_COLON,
    withoutTotalCount,
  };
};
