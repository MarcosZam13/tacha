// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_NAV_ITEMS } from "@/components/app-shell/constants/app-shell.constants";
import { APP_ROUTE } from "@/constants";
import { FinanceDashboard } from "../FinanceDashboard";
import { FINANCE_TEXT, SPENDING_PERIOD } from "../constants/finance.constants";
import type { PeriodBounds } from "../models/PeriodBounds.interface";
import {
  getPeriodSpending,
  getSpendingBudgets,
  hasRegisteredSession,
  setSpendingBudget,
} from "../services/finance.service";
import { createFinanceDashboardPage } from "./FinanceDashboard.page";

// La pantalla con el servicio falso: sin Supabase ni sesión real.
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
const DAY_START = new Date(2026, 9, 18).getTime();

// Intl separa los miles con un espacio especial: los montos se buscan con un
// patrón que acepta cualquier espacio.
const amount = (text: string): RegExp => new RegExp(`^${text.replace(/ /gu, "\\s")}$`, "u");

// El día pide desde hoy; la semana, desde el lunes 12.
const spendingByPeriod = async ({ start }: PeriodBounds) =>
  start.getTime() === DAY_START
    ? { closedCount: 1, total: 10000, withoutTotalCount: 0 }
    : { closedCount: 2, total: 15000, withoutTotalCount: 1 };

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  sessionMock.mockResolvedValue(true);
  spendingMock.mockImplementation(spendingByPeriod);
  budgetsMock.mockResolvedValue({ day: null, month: null, week: null });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
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
    spendingMock.mockResolvedValue({ closedCount: 0, total: 0, withoutTotalCount: 0 });
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
