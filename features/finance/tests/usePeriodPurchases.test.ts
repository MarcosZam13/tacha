// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SPENDING_PERIOD, SPENDING_STATUS } from "../constants/finance.constants";
import type { SpendingPeriodType } from "../constants/finance.constants";
import { usePeriodPurchases } from "../hooks/usePeriodPurchases";
import type { ZonedPeriodFinance } from "../models/PeriodFinance.type";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import { getPeriodFinance, getPeriodPurchases } from "../services/finance.service";

// Después de desmontar, guardar el estado no cambia nada que se pueda observar
// en result.current. Por eso se registra cada llamada a un setter de useState:
// así el test de desmontaje falla si el hook intenta guardar la respuesta.
const { stateSetterSpy } = vi.hoisted(() => ({ stateSetterSpy: vi.fn() }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initialState: unknown) => {
      const [state, setState] = actual.useState(initialState);
      return [
        state,
        (nextState: unknown) => {
          stateSetterSpy(nextState);
          setState(nextState);
        },
      ];
    },
  };
});

vi.mock("../services/finance.service", () => ({
  getPeriodFinance: vi.fn(),
  getPeriodPurchases: vi.fn(),
}));
const purchasesMock = vi.mocked(getPeriodPurchases);
const financeMock = vi.mocked(getPeriodFinance);

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
  // Sin zona guardada: se lee como antes, con el navegador (SPEC regla 59).
  financeMock.mockResolvedValue({ timeZone: null });
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
    expect(result.current.spending).toEqual({ adjustmentCount: 0, closedCount: 2, total: 15000, withoutTotalCount: 1 });
  });

  it("counts a real zero total and is ready when it is the only purchase", async () => {
    purchasesMock.mockResolvedValue([buildPurchase("zero", 0)]);
    const { result } = renderPurchases();

    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));
    expect(result.current.spending).toEqual({ adjustmentCount: 0, closedCount: 1, total: 0, withoutTotalCount: 0 });
  });

  it("is ready when the period only has purchases without a total", async () => {
    purchasesMock.mockResolvedValue([buildPurchase("without-total", null)]);
    const { result } = renderPurchases();

    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));
    expect(result.current.spending).toEqual({ adjustmentCount: 0, closedCount: 0, total: 0, withoutTotalCount: 1 });
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

  it("does not save the answer if the screen closes while loading", async () => {
    const weekAnswer = createPending<PeriodPurchase[]>();
    purchasesMock.mockReturnValueOnce(weekAnswer.promise);
    const { unmount } = renderPurchases();

    unmount();
    await act(async () => weekAnswer.resolve(WEEK_PURCHASES));

    expect(stateSetterSpy).not.toHaveBeenCalled();
  });

  it("does not save the failure if the screen closes while loading", async () => {
    let rejectAnswer: (reason: Error) => void = () => undefined;
    purchasesMock.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectAnswer = reject;
      }),
    );
    const { unmount } = renderPurchases();

    unmount();
    await act(async () => rejectAnswer(new Error("network")));

    expect(stateSetterSpy).not.toHaveBeenCalled();
  });
});

describe("usePeriodPurchases with a saved time zone (SCRUM-91)", () => {
  const ZONED_BOUNDS = { end: new Date("2026-10-19T06:00:00Z"), start: new Date("2026-10-12T06:00:00Z") };
  const WEEK_ADJUSTMENT = {
    amount: -1000,
    effectiveAt: "2026-10-15T18:00:00Z",
    id: "adjustment-1",
    scope: SPENDING_PERIOD.WEEK,
  };
  const zonedFinance = (overrides: Partial<ZonedPeriodFinance> = {}): ZonedPeriodFinance => ({
    adjustments: [WEEK_ADJUSTMENT],
    bounds: ZONED_BOUNDS,
    purchases: WEEK_PURCHASES,
    spending: { adjustmentCount: 1, closedCount: 2, total: 14000, withoutTotalCount: 1 },
    timeZone: "America/Costa_Rica",
    ...overrides,
  });

  it("takes purchases, adjustments, total and time zone from one read (SPEC §12)", async () => {
    financeMock.mockResolvedValue(zonedFinance());
    const { result } = renderPurchases();

    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));
    expect(financeMock).toHaveBeenCalledWith(SPENDING_PERIOD.WEEK);
    expect(purchasesMock).not.toHaveBeenCalled();
    expect(result.current.bounds).toEqual(ZONED_BOUNDS);
    expect(result.current.purchases).toEqual(WEEK_PURCHASES);
    expect(result.current.adjustments).toEqual([WEEK_ADJUSTMENT]);
    // El total es el de la base, con el ajuste: no se vuelve a sumar solo con las compras.
    expect(result.current.spending).toEqual({ adjustmentCount: 1, closedCount: 2, total: 14000, withoutTotalCount: 1 });
    expect(result.current.timeZone).toBe("America/Costa_Rica");
  });

  it("is ready, not empty, when the period only has an adjustment (D17)", async () => {
    financeMock.mockResolvedValue(
      zonedFinance({ purchases: [], spending: { adjustmentCount: 1, closedCount: 0, total: 5000, withoutTotalCount: 0 } }),
    );
    const { result } = renderPurchases();

    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));
    expect(result.current.purchases).toEqual([]);
  });

  it("is empty without purchases nor adjustments", async () => {
    financeMock.mockResolvedValue(
      zonedFinance({
        adjustments: [],
        purchases: [],
        spending: { adjustmentCount: 0, closedCount: 0, total: 0, withoutTotalCount: 0 },
      }),
    );
    const { result } = renderPurchases();

    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.EMPTY));
  });

  it("reads as before, with no adjustments nor time zone, when none is confirmed (rule 59)", async () => {
    const { result } = renderPurchases();

    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));
    expect(purchasesMock).toHaveBeenCalledWith(WEEK_BOUNDS);
    expect(result.current.adjustments).toEqual([]);
    expect(result.current.timeZone).toBeNull();
  });

  it("shows no purchases nor total and asks to confirm a time zone with TZ002 (rule 60)", async () => {
    financeMock.mockResolvedValue(null);
    const { result } = renderPurchases();

    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.FAILED));
    expect(result.current.needsTimeZoneConfirmation).toBe(true);
    expect(result.current.purchases).toBeNull();
    expect(result.current.adjustments).toBeNull();
    expect(result.current.spending).toBeNull();
    expect(purchasesMock).not.toHaveBeenCalled();
  });

  it("fails without asking to confirm when the read fails for another reason", async () => {
    financeMock.mockRejectedValue(new Error("network"));
    const { result } = renderPurchases();

    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.FAILED));
    expect(result.current.needsTimeZoneConfirmation).toBe(false);
  });

  it("ignores the read of a previous period that arrives late", async () => {
    const weekRead = createPending<ZonedPeriodFinance>();
    const monthRead = zonedFinance({
      adjustments: [],
      purchases: [],
      spending: { adjustmentCount: 0, closedCount: 0, total: 0, withoutTotalCount: 0 },
    });
    financeMock.mockReturnValueOnce(weekRead.promise).mockResolvedValueOnce(monthRead);
    const { result, rerender } = renderPurchases();

    rerender({ hookIsEnabled: true, hookPeriod: SPENDING_PERIOD.MONTH });
    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.EMPTY));
    await act(async () => weekRead.resolve(zonedFinance()));

    expect(result.current.status).toBe(SPENDING_STATUS.EMPTY);
    expect(result.current.adjustments).toEqual([]);
  });
});

describe("usePeriodPurchases: applying what was saved (SCRUM-91)", () => {
  const ZONED_BOUNDS = { end: new Date("2026-10-19T06:00:00Z"), start: new Date("2026-10-12T06:00:00Z") };
  const DAY_ADJUSTMENT = { amount: 500, effectiveAt: "2026-10-13T18:00:00Z", id: "adjustment-day", scope: SPENDING_PERIOD.DAY };
  const WEEK_ADJUSTMENT = {
    amount: -1000,
    effectiveAt: "2026-10-15T18:00:00Z",
    id: "adjustment-week",
    scope: SPENDING_PERIOD.WEEK,
  };
  // Compras de ₡10 000 y ₡5 000 (una "Sin total") más los dos ajustes: ₡14 500.
  const zonedFinance = (): ZonedPeriodFinance => ({
    adjustments: [DAY_ADJUSTMENT, WEEK_ADJUSTMENT],
    bounds: ZONED_BOUNDS,
    purchases: WEEK_PURCHASES,
    spending: { adjustmentCount: 2, closedCount: 2, total: 14500, withoutTotalCount: 1 },
    timeZone: "America/Costa_Rica",
  });

  const renderLoaded = async () => {
    financeMock.mockResolvedValue(zonedFinance());
    const rendered = renderPurchases();
    await waitFor(() => expect(rendered.result.current.status).toBe(SPENDING_STATUS.READY));
    financeMock.mockClear();
    return rendered;
  };

  it("applies a purchase total without loading again, also completing a «Sin total» (D12)", async () => {
    const { result } = await renderLoaded();

    act(() => result.current.applySavedPurchase({ closedAt: NOW.toISOString(), id: "b", totalAmount: 2500 }));

    expect(result.current.status).toBe(SPENDING_STATUS.READY);
    expect(result.current.purchases?.find((purchase) => purchase.id === "b")?.totalAmount).toBe(2500);
    expect(result.current.spending).toEqual({ adjustmentCount: 2, closedCount: 3, total: 17000, withoutTotalCount: 0 });
    expect(financeMock).not.toHaveBeenCalled();
  });

  it("does nothing with a purchase that is no longer on screen", async () => {
    const { result } = await renderLoaded();

    act(() => result.current.applySavedPurchase({ closedAt: NOW.toISOString(), id: "other", totalAmount: 1 }));

    expect(result.current.spending?.total).toBe(14500);
    expect(financeMock).not.toHaveBeenCalled();
  });

  it("replaces the adjustment of the period and keeps the ones of smaller levels (rules 50 and 52)", async () => {
    const { result } = await renderLoaded();
    const replaced = { ...WEEK_ADJUSTMENT, amount: 4500 };

    act(() => result.current.applySavedPeriodTotal(SPENDING_PERIOD.WEEK, { adjustment: replaced }, 20000));

    expect(result.current.adjustments).toEqual([DAY_ADJUSTMENT, replaced]);
    expect(result.current.spending?.total).toBe(20000);
    expect(financeMock).not.toHaveBeenCalled();
  });

  it("creates the adjustment in date order", async () => {
    financeMock.mockResolvedValue({
      ...zonedFinance(),
      adjustments: [DAY_ADJUSTMENT],
      spending: { adjustmentCount: 1, closedCount: 2, total: 15500, withoutTotalCount: 1 },
    });
    const { result } = renderPurchases();
    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));
    const created = { ...WEEK_ADJUSTMENT, amount: 4500, effectiveAt: "2026-10-12T07:00:00Z" };

    act(() => result.current.applySavedPeriodTotal(SPENDING_PERIOD.WEEK, { adjustment: created }, 20000));

    expect(result.current.adjustments).toEqual([created, DAY_ADJUSTMENT]);
  });

  it("removes the adjustment when the difference was 0 (rule 50)", async () => {
    const { result } = await renderLoaded();

    act(() => result.current.applySavedPeriodTotal(SPENDING_PERIOD.WEEK, { adjustment: null }, 15500));

    expect(result.current.adjustments).toEqual([DAY_ADJUSTMENT]);
    expect(result.current.spending?.adjustmentCount).toBe(1);
  });

  it("reads again when the saved total does not match what is on screen (another tab, D20)", async () => {
    const { result } = await renderLoaded();

    act(() => result.current.applySavedPeriodTotal(SPENDING_PERIOD.WEEK, { adjustment: null }, 99999));

    expect(result.current.status).toBe(SPENDING_STATUS.LOADING);
    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));
    expect(financeMock).toHaveBeenCalledTimes(1);
  });

  it("ignores a period total saved for another period", async () => {
    const { result } = await renderLoaded();

    act(() => result.current.applySavedPeriodTotal(SPENDING_PERIOD.MONTH, { adjustment: null }, 0));

    expect(result.current.spending?.total).toBe(14500);
    expect(financeMock).not.toHaveBeenCalled();
  });

  it("reads again with the saved time zone when the screen was read without one", async () => {
    const { result } = renderPurchases();
    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));
    expect(result.current.timeZone).toBeNull();
    financeMock.mockClear();

    act(() => result.current.applySavedPurchase({ closedAt: NOW.toISOString(), id: "a", totalAmount: 1 }));

    await waitFor(() => expect(financeMock).toHaveBeenCalledTimes(1));
  });
});