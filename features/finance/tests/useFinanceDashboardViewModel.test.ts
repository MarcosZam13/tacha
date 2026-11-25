// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NullableRef } from "@/types/nullable.types";
import {
  BUDGET_STATUS,
  FINANCE_ACCESS_STATUS,
  FINANCE_TEXT,
  PENDING_REMINDER_STATUS,
  SPENDING_PERIOD,
  SPENDING_STATUS,
} from "../constants/finance.constants";
import { useFinanceDashboardViewModel } from "../hooks/useFinanceDashboardViewModel";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import {
  getPeriodFinance,
  getPeriodPurchases,
  getPurchasesWithoutTotal,
  getSpendingBudgets,
  hasRegisteredSession,
  setSpendingBudget,
} from "../services/finance.service";

vi.mock("../services/finance.service", () => ({
  getPeriodFinance: vi.fn(),
  getPeriodPurchases: vi.fn(),
  getPurchasesWithoutTotal: vi.fn(),
  getSpendingBudgets: vi.fn(),
  hasRegisteredSession: vi.fn(),
  setSpendingBudget: vi.fn(),
}));
const sessionMock = vi.mocked(hasRegisteredSession);
const purchasesMock = vi.mocked(getPeriodPurchases);
const financeMock = vi.mocked(getPeriodFinance);
const pendingMock = vi.mocked(getPurchasesWithoutTotal);
const budgetsMock = vi.mocked(getSpendingBudgets);
const saveMock = vi.mocked(setSpendingBudget);

// Domingo 18 de octubre de 2026, 15:00 en hora local.
const NOW = new Date(2026, 9, 18, 15, 0);

// Intl separa los miles con un espacio especial: se normaliza para comparar.
const toPlainSpaces = (text: string | null): string | null => text?.replace(/\s/gu, " ") ?? null;

// Las compras del periodo, como las da getPeriodPurchases sin zona guardada
// (SCRUM-72): el total sale de estas filas con summarizeSpending.
const purchasesWith = (...totals: NullableRef<number>[]): PeriodPurchase[] =>
  totals.map((totalAmount, index) => ({
    closedAt: new Date(2026, 9, 18, 10, 0).toISOString(),
    id: `purchase-${index}`,
    storeName: "MaxiPali",
    totalAmount,
  }));

// Con cuenta registrada y los dos bloques ya cargados.
const renderLoaded = async () => {
  const rendered = renderHook(() => useFinanceDashboardViewModel());
  await waitFor(() => expect(rendered.result.current.spending.status).toBe(SPENDING_STATUS.READY));
  await waitFor(() => expect(rendered.result.current.budget.status).toBe(BUDGET_STATUS.VIEWING));
  return rendered;
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  // Sin zona guardada: se lee como antes, con el navegador (SPEC regla 59).
  financeMock.mockResolvedValue({ timeZone: null });
  // Sin compras sin total: el recordatorio y la sección no se ven (SCRUM-92).
  pendingMock.mockResolvedValue([]);
  sessionMock.mockResolvedValue(true);
  purchasesMock.mockResolvedValue(purchasesWith(10000, 5000));
  budgetsMock.mockResolvedValue({ day: null, month: null, week: 50000 });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useFinanceDashboardViewModel: access (D6)", () => {
  it("checks the session before anything else", () => {
    const { result } = renderHook(() => useFinanceDashboardViewModel());

    expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.CHECKING);
    expect(purchasesMock).not.toHaveBeenCalled();
    expect(budgetsMock).not.toHaveBeenCalled();
  });

  it("asks for no data without a registered account (no session or anonymous)", async () => {
    sessionMock.mockResolvedValue(false);
    const { result } = renderHook(() => useFinanceDashboardViewModel());

    await waitFor(() => expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.NO_ACCOUNT));
    expect(purchasesMock).not.toHaveBeenCalled();
    expect(budgetsMock).not.toHaveBeenCalled();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("treats a session that cannot be read as no account", async () => {
    sessionMock.mockRejectedValue(new Error("storage"));
    const { result } = renderHook(() => useFinanceDashboardViewModel());

    await waitFor(() => expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.NO_ACCOUNT));
    expect(purchasesMock).not.toHaveBeenCalled();
  });

  it("loads spending and budgets with a registered account", async () => {
    const { result } = await renderLoaded();

    expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.REGISTERED);
    expect(purchasesMock).toHaveBeenCalledTimes(1);
    expect(budgetsMock).toHaveBeenCalledTimes(1);
  });

  it("goes to no account instead of retrying when the session is no longer registered", async () => {
    purchasesMock.mockRejectedValueOnce(new Error("401"));
    const { result } = renderHook(() => useFinanceDashboardViewModel());
    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.FAILED));
    sessionMock.mockResolvedValue(false);

    await act(async () => result.current.spending.onRetry());

    expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.NO_ACCOUNT);
    expect(purchasesMock).toHaveBeenCalledTimes(1);
  });
});

describe("useFinanceDashboardViewModel: period (CA-01, CA-02)", () => {
  it("offers Día, Semana and Mes, with Semana chosen", async () => {
    const { result } = await renderLoaded();

    expect(result.current.periodOptions.map((option) => option.label)).toEqual(["Día", "Semana", "Mes"]);
    expect(result.current.periodOptions.find((option) => option.isSelected)?.period).toBe(SPENDING_PERIOD.WEEK);
  });

  it("shows the week total with its dates and announces it", async () => {
    const { result } = await renderLoaded();

    expect(result.current.spending.label).toBe("Gastado esta semana");
    expect(toPlainSpaces(result.current.spending.totalText)).toBe("₡15 000");
    expect(result.current.spending.rangeText).toBe("Lunes 12 a domingo 18 de octubre");
    expect(toPlainSpaces(result.current.statusMessage)).toBe("Gastado esta semana: ₡15 000");
  });

  it("asks for the new period without asking for the budgets again", async () => {
    const { result } = await renderLoaded();
    purchasesMock.mockResolvedValue(purchasesWith(10000));

    act(() => result.current.periodOptions[0].onSelect());

    expect(result.current.spending.status).toBe(SPENDING_STATUS.LOADING);
    await waitFor(() => expect(toPlainSpaces(result.current.spending.totalText)).toBe("₡10 000"));
    expect(result.current.spending.label).toBe("Gastado hoy");
    expect(result.current.spending.rangeText).toBe("Domingo 18 de octubre");
    expect(budgetsMock).toHaveBeenCalledTimes(1);
  });

  it("shows the load error of the spending", async () => {
    purchasesMock.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useFinanceDashboardViewModel());

    await waitFor(() => expect(result.current.spending.errorMessage).toBe(FINANCE_TEXT.SPENDING_LOAD_ERROR));
    expect(result.current.spending.totalText).toBeNull();
  });
});

describe("useFinanceDashboardViewModel: budget (CA-03)", () => {
  it("shows what is left of the weekly budget", async () => {
    const { result } = await renderLoaded();

    expect(result.current.budget.label).toBe("Presupuesto semanal");
    expect(toPlainSpaces(result.current.budget.amountText)).toBe("₡50 000");
    expect(toPlainSpaces(result.current.budget.differenceText)).toBe("Te quedan ₡35 000");
    expect(result.current.budget.actionLabel).toBe(FINANCE_TEXT.EDIT_BUDGET);
  });

  it("says how much the budget was exceeded", async () => {
    budgetsMock.mockResolvedValue({ day: null, month: null, week: 12000 });
    const { result } = await renderLoaded();

    expect(toPlainSpaces(result.current.budget.differenceText)).toBe("Te pasaste por ₡3 000");
  });

  it("offers to define a budget when the period has none", async () => {
    budgetsMock.mockResolvedValue({ day: null, month: null, week: null });
    const { result } = await renderLoaded();

    expect(result.current.budget.amountText).toBeNull();
    expect(result.current.budget.noBudgetText).toBe("Sin presupuesto semanal");
    expect(result.current.budget.differenceText).toBeNull();
    expect(result.current.budget.actionLabel).toBe(FINANCE_TEXT.DEFINE_BUDGET);
  });

  it("warns that purchases without a total are not included", async () => {
    purchasesMock.mockResolvedValue(purchasesWith(10000, 5000, null, null));
    const { result } = await renderLoaded();

    expect(result.current.budget.notIncludedText).toBe("No incluye 2 compras sin total");
    expect(result.current.spending.withoutTotalCount).toBe(2);
  });

  it("never says the budget was exceeded by ₡0 because of cents", async () => {
    purchasesMock.mockResolvedValue(purchasesWith(50000.4));
    const { result } = await renderLoaded();

    expect(toPlainSpaces(result.current.budget.differenceText)).toBe("Te quedan ₡0");
  });

  it("announces the saved budget", async () => {
    saveMock.mockResolvedValue(60000);
    const { result } = await renderLoaded();
    act(() => result.current.budget.onEdit());
    act(() => result.current.budget.onTextChange("60000"));

    await act(async () => result.current.budget.onSave());

    expect(result.current.statusMessage).toBe(FINANCE_TEXT.BUDGET_SAVED);
    expect(toPlainSpaces(result.current.budget.differenceText)).toBe("Te quedan ₡45 000");
  });

  it("shows the load error of the budgets", async () => {
    budgetsMock.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useFinanceDashboardViewModel());

    await waitFor(() => expect(result.current.budget.status).toBe(BUDGET_STATUS.LOAD_FAILED));
    expect(result.current.budget.errorMessage).toBe(FINANCE_TEXT.BUDGET_LOAD_ERROR);
  });
});

describe("useFinanceDashboardViewModel: manual adjustments (SCRUM-91)", () => {
  // Las compras y los ajustes de get_period_finance, coherentes con su gasto.
  const zonedSpending = (adjustmentCount: number) => ({
    adjustments: Array.from({ length: adjustmentCount }, (_, index) => ({
      amount: 5000,
      effectiveAt: NOW.toISOString(),
      id: `adjustment-${index}`,
      scope: SPENDING_PERIOD.WEEK,
    })),
    bounds: { end: new Date(2026, 9, 19), start: new Date(2026, 9, 12) },
    purchases: purchasesWith(10000, 10000 - 5000 * adjustmentCount, null),
    spending: { adjustmentCount, closedCount: 2, total: 20000, withoutTotalCount: 1 },
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  it("says the total includes manual adjustments, without counting them as purchases (SPEC §8, D16)", async () => {
    financeMock.mockResolvedValue(zonedSpending(1));
    const { result } = await renderLoaded();

    expect(result.current.spending.noteText).toBe(FINANCE_TEXT.INCLUDES_ADJUSTMENTS);
    expect(result.current.spending.closedCount).toBe(2);
    expect(result.current.spending.withoutTotalCount).toBe(1);
    expect(toPlainSpaces(result.current.budget.differenceText)).toBe("Te quedan ₡30 000");
  });

  it("says nothing about adjustments without any", async () => {
    financeMock.mockResolvedValue(zonedSpending(0));
    const { result } = await renderLoaded();

    expect(result.current.spending.noteText).toBeNull();
  });

  it("gives no pencil nor field: the Dashboard does not edit totals (D11)", async () => {
    financeMock.mockResolvedValue(zonedSpending(1));
    const { result } = await renderLoaded();

    expect(result.current.spending.edit).toBeUndefined();
    expect(result.current.spending.editor).toBeUndefined();
  });

  it("shows why there is no total with TZ002, never falling back (rule 60)", async () => {
    financeMock.mockResolvedValue(null);
    const { result } = renderHook(() => useFinanceDashboardViewModel());

    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.FAILED));
    expect(result.current.spending.errorMessage).toBe(
      "Tu zona horaria guardada ya no es válida. Confirma tu zona para continuar.",
    );
    expect(result.current.spending.totalText).toBeNull();
    expect(purchasesMock).not.toHaveBeenCalled();
  });
});

describe("useFinanceDashboardViewModel: pending purchases reminder (SCRUM-92)", () => {
  const OLD_PENDING = {
    closedAt: new Date(2026, 9, 14, 10, 0).toISOString(),
    id: "old",
    storeName: "Walmart",
    totalAmount: null,
  };

  it("reminds with a link to the section of the Historial, in Finanzas only (D26)", async () => {
    pendingMock.mockResolvedValue([OLD_PENDING]);
    const { result } = await renderLoaded();

    await waitFor(() => expect(result.current.pendingReminder.status).toBe(PENDING_REMINDER_STATUS.PENDING));
    expect(result.current.pendingReminder).toMatchObject({
      linkHref: "/finanzas/historial#compras-sin-total",
      linkText: "Completarla",
      messageText: "Tienes 1 compra sin total desde hace más de 24 horas",
    });
    // El Dashboard no edita (D11).
    expect(result.current.spending.edit).toBeUndefined();
  });

  it("does not remind without purchases of 24 hours or more", async () => {
    pendingMock.mockResolvedValue([{ ...OLD_PENDING, closedAt: new Date(2026, 9, 18, 13, 0).toISOString() }]);
    const { result } = await renderLoaded();

    await waitFor(() => expect(result.current.pendingReminder.status).toBe(PENDING_REMINDER_STATUS.NONE));
  });

  it("keeps the spending and the budget when the reminder fails, and retries it (rule 67)", async () => {
    pendingMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce([OLD_PENDING]);
    const { result } = await renderLoaded();

    await waitFor(() => expect(result.current.pendingReminder.status).toBe(PENDING_REMINDER_STATUS.FAILED));
    expect(result.current.spending.status).toBe(SPENDING_STATUS.READY);
    expect(result.current.budget.status).toBe(BUDGET_STATUS.VIEWING);

    await act(async () => result.current.pendingReminder.onRetry());

    await waitFor(() => expect(result.current.pendingReminder.status).toBe(PENDING_REMINDER_STATUS.PENDING));
  });

  it("asks for nothing without a registered account (D6)", async () => {
    sessionMock.mockResolvedValue(false);
    const { result } = renderHook(() => useFinanceDashboardViewModel());

    await waitFor(() => expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.NO_ACCOUNT));
    expect(pendingMock).not.toHaveBeenCalled();
  });
});

describe("useFinanceDashboardViewModel: spending by store (SCRUM-72)", () => {
  const purchase = (id: string, storeName: NullableRef<string>, totalAmount: NullableRef<number>): PeriodPurchase => ({
    closedAt: new Date(2026, 9, 14, 10, 0).toISOString(),
    id,
    storeName,
    totalAmount,
  });
  const adjustment = (id: string, amount: number) => ({
    amount,
    effectiveAt: NOW.toISOString(),
    id,
    scope: SPENDING_PERIOD.WEEK,
  });
  // get_period_finance: las compras, los ajustes y el gasto que la base calcula con ellos.
  const zonedWeek = (
    purchases: PeriodPurchase[],
    adjustments: ReturnType<typeof adjustment>[],
    spending: { closedCount: number; total: number; withoutTotalCount: number },
  ) => ({
    adjustments,
    bounds: { end: new Date(2026, 9, 19), start: new Date(2026, 9, 12) },
    purchases,
    spending: { adjustmentCount: adjustments.length, ...spending },
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const plainRows = (rows: { amountText: string }[] | undefined) =>
    rows?.map((row) => ({ ...row, amountText: toPlainSpaces(row.amountText) }));

  it("builds one row per store, in order, with its texts (CA-01, CA-02, D46, D47, D49)", async () => {
    purchasesMock.mockResolvedValue([
      purchase("a", "MasXMenos", 3000),
      purchase("b", null, 8000),
      purchase("c", "Walmart", null),
      purchase("d", "MaxiPali", 8000),
      purchase("e", "MaxiPali", null),
      purchase("f", "Walmart", null),
    ]);
    const { result } = await renderLoaded();

    expect(plainRows(result.current.spendingByStore?.rows)).toEqual([
      { amountText: "₡8 000", hasNoTotal: false, id: "MaxiPali", storeText: "MaxiPali", withoutTotalText: "1 sin total" },
      { amountText: "₡8 000", hasNoTotal: false, id: "", storeText: FINANCE_TEXT.STORE_UNAVAILABLE, withoutTotalText: null },
      { amountText: "₡3 000", hasNoTotal: false, id: "MasXMenos", storeText: "MasXMenos", withoutTotalText: null },
      { amountText: FINANCE_TEXT.WITHOUT_TOTAL, hasNoTotal: true, id: "Walmart", storeText: "Walmart", withoutTotalText: "2 sin total" },
    ]);
    expect(result.current.spendingByStore?.adjustment).toBeNull();
  });

  it("shows a real ₡0 as an amount, never as «Sin total» (D8)", async () => {
    purchasesMock.mockResolvedValue([purchase("a", "Walmart", 0)]);
    const { result } = await renderLoaded();

    expect(result.current.spendingByStore?.rows[0]).toMatchObject({ amountText: "₡0", hasNoTotal: false });
  });

  it("gives one adjustment as «Ajuste manual» with its sign (D45, D50)", async () => {
    // ₡10 000 de compras y −₡1 500 de ajuste: ₡8 500.
    financeMock.mockResolvedValue(
      zonedWeek([purchase("a", "MaxiPali", 10000)], [adjustment("one", -1500)], {
        closedCount: 1,
        total: 8500,
        withoutTotalCount: 0,
      }),
    );
    const { result } = await renderLoaded();

    expect(result.current.spendingByStore?.adjustment?.labelText).toBe(FINANCE_TEXT.ADJUSTMENT);
    expect(toPlainSpaces(result.current.spendingByStore?.adjustment?.amountText ?? null)).toBe("−₡1 500");
    expect(result.current.spendingByStore?.rows).toHaveLength(1);
  });

  it("gives two or more adjustments as «Ajustes manuales» with their sum (D50)", async () => {
    // ₡10 000 de compras y +₡1 500 de ajustes: ₡11 500.
    financeMock.mockResolvedValue(
      zonedWeek([purchase("a", "MaxiPali", 10000)], [adjustment("one", 500), adjustment("two", 1000)], {
        closedCount: 1,
        total: 11500,
        withoutTotalCount: 0,
      }),
    );
    const { result } = await renderLoaded();

    expect(result.current.spendingByStore?.adjustment?.labelText).toBe(FINANCE_TEXT.ADJUSTMENTS);
    expect(toPlainSpaces(result.current.spendingByStore?.adjustment?.amountText ?? null)).toBe("+₡1 500");
  });

  it("gives no breakdown while loading", () => {
    purchasesMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFinanceDashboardViewModel());

    expect(result.current.spendingByStore).toBeNull();
  });

  it("gives no breakdown when the spending fails (rule 115)", async () => {
    purchasesMock.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useFinanceDashboardViewModel());

    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.FAILED));
    expect(result.current.spendingByStore).toBeNull();
  });

  it("gives no breakdown in a period without purchases (D48)", async () => {
    purchasesMock.mockResolvedValue([]);
    const { result } = renderHook(() => useFinanceDashboardViewModel());

    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.EMPTY));
    expect(result.current.spendingByStore).toBeNull();
  });

  it("gives no breakdown in a period with only adjustments (D48)", async () => {
    // Sin compras: el total es solo el ajuste.
    financeMock.mockResolvedValue(zonedWeek([], [adjustment("one", 8000)], { closedCount: 0, total: 8000, withoutTotalCount: 0 }));
    const { result } = await renderLoaded();

    expect(result.current.spendingByStore).toBeNull();
  });

  it("recalculates the breakdown for the new period (rule 116)", async () => {
    const { result } = await renderLoaded();
    purchasesMock.mockResolvedValue([purchase("a", "Walmart", 2500)]);

    act(() => result.current.periodOptions[0].onSelect());

    expect(result.current.spendingByStore).toBeNull();
    await waitFor(() => expect(result.current.spendingByStore?.rows.map((row) => row.storeText)).toEqual(["Walmart"]));
  });

  it("gives no breakdown and asks for nothing without a registered account (D6)", async () => {
    sessionMock.mockResolvedValue(false);
    const { result } = renderHook(() => useFinanceDashboardViewModel());

    await waitFor(() => expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.NO_ACCOUNT));
    expect(result.current.spendingByStore).toBeNull();
    expect(purchasesMock).not.toHaveBeenCalled();
    expect(financeMock).not.toHaveBeenCalled();
  });
});
