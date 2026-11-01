// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SPENDING_PERIOD, SPENDING_STATUS } from "../constants/finance.constants";
import type { SpendingPeriodType } from "../constants/finance.constants";
import { usePeriodPurchases } from "../hooks/usePeriodPurchases";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import { getPeriodPurchases } from "../services/finance.service";

vi.mock("../services/finance.service", () => ({
  getPeriodPurchases: vi.fn(),
}));
const purchasesMock = vi.mocked(getPeriodPurchases);

// Domingo 18 de octubre de 2026, 15:00 en hora local. Solo se finge Date: los
// timers reales siguen, así waitFor funciona igual.
const NOW = new Date(2026, 9, 18, 15, 0);
const WEEK_BOUNDS = { end: new Date(2026, 9, 19), start: new Date(2026, 9, 12) };

const buildPurchase = (id: string, totalAmount: PeriodPurchase["totalAmount"]): PeriodPurchase => ({
  closedAt: NOW.toISOString(),
  id,
  storeName: "MaxiPali",
  totalAmount,
});
const WEEK_PURCHASES = [buildPurchase("a", 10000), buildPurchase("b", null), buildPurchase("c", 5000)];

/** Una respuesta de la base que el test decide cuándo llega. */
const createPending = <Value>() => {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

const renderPurchases = (period: SpendingPeriodType = SPENDING_PERIOD.WEEK, isEnabled = true) =>
  renderHook(({ hookPeriod, hookIsEnabled }) => usePeriodPurchases(hookPeriod, hookIsEnabled), {
    initialProps: { hookIsEnabled: isEnabled, hookPeriod: period },
  });

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  purchasesMock.mockResolvedValue(WEEK_PURCHASES);
});

// Sin globals, Testing Library no desmonta solo entre tests.
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("usePeriodPurchases", () => {
  it("asks for nothing without a registered account", () => {
    const { result } = renderPurchases(SPENDING_PERIOD.WEEK, false);

    expect(result.current.status).toBe(SPENDING_STATUS.LOADING);
    expect(purchasesMock).not.toHaveBeenCalled();
  });

  it("loads the current week and adds the total from the same rows (rule 25, D8)", async () => {
    const { result } = renderPurchases();

    expect(result.current.status).toBe(SPENDING_STATUS.LOADING);
    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));
    expect(purchasesMock).toHaveBeenCalledWith(WEEK_BOUNDS);
    expect(purchasesMock).toHaveBeenCalledTimes(1);
    expect(result.current.purchases).toEqual(WEEK_PURCHASES);
    expect(result.current.bounds).toEqual(WEEK_BOUNDS);
    expect(result.current.spending).toEqual({ closedCount: 2, total: 15000, withoutTotalCount: 1 });
  });

  it("counts a real zero total and is ready when it is the only purchase", async () => {
    purchasesMock.mockResolvedValue([buildPurchase("zero", 0)]);
    const { result } = renderPurchases();

    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));
    expect(result.current.spending).toEqual({ closedCount: 1, total: 0, withoutTotalCount: 0 });
  });

  it("is ready when the period only has purchases without a total", async () => {
    purchasesMock.mockResolvedValue([buildPurchase("without-total", null)]);
    const { result } = renderPurchases();

    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));
    expect(result.current.spending).toEqual({ closedCount: 0, total: 0, withoutTotalCount: 1 });
  });

  it("is empty when the period has no closed purchases", async () => {
    purchasesMock.mockResolvedValue([]);
    const { result } = renderPurchases();

    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.EMPTY));
    expect(result.current.purchases).toEqual([]);
  });

  it("asks for the new bounds when the period changes, without stale data in between", async () => {
    const { result, rerender } = renderPurchases();
    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));

    rerender({ hookIsEnabled: true, hookPeriod: SPENDING_PERIOD.DAY });

    expect(result.current.status).toBe(SPENDING_STATUS.LOADING);
    expect(result.current.purchases).toBeNull();
    expect(result.current.spending).toBeNull();
    await waitFor(() =>
      expect(purchasesMock).toHaveBeenLastCalledWith({ end: new Date(2026, 9, 19), start: new Date(2026, 9, 18) }),
    );
  });

  it("ignores the answer of a previous period that arrives late", async () => {
    const weekAnswer = createPending<PeriodPurchase[]>();
    const monthPurchases = [buildPurchase("month", 80000)];
    purchasesMock.mockReturnValueOnce(weekAnswer.promise).mockResolvedValueOnce(monthPurchases);
    const { result, rerender } = renderPurchases();

    rerender({ hookIsEnabled: true, hookPeriod: SPENDING_PERIOD.MONTH });
    await waitFor(() => expect(result.current.purchases).toEqual(monthPurchases));
    await act(async () => weekAnswer.resolve(WEEK_PURCHASES));

    expect(result.current.purchases).toEqual(monthPurchases);
  });

  it("shows the failure and loads the same period again on retry", async () => {
    purchasesMock.mockRejectedValueOnce(new Error("network"));
    const { result } = renderPurchases();
    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.FAILED));
    expect(result.current.purchases).toBeNull();
    expect(result.current.spending).toBeNull();

    act(() => result.current.onRetry());

    expect(result.current.status).toBe(SPENDING_STATUS.LOADING);
    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));
    expect(purchasesMock).toHaveBeenCalledTimes(2);
    expect(purchasesMock).toHaveBeenLastCalledWith(WEEK_BOUNDS);
  });

  it("ignores the answer if the screen closes while loading", async () => {
    const weekAnswer = createPending<PeriodPurchase[]>();
    purchasesMock.mockReturnValueOnce(weekAnswer.promise);
    const { result, unmount } = renderPurchases();

    unmount();
    await act(async () => weekAnswer.resolve(WEEK_PURCHASES));

    expect(result.current.status).toBe(SPENDING_STATUS.LOADING);
  });
});
