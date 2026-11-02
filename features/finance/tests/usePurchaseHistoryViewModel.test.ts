// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FINANCE_ACCESS_STATUS,
  FINANCE_TEXT,
  SPENDING_PERIOD,
  SPENDING_STATUS,
} from "../constants/finance.constants";
import { usePurchaseHistoryViewModel } from "../hooks/usePurchaseHistoryViewModel";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import { getPeriodPurchases, hasRegisteredSession } from "../services/finance.service";

vi.mock("../services/finance.service", () => ({
  getPeriodPurchases: vi.fn(),
  hasRegisteredSession: vi.fn(),
}));
const sessionMock = vi.mocked(hasRegisteredSession);
const purchasesMock = vi.mocked(getPeriodPurchases);

// Domingo 18 de octubre de 2026, 15:00 en hora local.
const NOW = new Date(2026, 9, 18, 15, 0);

const buildPurchase = (overrides: Partial<PeriodPurchase> = {}): PeriodPurchase => ({
  closedAt: NOW.toISOString(),
  id: "purchase-1",
  storeName: "MaxiPali",
  totalAmount: 10000,
  ...overrides,
});

// Intl separa los miles con un espacio especial: se normaliza para comparar.
const toPlainSpaces = (text: string | null): string | null => text?.replace(/\s/gu, " ") ?? null;

const renderLoaded = async () => {
  const rendered = renderHook(() => usePurchaseHistoryViewModel());
  await waitFor(() => expect(rendered.result.current.spending.status).toBe(SPENDING_STATUS.READY));
  return rendered;
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  sessionMock.mockResolvedValue(true);
  purchasesMock.mockResolvedValue([buildPurchase()]);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("usePurchaseHistoryViewModel: access (D6)", () => {
  it("checks the session before asking for purchases", async () => {
    const { result } = renderHook(() => usePurchaseHistoryViewModel());

    expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.CHECKING);
    expect(purchasesMock).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.READY));
  });

  it("asks for no purchases without a registered account", async () => {
    sessionMock.mockResolvedValue(false);
    const { result } = renderHook(() => usePurchaseHistoryViewModel());

    await waitFor(() => expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.NO_ACCOUNT));
    expect(purchasesMock).not.toHaveBeenCalled();
    expect(result.current.purchaseRows).toEqual([]);
  });
});

describe("usePurchaseHistoryViewModel: rows", () => {
  it("gives each row its date, store and amount", async () => {
    const { result } = await renderLoaded();

    const [row] = result.current.purchaseRows;
    expect(row.id).toBe("purchase-1");
    expect(row.dateText).toBe("Domingo 18 de octubre");
    expect(row.storeText).toBe("MaxiPali");
    expect(toPlainSpaces(row.amountText)).toBe("₡10 000");
  });

  it("shows «Sin total» for a null total and ₡0 for a real zero (D8)", async () => {
    purchasesMock.mockResolvedValue([
      buildPurchase({ id: "without-total", totalAmount: null }),
      buildPurchase({ id: "zero", totalAmount: 0 }),
    ]);
    const { result } = await renderLoaded();

    expect(result.current.purchaseRows.map((row) => row.amountText)).toEqual([FINANCE_TEXT.WITHOUT_TOTAL, "₡0"]);
    expect(result.current.spending.closedCount).toBe(1);
    expect(result.current.spending.withoutTotalCount).toBe(1);
    expect(result.current.spending.totalText).toBe("₡0");
  });

  it("keeps a row without a store name and its amount in the total (rule 29)", async () => {
    purchasesMock.mockResolvedValue([buildPurchase({ storeName: null })]);
    const { result } = await renderLoaded();

    expect(result.current.purchaseRows[0].storeText).toBe(FINANCE_TEXT.STORE_UNAVAILABLE);
    expect(toPlainSpaces(result.current.spending.totalText)).toBe("₡10 000");
  });
});

describe("usePurchaseHistoryViewModel: period (CA-02, D9)", () => {
  it("offers Día, Semana and Mes, with Semana chosen", async () => {
    const { result } = await renderLoaded();

    expect(result.current.periodOptions.map((option) => option.label)).toEqual(["Día", "Semana", "Mes"]);
    expect(result.current.periodOptions.find((option) => option.isSelected)?.period).toBe(SPENDING_PERIOD.WEEK);
  });

  it("shows the week total with its dates and announces it", async () => {
    purchasesMock.mockResolvedValue([buildPurchase(), buildPurchase({ id: "purchase-2", totalAmount: 5000 })]);
    const { result } = await renderLoaded();

    expect(result.current.spending.label).toBe("Gastado esta semana");
    expect(result.current.spending.rangeText).toBe("Lunes 12 a domingo 18 de octubre");
    expect(toPlainSpaces(result.current.spending.totalText)).toBe("₡15 000");
    expect(toPlainSpaces(result.current.statusMessage)).toBe("Gastado esta semana: ₡15 000");
  });

  it("clears the rows and asks for the new period", async () => {
    const { result } = await renderLoaded();

    act(() => result.current.periodOptions[0].onSelect());

    expect(result.current.spending.status).toBe(SPENDING_STATUS.LOADING);
    expect(result.current.spending.label).toBe("Gastado hoy");
    expect(result.current.purchaseRows).toEqual([]);
    expect(result.current.statusMessage).toBeNull();
    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.READY));
    expect(purchasesMock).toHaveBeenLastCalledWith({ end: new Date(2026, 9, 19), start: new Date(2026, 9, 18) });
  });

  it("starts again on Semana when the screen opens again", async () => {
    const { result, unmount } = await renderLoaded();
    act(() => result.current.periodOptions[2].onSelect());
    unmount();

    const { result: reopened } = await renderLoaded();

    expect(reopened.current.periodOptions.find((option) => option.isSelected)?.period).toBe(SPENDING_PERIOD.WEEK);
  });
});

describe("usePurchaseHistoryViewModel: empty and errors", () => {
  it("is empty at ₡0 without rows", async () => {
    purchasesMock.mockResolvedValue([]);
    const { result } = renderHook(() => usePurchaseHistoryViewModel());

    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.EMPTY));
    expect(result.current.spending.totalText).toBe("₡0");
    expect(result.current.purchaseRows).toEqual([]);
  });

  it("shows the load error without rows or total, and retries the same period", async () => {
    purchasesMock.mockRejectedValueOnce(new Error("incomplete"));
    const { result } = renderHook(() => usePurchaseHistoryViewModel());
    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.FAILED));

    expect(result.current.spending.errorMessage).toBe(FINANCE_TEXT.SPENDING_LOAD_ERROR);
    expect(result.current.spending.totalText).toBeNull();
    expect(result.current.purchaseRows).toEqual([]);

    await act(async () => result.current.spending.onRetry());

    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.READY));
    expect(purchasesMock).toHaveBeenCalledTimes(2);
  });
});
