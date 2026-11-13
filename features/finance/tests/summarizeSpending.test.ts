import { describe, expect, it } from "vitest";
import { summarizeSpending } from "../utils/summarizeSpending";

describe("summarizeSpending", () => {
  it("returns ₡0 and no purchases when the period has none", () => {
    expect(summarizeSpending([])).toEqual({ adjustmentCount: 0, closedCount: 0, total: 0, withoutTotalCount: 0 });
  });

  it("adds the totals of closed purchases", () => {
    expect(summarizeSpending([10000, 5000])).toEqual({
      adjustmentCount: 0,
      closedCount: 2,
      total: 15000,
      withoutTotalCount: 0,
    });
  });

  it("counts purchases without a total apart, never as ₡0", () => {
    expect(summarizeSpending([10000, null, 5000, null])).toEqual({
      adjustmentCount: 0,
      closedCount: 2,
      total: 15000,
      withoutTotalCount: 2,
    });
  });

  it("keeps the period with only purchases without a total apart from an empty period", () => {
    expect(summarizeSpending([null])).toEqual({ adjustmentCount: 0, closedCount: 0, total: 0, withoutTotalCount: 1 });
  });

  it("counts a purchase closed with ₡0 as a purchase with a total", () => {
    expect(summarizeSpending([0])).toEqual({ adjustmentCount: 0, closedCount: 1, total: 0, withoutTotalCount: 0 });
  });

  it("adds cents without floating point drift", () => {
    // 0.1 + 0.2 en punto flotante da 0.30000000000000004.
    expect(summarizeSpending([0.1, 0.2]).total).toBe(0.3);
    expect(summarizeSpending([1250.55, 749.45]).total).toBe(2000);
  });

  describe("with manual adjustments (SCRUM-91, rule 49)", () => {
    it("adds positive and negative adjustments with their sign", () => {
      expect(summarizeSpending([10000, 5000], [2500, -1000])).toEqual({
        adjustmentCount: 2,
        closedCount: 2,
        total: 16500,
        withoutTotalCount: 0,
      });
    });

    it("never counts an adjustment as a purchase or as without a total (§8)", () => {
      const spending = summarizeSpending([10000, null], [-3000]);

      expect(spending.closedCount).toBe(1);
      expect(spending.withoutTotalCount).toBe(1);
      expect(spending.adjustmentCount).toBe(1);
      expect(spending.total).toBe(7000);
    });

    it("gives the written total when the period only has an adjustment", () => {
      expect(summarizeSpending([], [8000])).toEqual({ adjustmentCount: 1, closedCount: 0, total: 8000, withoutTotalCount: 0 });
    });

    it("does not add purchases without a total next to an adjustment", () => {
      expect(summarizeSpending([null, null], [5000]).total).toBe(5000);
    });

    it("adds the cents of an adjustment against purchases with decimals without drift", () => {
      // Una compra antigua con centavos: el ajuste deja el periodo exactamente en lo escrito.
      expect(summarizeSpending([1234.56], [-234.56]).total).toBe(1000);
      expect(summarizeSpending([0.1], [0.2]).total).toBe(0.3);
    });

    it("can bring the period to exactly ₡0", () => {
      expect(summarizeSpending([10000], [-10000]).total).toBe(0);
    });
  });
});
