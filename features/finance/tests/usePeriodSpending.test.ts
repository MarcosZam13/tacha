// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SPENDING_PERIOD, SPENDING_STATUS } from "../constants/finance.constants";
import type { SpendingPeriodType } from "../constants/finance.constants";
import { usePeriodSpending } from "../hooks/usePeriodSpending";
import type { PeriodSpending } from "../models/PeriodSpending.interface";
import { getPeriodSpending } from "../services/finance.service";

vi.mock("../services/finance.service", () => ({
  getPeriodSpending: vi.fn(),
}));
const spendingMock = vi.mocked(getPeriodSpending);

// Domingo 18 de octubre de 2026, 15:00 en hora local. Solo se finge Date: los
// timers reales siguen, así waitFor funciona igual.
const NOW = new Date(2026, 9, 18, 15, 0);
const WEEK_SPENDING: PeriodSpending = { closedCount: 2, total: 15000, withoutTotalCount: 1 };

/** Una respuesta de la base que el test decide cuándo llega. */
const createPending = <Value>() => {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

const renderSpending = (period: SpendingPeriodType = SPENDING_PERIOD.WEEK, isEnabled = true) =>
  renderHook(({ hookPeriod, hookIsEnabled }) => usePeriodSpending(hookPeriod, hookIsEnabled), {
    initialProps: { hookIsEnabled: isEnabled, hookPeriod: period },
  });

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  spendingMock.mockResolvedValue(WEEK_SPENDING);
});

// Sin globals, Testing Library no desmonta solo entre tests.
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("usePeriodSpending", () => {
  it("asks for nothing without a registered account", () => {
    const { result } = renderSpending(SPENDING_PERIOD.WEEK, false);

    expect(result.current.status).toBe(SPENDING_STATUS.LOADING);
    expect(spendingMock).not.toHaveBeenCalled();
  });

  it("loads the current week, Monday to Monday", async () => {
    const { result } = renderSpending();

    expect(result.current.status).toBe(SPENDING_STATUS.LOADING);
    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));
    expect(spendingMock).toHaveBeenCalledWith({ end: new Date(2026, 9, 19), start: new Date(2026, 9, 12) });
    expect(result.current.spending).toEqual(WEEK_SPENDING);
    expect(result.current.bounds).toEqual({ end: new Date(2026, 9, 19), start: new Date(2026, 9, 12) });
  });

  it("is ready when the period only has purchases without a total", async () => {
    spendingMock.mockResolvedValue({ closedCount: 0, total: 0, withoutTotalCount: 1 });
    const { result } = renderSpending();

    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));
  });

  it("is empty when the period has no closed purchases", async () => {
    spendingMock.mockResolvedValue({ closedCount: 0, total: 0, withoutTotalCount: 0 });
    const { result } = renderSpending();

    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.EMPTY));
  });

  it("asks for the new bounds when the period changes, without stale data in between", async () => {
    const { result, rerender } = renderSpending();
    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));

    rerender({ hookIsEnabled: true, hookPeriod: SPENDING_PERIOD.DAY });

    expect(result.current.status).toBe(SPENDING_STATUS.LOADING);
    expect(result.current.spending).toBeNull();
    await waitFor(() =>
      expect(spendingMock).toHaveBeenLastCalledWith({ end: new Date(2026, 9, 19), start: new Date(2026, 9, 18) }),
    );
  });

  it("ignores the answer of a previous period that arrives late", async () => {
    const weekAnswer = createPending<PeriodSpending>();
    const monthSpending: PeriodSpending = { closedCount: 5, total: 80000, withoutTotalCount: 0 };
    spendingMock.mockReturnValueOnce(weekAnswer.promise).mockResolvedValueOnce(monthSpending);
    const { result, rerender } = renderSpending();

    rerender({ hookIsEnabled: true, hookPeriod: SPENDING_PERIOD.MONTH });
    await waitFor(() => expect(result.current.spending).toEqual(monthSpending));
    await act(async () => weekAnswer.resolve(WEEK_SPENDING));

    expect(result.current.spending).toEqual(monthSpending);
  });

  it("shows the failure and loads the same period again on retry", async () => {
    spendingMock.mockRejectedValueOnce(new Error("network"));
    const { result } = renderSpending();
    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.FAILED));
    expect(result.current.spending).toBeNull();

    act(() => result.current.onRetry());

    expect(result.current.status).toBe(SPENDING_STATUS.LOADING);
    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));
    expect(spendingMock).toHaveBeenCalledTimes(2);
    expect(spendingMock).toHaveBeenLastCalledWith({ end: new Date(2026, 9, 19), start: new Date(2026, 9, 12) });
  });
});
