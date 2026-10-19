// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUDGET_STATUS,
  FINANCE_ACCESS_STATUS,
  FINANCE_TEXT,
  SPENDING_PERIOD,
  SPENDING_STATUS,
} from "../constants/finance.constants";
import { useFinanceDashboardViewModel } from "../hooks/useFinanceDashboardViewModel";
import {
  getPeriodSpending,
  getSpendingBudgets,
  hasRegisteredSession,
  setSpendingBudget,
} from "../services/finance.service";

vi.mock("../services/finance.service", () => ({
  getPeriodSpending: vi.fn(),
  getSpendingBudgets: vi.fn(),
  hasRegisteredSession: vi.fn(),
  setSpendingBudget: vi.fn(),
}));
const sessionMock = vi.mocked(hasRegisteredSession);
const spendingMock = vi.mocked(getPeriodSpending);
const budgetsMock = vi.mocked(getSpendingBudgets);
const saveMock = vi.mocked(setSpendingBudget);

// Domingo 18 de octubre de 2026, 15:00 en hora local.
const NOW = new Date(2026, 9, 18, 15, 0);

// Intl separa los miles con un espacio especial: se normaliza para comparar.
const toPlainSpaces = (text: string | null): string | null => text?.replace(/\s/gu, " ") ?? null;

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
  sessionMock.mockResolvedValue(true);
  spendingMock.mockResolvedValue({ closedCount: 2, total: 15000, withoutTotalCount: 0 });
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
    expect(spendingMock).not.toHaveBeenCalled();
    expect(budgetsMock).not.toHaveBeenCalled();
  });

  it("asks for no data without a registered account (no session or anonymous)", async () => {
    sessionMock.mockResolvedValue(false);
    const { result } = renderHook(() => useFinanceDashboardViewModel());

    await waitFor(() => expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.NO_ACCOUNT));
    expect(spendingMock).not.toHaveBeenCalled();
    expect(budgetsMock).not.toHaveBeenCalled();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("treats a session that cannot be read as no account", async () => {
    sessionMock.mockRejectedValue(new Error("storage"));
    const { result } = renderHook(() => useFinanceDashboardViewModel());

    await waitFor(() => expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.NO_ACCOUNT));
    expect(spendingMock).not.toHaveBeenCalled();
  });

  it("loads spending and budgets with a registered account", async () => {
    const { result } = await renderLoaded();

    expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.REGISTERED);
    expect(spendingMock).toHaveBeenCalledTimes(1);
    expect(budgetsMock).toHaveBeenCalledTimes(1);
  });

  it("goes to no account instead of retrying when the session is no longer registered", async () => {
    spendingMock.mockRejectedValueOnce(new Error("401"));
    const { result } = renderHook(() => useFinanceDashboardViewModel());
    await waitFor(() => expect(result.current.spending.status).toBe(SPENDING_STATUS.FAILED));
    sessionMock.mockResolvedValue(false);

    await act(async () => result.current.spending.onRetry());

    expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.NO_ACCOUNT);
    expect(spendingMock).toHaveBeenCalledTimes(1);
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
    spendingMock.mockResolvedValue({ closedCount: 1, total: 10000, withoutTotalCount: 0 });

    act(() => result.current.periodOptions[0].onSelect());

    expect(result.current.spending.status).toBe(SPENDING_STATUS.LOADING);
    await waitFor(() => expect(toPlainSpaces(result.current.spending.totalText)).toBe("₡10 000"));
    expect(result.current.spending.label).toBe("Gastado hoy");
    expect(result.current.spending.rangeText).toBe("Domingo 18 de octubre");
    expect(budgetsMock).toHaveBeenCalledTimes(1);
  });

  it("shows the load error of the spending", async () => {
    spendingMock.mockRejectedValue(new Error("network"));
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
    spendingMock.mockResolvedValue({ closedCount: 2, total: 15000, withoutTotalCount: 2 });
    const { result } = await renderLoaded();

    expect(result.current.budget.notIncludedText).toBe("No incluye 2 compras sin total");
    expect(result.current.spending.withoutTotalCount).toBe(2);
  });

  it("never says the budget was exceeded by ₡0 because of cents", async () => {
    spendingMock.mockResolvedValue({ closedCount: 1, total: 50000.4, withoutTotalCount: 0 });
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
