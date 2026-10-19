import { describe, expect, it } from "vitest";
import { summarizeSpending } from "../utils/summarizeSpending";

describe("summarizeSpending", () => {
  it("returns ₡0 and no purchases when the period has none", () => {
    expect(summarizeSpending([])).toEqual({ closedCount: 0, total: 0, withoutTotalCount: 0 });
  });

  it("adds the totals of closed purchases", () => {
    expect(summarizeSpending([10000, 5000])).toEqual({ closedCount: 2, total: 15000, withoutTotalCount: 0 });
  });

  it("counts purchases without a total apart, never as ₡0", () => {
    expect(summarizeSpending([10000, null, 5000, null])).toEqual({
      closedCount: 2,
      total: 15000,
      withoutTotalCount: 2,
    });
  });

  it("keeps the period with only purchases without a total apart from an empty period", () => {
    expect(summarizeSpending([null])).toEqual({ closedCount: 0, total: 0, withoutTotalCount: 1 });
  });

  it("counts a purchase closed with ₡0 as a purchase with a total", () => {
    expect(summarizeSpending([0])).toEqual({ closedCount: 1, total: 0, withoutTotalCount: 0 });
  });

  it("adds cents without floating point drift", () => {
    // 0.1 + 0.2 en punto flotante da 0.30000000000000004.
    expect(summarizeSpending([0.1, 0.2]).total).toBe(0.3);
    expect(summarizeSpending([1250.55, 749.45]).total).toBe(2000);
  });
});
