import type { NullableRef } from "@/types/nullable.types";
import { CENTS_PER_COLON, PERIOD_RANGE_FORMAT } from "../constants/finance.constants";
import type { PeriodAdjustment } from "../models/PeriodAdjustment.interface";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import type { SpendingByStoreBreakdown, StoreSpending } from "../models/StoreSpending.interface";

interface StoreTally {
  amountCents: number;
  closedCount: number;
  withoutTotalCount: number;
}

// Se crea una vez, como `colonesFormatter`: armar un Intl.Collator en cada comparación es lo caro.
const storeNameCollator = new Intl.Collator(PERIOD_RANGE_FORMAT.LOCALE);

const toCents = (amount: number): number => Math.round(amount * CENTS_PER_COLON);

// Por nombre en español; "Supermercado no disponible" (null) después de los que tienen nombre.
const compareStoreNames = (first: NullableRef<string>, second: NullableRef<string>): number => {
  if (first === second) return 0;
  if (first === null) return 1;
  if (second === null) return -1;
  return storeNameCollator.compare(first, second);
};

// Regla 113 (D49): primero los que tienen algún total, de mayor a menor monto; en un
// empate, por nombre. Al final, los que solo tienen compras sin total (D46), por nombre.
const compareStores = (
  [firstName, first]: [NullableRef<string>, StoreTally],
  [secondName, second]: [NullableRef<string>, StoreTally],
): number => {
  const firstHasTotal = first.closedCount > 0;
  const secondHasTotal = second.closedCount > 0;
  if (firstHasTotal !== secondHasTotal) return firstHasTotal ? -1 : 1;
  if (firstHasTotal && first.amountCents !== second.amountCents) return second.amountCents - first.amountCents;
  return compareStoreNames(firstName, secondName);
};

/**
 * Las compras cerradas y los ajustes de un periodo → lo que se gastó en cada
 * supermercado (SCRUM-72, CA-01 y CA-02). Recibe las mismas filas de las que
 * sale el total (regla 107) y no las modifica.
 * - Agrupa por nombre; el nombre nulo va en su propio grupo (reglas 108 y 109).
 * - Suma en centavos enteros, como `summarizeSpending` (regla 110). Una compra sin
 *   total no suma: se cuenta aparte en su supermercado (regla 111).
 * - Los ajustes no tienen supermercado: se suman aparte, fuera del orden (D45 y regla 112).
 */
export const groupSpendingByStore = (
  purchases: readonly PeriodPurchase[],
  adjustments: readonly PeriodAdjustment[],
): SpendingByStoreBreakdown => {
  const tallies = new Map<NullableRef<string>, StoreTally>();

  for (const { storeName, totalAmount } of purchases) {
    const tally = tallies.get(storeName) ?? { amountCents: 0, closedCount: 0, withoutTotalCount: 0 };
    if (totalAmount === null) {
      tally.withoutTotalCount += 1;
    } else {
      tally.amountCents += toCents(totalAmount);
      tally.closedCount += 1;
    }
    tallies.set(storeName, tally);
  }

  const stores: StoreSpending[] = [...tallies]
    .sort(compareStores)
    .map(([storeName, { amountCents, closedCount, withoutTotalCount }]) => ({
      amount: amountCents / CENTS_PER_COLON,
      closedCount,
      storeName,
      withoutTotalCount,
    }));

  const adjustmentCents = adjustments.reduce((totalCents, { amount }) => totalCents + toCents(amount), 0);

  return {
    adjustmentCount: adjustments.length,
    adjustmentTotal: adjustments.length === 0 ? null : adjustmentCents / CENTS_PER_COLON,
    stores,
  };
};
