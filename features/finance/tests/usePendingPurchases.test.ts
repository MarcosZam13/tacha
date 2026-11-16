// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PENDING_REMINDER_STATUS, SPENDING_STATUS } from "../constants/finance.constants";
import { usePendingPurchases } from "../hooks/usePendingPurchases";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import { getPurchasesWithoutTotal } from "../services/finance.service";

// Después de desmontar, guardar el estado no cambia nada que se pueda observar
// en result.current. Por eso se registra cada llamada a un setter de useState.
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
  getPurchasesWithoutTotal: vi.fn(),
}));
const pendingMock = vi.mocked(getPurchasesWithoutTotal);

// Domingo 18 de octubre de 2026, 15:00 en Costa Rica (el reloj de E2E.md).
const NOW = new Date("2026-10-18T21:00:00Z");

const buildPurchase = (id: string, closedAt: string): PeriodPurchase => ({
  closedAt,
  id,
  storeName: "Walmart",
  totalAmount: null,
});
// 11 horas (todavía no cuenta), 4 días y 28 días (cuentan).
const RECENT = buildPurchase("recent", "2026-10-18T10:00:00Z");
const FOUR_DAYS = buildPurchase("four-days", "2026-10-14T16:00:00Z");
const LAST_MONTH = buildPurchase("last-month", "2026-09-20T16:00:00Z");

/** Una respuesta de la base que el test decide cuándo llega. */
const createPending = <Value>() => {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

const renderPending = (isEnabled = true) =>
  renderHook(({ hookIsEnabled }) => usePendingPurchases(hookIsEnabled), { initialProps: { hookIsEnabled: isEnabled } });

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  pendingMock.mockResolvedValue([RECENT, FOUR_DAYS, LAST_MONTH]);
});

// Sin globals, Testing Library no desmonta solo entre tests.
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("usePendingPurchases (SCRUM-92)", () => {
  it("asks for nothing without a registered account (D6)", () => {
    const { result } = renderPending(false);

    expect(result.current.status).toBe(SPENDING_STATUS.LOADING);
    expect(result.current.reminderStatus).toBe(PENDING_REMINDER_STATUS.LOADING);
    expect(pendingMock).not.toHaveBeenCalled();
  });

  it("loads every purchase without a total and counts the ones of 24 hours or more (D23, D25)", async () => {
    const { result } = renderPending();

    expect(result.current.status).toBe(SPENDING_STATUS.LOADING);
    expect(result.current.reminderStatus).toBe(PENDING_REMINDER_STATUS.LOADING);
    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));

    expect(pendingMock).toHaveBeenCalledTimes(1);
    expect(result.current.purchases).toEqual([RECENT, FOUR_DAYS, LAST_MONTH]);
    expect(result.current.overdueCount).toBe(2);
    expect(result.current.reminderStatus).toBe(PENDING_REMINDER_STATUS.PENDING);
  });

  it("lists a recent purchase without reminding about it yet (rules 63 and 70)", async () => {
    pendingMock.mockResolvedValue([RECENT]);
    const { result } = renderPending();

    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));
    expect(result.current.purchases).toEqual([RECENT]);
    expect(result.current.overdueCount).toBe(0);
    expect(result.current.reminderStatus).toBe(PENDING_REMINDER_STATUS.NONE);
  });

  it("is empty and reminds nothing without purchases", async () => {
    pendingMock.mockResolvedValue([]);
    const { result } = renderPending();

    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.EMPTY));
    expect(result.current.reminderStatus).toBe(PENDING_REMINDER_STATUS.NONE);
  });

  it("measures 24 hours against the time of the load (rule 65)", async () => {
    const { result } = renderPending();
    await waitFor(() => expect(result.current.overdueCount).toBe(2));

    // Pasa un día con la pantalla abierta: no se recalcula hasta la próxima carga.
    vi.setSystemTime(new Date("2026-10-19T21:00:00Z"));
    expect(result.current.overdueCount).toBe(2);

    act(() => result.current.onRetry());
    await waitFor(() => expect(result.current.overdueCount).toBe(3));
  });

  it("shows the failure in both, without hiding it, and loads again on retry (rule 67)", async () => {
    pendingMock.mockRejectedValueOnce(new Error("network"));
    const { result } = renderPending();
    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.FAILED));
    expect(result.current.reminderStatus).toBe(PENDING_REMINDER_STATUS.FAILED);
    expect(result.current.purchases).toBeNull();
    expect(result.current.overdueCount).toBe(0);

    act(() => result.current.onRetry());

    expect(result.current.status).toBe(SPENDING_STATUS.LOADING);
    await waitFor(() => expect(result.current.reminderStatus).toBe(PENDING_REMINDER_STATUS.PENDING));
    expect(pendingMock).toHaveBeenCalledTimes(2);
  });

  it("removes a completed purchase without loading again, and the reminder follows (rule 69)", async () => {
    const { result } = renderPending();
    await waitFor(() => expect(result.current.overdueCount).toBe(2));

    act(() => result.current.removePurchase("four-days"));

    expect(result.current.status).toBe(SPENDING_STATUS.READY);
    expect(result.current.purchases?.map(({ id }) => id)).toEqual(["recent", "last-month"]);
    expect(result.current.overdueCount).toBe(1);

    act(() => result.current.removePurchase("last-month"));
    expect(result.current.reminderStatus).toBe(PENDING_REMINDER_STATUS.NONE);

    act(() => result.current.removePurchase("recent"));
    expect(result.current.status).toBe(SPENDING_STATUS.EMPTY);
    expect(pendingMock).toHaveBeenCalledTimes(1);
  });

  it("ignores removing a purchase that is not listed", async () => {
    const { result } = renderPending();
    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));

    act(() => result.current.removePurchase("other"));

    expect(result.current.purchases).toHaveLength(3);
  });

  it("loads again when asked, as after P0002", async () => {
    const { result } = renderPending();
    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));
    pendingMock.mockResolvedValueOnce([LAST_MONTH]);

    act(() => result.current.onRetry());

    await waitFor(() => expect(result.current.purchases).toEqual([LAST_MONTH]));
    expect(pendingMock).toHaveBeenCalledTimes(2);
  });

  it("ignores an answer of a previous load that arrives late", async () => {
    const firstAnswer = createPending<PeriodPurchase[]>();
    pendingMock.mockReturnValueOnce(firstAnswer.promise).mockResolvedValueOnce([LAST_MONTH]);
    const { result } = renderPending();

    act(() => result.current.onRetry());
    await waitFor(() => expect(result.current.purchases).toEqual([LAST_MONTH]));
    await act(async () => firstAnswer.resolve([RECENT, FOUR_DAYS]));

    expect(result.current.purchases).toEqual([LAST_MONTH]);
  });

  it("does not save the answer if the screen closes while loading", async () => {
    const answer = createPending<PeriodPurchase[]>();
    pendingMock.mockReturnValueOnce(answer.promise);
    const { unmount } = renderPending();

    unmount();
    await act(async () => answer.resolve([FOUR_DAYS]));

    expect(stateSetterSpy).not.toHaveBeenCalled();
  });

  it("stops showing purchases when the account is no longer registered", async () => {
    const { rerender, result } = renderPending();
    await waitFor(() => expect(result.current.status).toBe(SPENDING_STATUS.READY));

    rerender({ hookIsEnabled: false });

    expect(result.current.purchases).toBeNull();
    expect(result.current.reminderStatus).toBe(PENDING_REMINDER_STATUS.LOADING);
  });
});
