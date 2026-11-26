import { describe, expect, it } from "vitest";
import type { NullableRef } from "@/types/nullable.types";
import { CENTS_PER_COLON, SPENDING_PERIOD } from "../constants/finance.constants";
import type { PeriodAdjustment } from "../models/PeriodAdjustment.interface";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import { groupSpendingByStore } from "../utils/groupSpendingByStore";
import { summarizeSpending } from "../utils/summarizeSpending";

let purchaseCount = 0;

const purchase = (storeName: NullableRef<string>, totalAmount: NullableRef<number>): PeriodPurchase => {
  purchaseCount += 1;
  return { closedAt: "2026-10-14T15:00:00.000Z", id: `purchase-${purchaseCount}`, storeName, totalAmount };
};

const adjustment = (amount: number, scope: PeriodAdjustment["scope"] = SPENDING_PERIOD.WEEK): PeriodAdjustment => ({
  amount,
  effectiveAt: "2026-10-15T18:00:00.000Z",
  id: `adjustment-${amount}`,
  scope,
});

const storeNames = (purchases: PeriodPurchase[]): NullableRef<string>[] =>
  groupSpendingByStore(purchases, []).stores.map(({ storeName }) => storeName);

describe("groupSpendingByStore", () => {
  it("returns no stores and no adjustment line for an empty period", () => {
    expect(groupSpendingByStore([], [])).toEqual({ adjustmentCount: 0, adjustmentTotal: null, stores: [] });
  });

  describe("grouping (CA-01, rules 108 to 111)", () => {
    it("adds the purchases of one store into a single row", () => {
      expect(groupSpendingByStore([purchase("MaxiPali", 10000), purchase("MaxiPali", 20000)], []).stores).toEqual([
        { amount: 30000, closedCount: 2, storeName: "MaxiPali", withoutTotalCount: 0 },
      ]);
    });

    it("gives one row per store name", () => {
      const { stores } = groupSpendingByStore(
        [purchase("MaxiPali", 10000), purchase("MasXMenos", 5000), purchase("MaxiPali", 2000)],
        [],
      );

      expect(stores).toEqual([
        { amount: 12000, closedCount: 2, storeName: "MaxiPali", withoutTotalCount: 0 },
        { amount: 5000, closedCount: 1, storeName: "MasXMenos", withoutTotalCount: 0 },
      ]);
    });

    it("adds cents without floating point drift (rule 110)", () => {
      // 0.1 + 0.2 en punto flotante da 0.30000000000000004.
      const { stores } = groupSpendingByStore([purchase("Walmart", 0.1), purchase("Walmart", 0.2)], []);

      expect(stores[0].amount).toBe(0.3);
    });

    it("keeps a real ₡0 total as an amount, not as without a total (D8)", () => {
      expect(groupSpendingByStore([purchase("Walmart", 0)], []).stores).toEqual([
        { amount: 0, closedCount: 1, storeName: "Walmart", withoutTotalCount: 0 },
      ]);
    });

    it("counts purchases without a total apart, without adding them (rule 111, D47)", () => {
      const { stores } = groupSpendingByStore(
        [purchase("MaxiPali", 8000), purchase("MaxiPali", null), purchase("MaxiPali", null)],
        [],
      );

      expect(stores).toEqual([{ amount: 8000, closedCount: 1, storeName: "MaxiPali", withoutTotalCount: 2 }]);
    });

    it("keeps a store with only purchases without a total apart from a ₡0 store (D46)", () => {
      const { stores } = groupSpendingByStore([purchase("Walmart", null)], []);

      expect(stores).toEqual([{ amount: 0, closedCount: 0, storeName: "Walmart", withoutTotalCount: 1 }]);
    });

    it("puts purchases without a store name in their own group, never in another store (rule 109)", () => {
      const { stores } = groupSpendingByStore([purchase("MaxiPali", 8000), purchase(null, 3000), purchase(null, null)], []);

      expect(stores).toEqual([
        { amount: 8000, closedCount: 1, storeName: "MaxiPali", withoutTotalCount: 0 },
        { amount: 3000, closedCount: 1, storeName: null, withoutTotalCount: 1 },
      ]);
    });

    it("joins two stores with the same name, the accepted limit of rule 108", () => {
      expect(groupSpendingByStore([purchase("Walmart", 1000), purchase("Walmart", 2000)], []).stores).toHaveLength(1);
    });

    it("does not change the purchases or adjustments it receives", () => {
      const purchases = Object.freeze([purchase("MasXMenos", 1000), purchase("MaxiPali", 5000)]);
      const adjustments = Object.freeze([adjustment(500)]);
      const before = JSON.stringify([purchases, adjustments]);

      groupSpendingByStore(purchases, adjustments);

      expect(JSON.stringify([purchases, adjustments])).toBe(before);
    });
  });

  describe("order (CA-02, rule 113)", () => {
    it("orders the stores from the highest to the lowest amount", () => {
      expect(storeNames([purchase("MasXMenos", 3000), purchase("Walmart", 12000), purchase("MaxiPali", 8000)])).toEqual([
        "Walmart",
        "MaxiPali",
        "MasXMenos",
      ]);
    });

    it("compares amounts in cents, so ₡0.01 more comes first", () => {
      expect(storeNames([purchase("MasXMenos", 1000), purchase("MaxiPali", 1000.01)])).toEqual(["MaxiPali", "MasXMenos"]);
    });

    it("ties amounts that only differ by floating point drift, and orders them by name (rule 110)", () => {
      // En punto flotante 0.1 + 0.2 = 0.30000000000000004 y Walmart quedaría arriba;
      // en centavos los dos suman 30 y el empate va por nombre.
      expect(storeNames([purchase("Walmart", 0.1), purchase("Walmart", 0.2), purchase("MaxiPali", 0.3)])).toEqual([
        "MaxiPali",
        "Walmart",
      ]);
    });

    it("orders amount ties by name in Spanish", () => {
      expect(storeNames([purchase("Walmart", 5000), purchase("Ávila", 5000), purchase("MaxiPali", 5000)])).toEqual([
        "Ávila",
        "MaxiPali",
        "Walmart",
      ]);
    });

    it("orders the store without a name by its amount, like any store (D49)", () => {
      expect(storeNames([purchase("MasXMenos", 3000), purchase(null, 8000), purchase("Walmart", 12000)])).toEqual([
        "Walmart",
        null,
        "MasXMenos",
      ]);
    });

    it("puts the store without a name after the named ones in an amount tie (D49)", () => {
      expect(storeNames([purchase(null, 8000), purchase("MaxiPali", 8000)])).toEqual(["MaxiPali", null]);
    });

    it("puts a real ₡0 store after the others with a total, but before the ones without a total", () => {
      expect(storeNames([purchase("Walmart", null), purchase("MasXMenos", 0), purchase("MaxiPali", 1000)])).toEqual([
        "MaxiPali",
        "MasXMenos",
        "Walmart",
      ]);
    });

    it("puts the stores with only purchases without a total at the end, by name (D46)", () => {
      expect(storeNames([purchase("Walmart", null), purchase("MasXMenos", 500), purchase("Ávila", null)])).toEqual([
        "MasXMenos",
        "Ávila",
        "Walmart",
      ]);
    });

    it("puts the store without a name last among the ones without a total (D49)", () => {
      expect(storeNames([purchase(null, null), purchase("Walmart", null), purchase("MaxiPali", 1000)])).toEqual([
        "MaxiPali",
        "Walmart",
        null,
      ]);
    });

    it("orders a store with a total and purchases without a total by its amount", () => {
      expect(storeNames([purchase("Walmart", 2000), purchase("MaxiPali", null), purchase("MaxiPali", 5000)])).toEqual([
        "MaxiPali",
        "Walmart",
      ]);
    });
  });

  describe("manual adjustments (D45, D50, rule 112)", () => {
    it("adds the adjustments with their sign, outside the stores", () => {
      const breakdown = groupSpendingByStore([purchase("MaxiPali", 10000)], [adjustment(500), adjustment(-2000)]);

      expect(breakdown.adjustmentTotal).toBe(-1500);
      expect(breakdown.adjustmentCount).toBe(2);
      expect(breakdown.stores).toEqual([{ amount: 10000, closedCount: 1, storeName: "MaxiPali", withoutTotalCount: 0 }]);
    });

    it("counts a single adjustment, for the singular line", () => {
      const breakdown = groupSpendingByStore([purchase("MaxiPali", 10000)], [adjustment(500, SPENDING_PERIOD.DAY)]);

      expect(breakdown).toMatchObject({ adjustmentCount: 1, adjustmentTotal: 500 });
    });

    it("adds the cents of the adjustments without drift", () => {
      expect(groupSpendingByStore([], [adjustment(0.1), adjustment(0.2)]).adjustmentTotal).toBe(0.3);
    });

    it("keeps adjustments that add up to ₡0 as a line, not as no adjustments", () => {
      expect(groupSpendingByStore([], [adjustment(1500), adjustment(-1500)])).toMatchObject({
        adjustmentCount: 2,
        adjustmentTotal: 0,
      });
    });
  });

  describe("coherence with the period total (rule 114)", () => {
    it("gives the period total in cents when adding the stores and the adjustment", () => {
      const purchases = [
        purchase("Walmart", 1250.55),
        purchase("MaxiPali", 749.45),
        purchase(null, 0.1),
        purchase("MaxiPali", null),
        purchase("MasXMenos", 0.2),
      ];
      const adjustments = [adjustment(-234.56), adjustment(0.33, SPENDING_PERIOD.DAY)];
      const breakdown = groupSpendingByStore(purchases, adjustments);
      const spending = summarizeSpending(
        purchases.map(({ totalAmount }) => totalAmount),
        adjustments.map(({ amount }) => amount),
      );

      const storesCents = breakdown.stores.reduce((cents, { amount }) => cents + Math.round(amount * CENTS_PER_COLON), 0);
      const adjustmentCents = Math.round((breakdown.adjustmentTotal ?? 0) * CENTS_PER_COLON);

      expect(storesCents + adjustmentCents).toBe(Math.round(spending.total * CENTS_PER_COLON));
    });

    it("counts every purchase once, in the same totals as the period", () => {
      const purchases = [purchase("Walmart", 12000), purchase("MaxiPali", null), purchase(null, 8000)];
      const { stores } = groupSpendingByStore(purchases, []);
      const spending = summarizeSpending(purchases.map(({ totalAmount }) => totalAmount));

      expect(stores.reduce((count, store) => count + store.closedCount, 0)).toBe(spending.closedCount);
      expect(stores.reduce((count, store) => count + store.withoutTotalCount, 0)).toBe(spending.withoutTotalCount);
    });
  });
});
