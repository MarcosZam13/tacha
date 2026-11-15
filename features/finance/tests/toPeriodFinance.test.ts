import { describe, expect, it } from "vitest";
import { SPENDING_PERIOD } from "../constants/finance.constants";
import type { PeriodFinanceResponse } from "../models/PeriodFinance.type";
import { toPeriodFinance } from "../utils/toPeriodFinance";

// Semana del lunes 12 al domingo 18 de octubre de 2026 en Costa Rica (E2E.md).
const WEEK_START = "2026-10-12T06:00:00+00:00";
const WEEK_END = "2026-10-19T06:00:00+00:00";

const zonedResponse = (overrides: Partial<PeriodFinanceResponse> = {}): PeriodFinanceResponse => ({
  adjustment_count: 1,
  adjustments: [{ amount: -1500.5, effective_at: "2026-10-15T18:00:00.123456+00:00", id: "adjustment-1", scope: "week" }],
  closed_count: 2,
  period_end: WEEK_END,
  period_start: WEEK_START,
  purchases: [
    { closed_at: "2026-10-18T21:00:00+00:00", id: "purchase-2", store_name: "MaxiPali", total_amount: 10000 },
    { closed_at: "2026-10-14T15:00:00+00:00", id: "purchase-1", store_name: null, total_amount: 2000.5 },
    { closed_at: "2026-10-13T15:00:00+00:00", id: "purchase-0", store_name: "Walmart", total_amount: null },
  ],
  time_zone: "America/Costa_Rica",
  total: 10500,
  without_total_count: 1,
  ...overrides,
});

const responseWithoutTimeZone = (overrides: Partial<PeriodFinanceResponse> = {}): PeriodFinanceResponse => ({
  adjustment_count: 0,
  adjustments: [],
  closed_count: 0,
  period_end: null,
  period_start: null,
  purchases: [],
  time_zone: null,
  total: null,
  without_total_count: 0,
  ...overrides,
});

describe("toPeriodFinance", () => {
  it("maps the period of the saved time zone, in the order of the database", () => {
    expect(toPeriodFinance(zonedResponse())).toEqual({
      adjustments: [
        { amount: -1500.5, effectiveAt: "2026-10-15T18:00:00.123456+00:00", id: "adjustment-1", scope: SPENDING_PERIOD.WEEK },
      ],
      bounds: { end: new Date(WEEK_END), start: new Date(WEEK_START) },
      purchases: [
        { closedAt: "2026-10-18T21:00:00+00:00", id: "purchase-2", storeName: "MaxiPali", totalAmount: 10000 },
        { closedAt: "2026-10-14T15:00:00+00:00", id: "purchase-1", storeName: null, totalAmount: 2000.5 },
        { closedAt: "2026-10-13T15:00:00+00:00", id: "purchase-0", storeName: "Walmart", totalAmount: null },
      ],
      spending: { adjustmentCount: 1, closedCount: 2, total: 10500, withoutTotalCount: 1 },
      timeZone: "America/Costa_Rica",
    });
  });

  it("keeps a period with only an adjustment and no purchases", () => {
    const periodFinance = toPeriodFinance(
      zonedResponse({
        adjustments: [{ amount: 8000, effective_at: "2026-10-15T18:00:00+00:00", id: "adjustment-1", scope: "day" }],
        closed_count: 0,
        purchases: [],
        total: 8000,
        without_total_count: 0,
      }),
    );

    expect(periodFinance.timeZone === null ? null : periodFinance.spending).toEqual({
      adjustmentCount: 1,
      closedCount: 0,
      total: 8000,
      withoutTotalCount: 0,
    });
  });

  it("keeps a period in ₡0 with no purchases nor adjustments", () => {
    const periodFinance = toPeriodFinance(
      zonedResponse({ adjustment_count: 0, adjustments: [], closed_count: 0, purchases: [], total: 0, without_total_count: 0 }),
    );

    expect(periodFinance.timeZone === null ? null : periodFinance.spending.total).toBe(0);
  });

  it("is not an error without a confirmed time zone (rule 59)", () => {
    expect(toPeriodFinance(responseWithoutTimeZone())).toEqual({ timeZone: null });
  });

  it.each<[string, Partial<PeriodFinanceResponse>]>([
    ["bounds", { period_start: WEEK_START }],
    ["a total", { total: 0 }],
    ["purchases", { purchases: zonedResponse().purchases }],
    ["adjustments", { adjustments: zonedResponse().adjustments }],
  ])("fails when a period without a time zone brings %s", (_, overrides) => {
    expect(() => toPeriodFinance(responseWithoutTimeZone(overrides))).toThrow("get_period_finance");
  });

  it.each<[string, Partial<PeriodFinanceResponse>]>([
    ["no start", { period_start: null }],
    ["no end", { period_end: null }],
    ["no total", { total: null }],
    ["an invalid date", { period_start: "no es una fecha" }],
    ["a period that does not move forward", { period_end: WEEK_START }],
  ])("fails with a time zone and %s", (_, overrides) => {
    expect(() => toPeriodFinance(zonedResponse(overrides))).toThrow("get_period_finance");
  });

  it("fails with an unknown adjustment scope instead of ignoring it", () => {
    const adjustments = [{ amount: 100, effective_at: "2026-10-15T18:00:00+00:00", id: "adjustment-1", scope: "year" }];

    expect(() => toPeriodFinance(zonedResponse({ adjustments, total: 12100.5 }))).toThrow("nivel de ajuste desconocido");
  });

  it.each<[string, Partial<PeriodFinanceResponse>]>([
    ["the total", { total: 12000.5 }],
    ["the purchases with a total", { closed_count: 3 }],
    ["the purchases without a total", { without_total_count: 0 }],
    ["the adjustments", { adjustment_count: 2 }],
  ])("fails when %s does not match the rows it brought (rule 30, D19)", (_, overrides) => {
    expect(() => toPeriodFinance(zonedResponse(overrides))).toThrow("no cuadra");
  });
});
