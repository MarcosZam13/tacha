// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_NAV_ITEMS } from "@/components/app-shell/constants/app-shell.constants";
import { APP_ROUTE } from "@/constants";
import { FinanceDashboard } from "../FinanceDashboard";
import { PurchaseHistory } from "../PurchaseHistory";
import { FINANCE_TEXT, SPENDING_PERIOD } from "../constants/finance.constants";
import type { PeriodBounds } from "../models/PeriodBounds.interface";
import type { ZonedPeriodFinance } from "../models/PeriodFinance.type";
import {
  getPeriodFinance,
  getPeriodSpending,
  getSpendingBudgets,
  hasRegisteredSession,
  setSpendingBudget,
} from "../services/finance.service";
import { createFinanceDashboardPage } from "./FinanceDashboard.page";
import { createPurchaseHistoryPage } from "./PurchaseHistory.page";

// La pantalla con el servicio falso: sin Supabase ni sesión real.
vi.mock("../services/finance.service", () => ({
  getPeriodFinance: vi.fn(),
  getPeriodPurchases: vi.fn(),
  getPeriodSpending: vi.fn(),
  getSpendingBudgets: vi.fn(),
  hasRegisteredSession: vi.fn(),
  setPeriodTotal: vi.fn(),
  setPurchaseTotal: vi.fn(),
  setSpendingBudget: vi.fn(),
  setSpendingTimeZone: vi.fn(),
}));
const sessionMock = vi.mocked(hasRegisteredSession);
const spendingMock = vi.mocked(getPeriodSpending);
const financeMock = vi.mocked(getPeriodFinance);
const budgetsMock = vi.mocked(getSpendingBudgets);
const saveMock = vi.mocked(setSpendingBudget);

// Domingo 18 de octubre de 2026, 15:00 en hora local.
const NOW = new Date(2026, 9, 18, 15, 0);
const DAY_START = new Date(2026, 9, 18).getTime();

// Intl separa los miles con un espacio especial: los montos se buscan con un
// patrón que acepta cualquier espacio.
const amount = (text: string): RegExp => new RegExp(`^${text.replace(/ /gu, "\\s")}$`, "u");

// El día pide desde hoy; la semana, desde el lunes 12.
const spendingByPeriod = async ({ start }: PeriodBounds) =>
  start.getTime() === DAY_START
    ? { adjustmentCount: 0, closedCount: 1, total: 10000, withoutTotalCount: 0 }
    : { adjustmentCount: 0, closedCount: 2, total: 15000, withoutTotalCount: 1 };

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  // Sin zona guardada: se lee como antes, con el navegador (SPEC regla 59).
  financeMock.mockResolvedValue({ timeZone: null });
  sessionMock.mockResolvedValue(true);
  spendingMock.mockImplementation(spendingByPeriod);
  budgetsMock.mockResolvedValue({ day: null, month: null, week: null });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("FinanceDashboard: sub-tabs (SCRUM-90)", () => {
  it("marks Dashboard as the current tab and links to Historial", async () => {
    render(<FinanceDashboard />);
    const page = createPurchaseHistoryPage();

    await page.findTabsNavigation();

    expect(page.getDashboardTab()).toHaveAttribute("aria-current", "page");
    expect(page.getHistoryTab()).not.toHaveAttribute("aria-current");
    expect(page.getHistoryTab()).toHaveAttribute("href", APP_ROUTE.FINANCE_HISTORY);
    expect(await page.findText("Gastado esta semana")).toBeInTheDocument();
  });

  it("shows no tabs without a registered account", async () => {
    sessionMock.mockResolvedValue(false);
    render(<FinanceDashboard />);
    const page = createPurchaseHistoryPage();

    await page.findNoAccountNotice();

    expect(page.queryTabsNavigation()).not.toBeInTheDocument();
  });
});

describe("FinanceDashboard: access (D6)", () => {
  it("asks to sign in and requests no data without a registered account", async () => {
    sessionMock.mockResolvedValue(false);
    render(<FinanceDashboard />);
    const page = createFinanceDashboardPage();

    expect(await page.findNoAccountNotice()).toBeInTheDocument();
    expect(page.getTitle()).toBeInTheDocument();
    expect(page.queryPeriodGroup()).not.toBeInTheDocument();
    expect(spendingMock).not.toHaveBeenCalled();
    expect(budgetsMock).not.toHaveBeenCalled();
  });

  it("keeps the status region mounted from the start", () => {
    render(<FinanceDashboard />);
    const page = createFinanceDashboardPage();

    expect(page.getStatusRegion()).toBeInTheDocument();
    expect(page.getStatusRegion()).toBeEmptyDOMElement();
  });
});

describe("FinanceDashboard: spending (CA-01, CA-02)", () => {
  it("opens on the current week with its total and dates", async () => {
    render(<FinanceDashboard />);
    const page = createFinanceDashboardPage();

    await page.findPeriodGroup();
    expect(page.getPeriodButton("Semana")).toHaveAttribute("aria-pressed", "true");
    expect(await page.findText(amount("₡15 000"))).toBeInTheDocument();
    expect(page.queryText("Lunes 12 a domingo 18 de octubre")).toBeInTheDocument();
    expect(page.getStatusRegion()?.textContent).toMatch(/^Gastado esta semana: ₡15\s000$/u);
  });

  it("recalculates the total when the period changes, without asking for the budgets again", async () => {
    render(<FinanceDashboard />);
    const page = createFinanceDashboardPage();
    await page.findText(amount("₡15 000"));

    await page.choosePeriod("Día");

    expect(await page.findText(amount("₡10 000"))).toBeInTheDocument();
    expect(page.getPeriodButton("Día")).toHaveAttribute("aria-pressed", "true");
    expect(page.queryText("Gastado hoy")).toBeInTheDocument();
    expect(page.getStatusRegion()?.textContent).toMatch(/^Gastado hoy: ₡10\s000$/u);
    expect(budgetsMock).toHaveBeenCalledTimes(1);
  });

  it("shows the error and loads the spending again on retry", async () => {
    spendingMock.mockRejectedValueOnce(new Error("network"));
    render(<FinanceDashboard />);
    const page = createFinanceDashboardPage();

    expect(await page.findText(FINANCE_TEXT.SPENDING_LOAD_ERROR)).toBeInTheDocument();
    await page.retry();

    expect(await page.findText(amount("₡15 000"))).toBeInTheDocument();
    expect(page.queryAlert()).not.toBeInTheDocument();
  });
});

describe("FinanceDashboard: budget (CA-03)", () => {
  it("defines the weekly budget, shows the difference and returns the focus", async () => {
    saveMock.mockResolvedValue(50000);
    render(<FinanceDashboard />);
    const page = createFinanceDashboardPage();
    expect(await page.findText("Sin presupuesto semanal")).toBeInTheDocument();
    await page.findText(amount("₡15 000"));

    await page.openBudget(FINANCE_TEXT.DEFINE_BUDGET);
    expect(page.getBudgetInput("Presupuesto semanal (₡)")).toHaveFocus();
    await page.typeBudget("Presupuesto semanal (₡)", "50 000");
    await page.save();

    expect(saveMock).toHaveBeenCalledWith(SPENDING_PERIOD.WEEK, 50000);
    expect(await page.findText(amount("₡50 000"))).toBeInTheDocument();
    expect(page.queryText(/^Te quedan ₡35\s000$/u)).toBeInTheDocument();
    expect(page.queryText("No incluye 1 compra sin total")).toBeInTheDocument();
    expect(page.getStatusRegion()).toHaveTextContent(FINANCE_TEXT.BUDGET_SAVED);
    await waitFor(() => expect(page.getBudgetActionButton(FINANCE_TEXT.EDIT_BUDGET)).toHaveFocus());
  });

  it("rejects an invalid amount without saving", async () => {
    render(<FinanceDashboard />);
    const page = createFinanceDashboardPage();
    await page.findText("Sin presupuesto semanal");

    await page.openBudget(FINANCE_TEXT.DEFINE_BUDGET);
    await page.typeBudget("Presupuesto semanal (₡)", "12.5");
    await page.save();

    expect(page.getBudgetInput("Presupuesto semanal (₡)")).toHaveAccessibleDescription(FINANCE_TEXT.BUDGET_INVALID);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("edits an existing budget and says how much it was exceeded", async () => {
    budgetsMock.mockResolvedValue({ day: null, month: null, week: 50000 });
    saveMock.mockResolvedValue(12000);
    render(<FinanceDashboard />);
    const page = createFinanceDashboardPage();
    await page.findText(/^Te quedan ₡35\s000$/u);

    await page.openBudget(FINANCE_TEXT.EDIT_BUDGET);
    expect(page.getBudgetInput("Presupuesto semanal (₡)")).toHaveValue("50000");
    await page.cancel();
    await page.openBudget(FINANCE_TEXT.EDIT_BUDGET);
    const input = page.getBudgetInput("Presupuesto semanal (₡)");
    await page.clearAndTypeBudget(input, "12000");
    await page.save();

    expect(saveMock).toHaveBeenCalledWith(SPENDING_PERIOD.WEEK, 12000);
    expect(await page.findText(/^Te pasaste por ₡3\s000$/u)).toBeInTheDocument();
  });

  it("keeps the other periods without a budget", async () => {
    budgetsMock.mockResolvedValue({ day: null, month: null, week: 50000 });
    render(<FinanceDashboard />);
    const page = createFinanceDashboardPage();
    await page.findText(amount("₡50 000"));

    await page.choosePeriod("Mes");

    expect(await page.findText("Sin presupuesto mensual")).toBeInTheDocument();
  });
});

describe("FinanceDashboard: separate errors (SPEC §7)", () => {
  it("keeps the budget visible when the spending fails", async () => {
    spendingMock.mockRejectedValue(new Error("network"));
    budgetsMock.mockResolvedValue({ day: null, month: null, week: 50000 });
    render(<FinanceDashboard />);
    const page = createFinanceDashboardPage();

    expect(await page.findText(FINANCE_TEXT.SPENDING_LOAD_ERROR)).toBeInTheDocument();
    expect(await page.findText(amount("₡50 000"))).toBeInTheDocument();
    expect(page.getBudgetActionButton(FINANCE_TEXT.EDIT_BUDGET)).toBeEnabled();
  });

  it("keeps the spending visible when the budgets fail, without allowing to edit", async () => {
    budgetsMock.mockRejectedValue(new Error("network"));
    render(<FinanceDashboard />);
    const page = createFinanceDashboardPage();

    expect(await page.findText(FINANCE_TEXT.BUDGET_LOAD_ERROR)).toBeInTheDocument();
    expect(await page.findText(amount("₡15 000"))).toBeInTheDocument();
    expect(page.queryBudgetActionButton(FINANCE_TEXT.DEFINE_BUDGET)).not.toBeInTheDocument();
  });

  it("shows ₡0 and the empty message when the period has no closed purchases", async () => {
    spendingMock.mockResolvedValue({ adjustmentCount: 0, closedCount: 0, total: 0, withoutTotalCount: 0 });
    render(<FinanceDashboard />);
    const page = createFinanceDashboardPage();

    expect(await page.findText(FINANCE_TEXT.SPENDING_EMPTY)).toBeInTheDocument();
    expect(page.queryText("₡0")).toBeInTheDocument();
  });
});

describe("Navigation", () => {
  it("has a «Finanzas» item that leads to /finanzas", () => {
    expect(APP_ROUTE.FINANCE).toBe("/finanzas");
    expect(APP_NAV_ITEMS).toContainEqual({ href: "/finanzas", label: "Finanzas" });
  });
});

describe("FinanceDashboard and PurchaseHistory with manual adjustments (SCRUM-91)", () => {
  // La semana con dos compras, una "Sin total" y un ajuste de +₡5 000: ₡20 000.
  const ZONED_WEEK: ZonedPeriodFinance = {
    adjustments: [{ amount: 5000, effectiveAt: NOW.toISOString(), id: "adjustment-1", scope: SPENDING_PERIOD.WEEK }],
    bounds: { end: new Date(2026, 9, 19), start: new Date(2026, 9, 12) },
    purchases: [
      { closedAt: new Date(2026, 9, 18, 10, 0).toISOString(), id: "sunday", storeName: "MaxiPali", totalAmount: 10000 },
      { closedAt: new Date(2026, 9, 14, 10, 0).toISOString(), id: "wednesday", storeName: "Walmart", totalAmount: null },
      { closedAt: new Date(2026, 9, 12, 10, 0).toISOString(), id: "monday", storeName: "MasXMenos", totalAmount: 5000 },
    ],
    spending: { adjustmentCount: 1, closedCount: 2, total: 20000, withoutTotalCount: 1 },
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  it("shows the same total in both screens with the same data (D19)", async () => {
    financeMock.mockResolvedValue(ZONED_WEEK);

    const dashboard = render(<FinanceDashboard />);
    const dashboardPage = createFinanceDashboardPage();
    expect(await dashboardPage.findText(amount("₡20 000"))).toBeInTheDocument();
    dashboard.unmount();

    render(<PurchaseHistory />);
    const historyPage = createPurchaseHistoryPage();
    expect(await historyPage.findText(amount("₡20 000"))).toBeInTheDocument();
    expect(spendingMock).not.toHaveBeenCalled();
  });

  it("says the Dashboard total includes adjustments, keeps «Compras» and has no pencil (D11, SPEC §8)", async () => {
    financeMock.mockResolvedValue(ZONED_WEEK);
    render(<FinanceDashboard />);
    const page = createPurchaseHistoryPage();

    expect(await page.findText(FINANCE_TEXT.INCLUDES_ADJUSTMENTS)).toBeInTheDocument();
    expect(page.queryText(FINANCE_TEXT.PURCHASES)?.nextSibling).toHaveTextContent("2");
    expect(page.queryText(FINANCE_TEXT.WITHOUT_TOTAL)?.nextSibling).toHaveTextContent("1");
    expect(page.queryEditButton(/^Editar total/u)).not.toBeInTheDocument();
    expect(page.queryText(FINANCE_TEXT.ADJUSTMENT)).not.toBeInTheDocument();
  });

  it("shows the adjustment in the Historial as its own row, without a pencil (D16)", async () => {
    financeMock.mockResolvedValue(ZONED_WEEK);
    render(<PurchaseHistory />);
    const page = createPurchaseHistoryPage();

    const rows = await page.findPurchaseRows();
    expect(rows).toHaveLength(4);
    expect(page.queryText(FINANCE_TEXT.ADJUSTMENT)).toBeInTheDocument();
    expect(page.queryText(amount("\\+₡5 000"))).toBeInTheDocument();
    // Tres lápices de compra y el del periodo; ninguno del ajuste.
    expect(page.getAllEditButtons()).toHaveLength(4);
    expect(page.queryText(FINANCE_TEXT.INCLUDES_ADJUSTMENTS)).not.toBeInTheDocument();
  });
});