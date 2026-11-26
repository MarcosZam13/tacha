// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NullableRef } from "@/types/nullable.types";
import { APP_NAV_ITEMS } from "@/components/app-shell/constants/app-shell.constants";
import { APP_ROUTE } from "@/constants";
import { FinanceDashboard } from "../FinanceDashboard";
import { PurchaseHistory } from "../PurchaseHistory";
import { FINANCE_TEXT, SPENDING_PERIOD } from "../constants/finance.constants";
import type { PeriodBounds } from "../models/PeriodBounds.interface";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import type { ZonedPeriodFinance } from "../models/PeriodFinance.type";
import {
  getPeriodFinance,
  getPeriodPurchases,
  getPurchasesWithoutTotal,
  getSpendingBudgets,
  hasRegisteredSession,
  setSpendingBudget,
} from "../services/finance.service";
import { createFinanceDashboardPage } from "./FinanceDashboard.page";
import { createSpendingByStorePage } from "./SpendingByStore.page";
import { createPurchaseHistoryPage } from "./PurchaseHistory.page";

// La pantalla con el servicio falso: sin Supabase ni sesión real.
vi.mock("../services/finance.service", () => ({
  getPeriodFinance: vi.fn(),
  getPeriodPurchases: vi.fn(),
  getPurchasesWithoutTotal: vi.fn(),
  getSpendingBudgets: vi.fn(),
  hasRegisteredSession: vi.fn(),
  setPeriodTotal: vi.fn(),
  setPurchaseTotal: vi.fn(),
  setSpendingBudget: vi.fn(),
  setSpendingTimeZone: vi.fn(),
}));
const sessionMock = vi.mocked(hasRegisteredSession);
const purchasesMock = vi.mocked(getPeriodPurchases);
const financeMock = vi.mocked(getPeriodFinance);
const pendingMock = vi.mocked(getPurchasesWithoutTotal);
const budgetsMock = vi.mocked(getSpendingBudgets);
const saveMock = vi.mocked(setSpendingBudget);

// Domingo 18 de octubre de 2026, 15:00 en hora local.
const NOW = new Date(2026, 9, 18, 15, 0);
const DAY_START = new Date(2026, 9, 18).getTime();

// Intl separa los miles con un espacio especial: los montos se buscan con un
// patrón que acepta cualquier espacio.
const amount = (text: string): RegExp => new RegExp(`^${text.replace(/ /gu, "\\s")}$`, "u");

// Una compra del periodo, como la da getPeriodPurchases sin zona guardada (SCRUM-72).
const purchase = (id: string, storeName: NullableRef<string>, totalAmount: NullableRef<number>): PeriodPurchase => ({
  closedAt: new Date(2026, 9, 18, 10, 0).toISOString(),
  id,
  storeName,
  totalAmount,
});

// Las compras de E2E-FIN-05. El día pide desde hoy (₡10 000); la semana, desde el
// lunes 12 (₡15 000 y una sin total).
const SUNDAY = purchase("sunday", "MaxiPali", 10000);
const WEEK_PURCHASES = [SUNDAY, purchase("wednesday", "Walmart", null), purchase("monday", "MasXMenos", 5000)];
const purchasesByPeriod = async ({ start }: PeriodBounds) => (start.getTime() === DAY_START ? [SUNDAY] : WEEK_PURCHASES);

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  // Sin zona guardada: se lee como antes, con el navegador (SPEC regla 59).
  financeMock.mockResolvedValue({ timeZone: null });
  // Sin compras sin total: el recordatorio y la sección no se ven (SCRUM-92).
  pendingMock.mockResolvedValue([]);
  sessionMock.mockResolvedValue(true);
  purchasesMock.mockImplementation(purchasesByPeriod);
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
    expect(purchasesMock).not.toHaveBeenCalled();
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
    expect(await page.findTotalText(amount("₡15 000"))).toBeInTheDocument();
    expect(page.queryText("Lunes 12 a domingo 18 de octubre")).toBeInTheDocument();
    expect(page.getStatusRegion()?.textContent).toMatch(/^Gastado esta semana: ₡15\s000$/u);
  });

  it("recalculates the total when the period changes, without asking for the budgets again", async () => {
    render(<FinanceDashboard />);
    const page = createFinanceDashboardPage();
    await page.findTotalText(amount("₡15 000"));

    await page.choosePeriod("Día");

    expect(await page.findTotalText(amount("₡10 000"))).toBeInTheDocument();
    expect(page.getPeriodButton("Día")).toHaveAttribute("aria-pressed", "true");
    expect(page.queryText("Gastado hoy")).toBeInTheDocument();
    expect(page.getStatusRegion()?.textContent).toMatch(/^Gastado hoy: ₡10\s000$/u);
    expect(budgetsMock).toHaveBeenCalledTimes(1);
  });

  it("shows the error and loads the spending again on retry", async () => {
    purchasesMock.mockRejectedValueOnce(new Error("network"));
    render(<FinanceDashboard />);
    const page = createFinanceDashboardPage();

    expect(await page.findText(FINANCE_TEXT.SPENDING_LOAD_ERROR)).toBeInTheDocument();
    await page.retry();

    expect(await page.findTotalText(amount("₡15 000"))).toBeInTheDocument();
    expect(page.queryAlert()).not.toBeInTheDocument();
  });
});

describe("FinanceDashboard: budget (CA-03)", () => {
  it("defines the weekly budget, shows the difference and returns the focus", async () => {
    saveMock.mockResolvedValue(50000);
    render(<FinanceDashboard />);
    const page = createFinanceDashboardPage();
    expect(await page.findText("Sin presupuesto semanal")).toBeInTheDocument();
    await page.findTotalText(amount("₡15 000"));

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
    purchasesMock.mockRejectedValue(new Error("network"));
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
    expect(await page.findTotalText(amount("₡15 000"))).toBeInTheDocument();
    expect(page.queryBudgetActionButton(FINANCE_TEXT.DEFINE_BUDGET)).not.toBeInTheDocument();
  });

  it("shows ₡0 and the empty message when the period has no closed purchases", async () => {
    purchasesMock.mockResolvedValue([]);
    render(<FinanceDashboard />);
    const page = createFinanceDashboardPage();

    expect(await page.findText(FINANCE_TEXT.SPENDING_EMPTY)).toBeInTheDocument();
    expect(page.queryText("₡0")).toBeInTheDocument();
  });
});

describe("Navigation", () => {
  it("has a «Finanzas» item that leads to /finanzas", () => {
    expect(APP_ROUTE.FINANCE).toBe("/finanzas");
    // objectContaining: desde SCRUM-158 cada ítem también trae su ícono.
    expect(APP_NAV_ITEMS).toContainEqual(expect.objectContaining({ href: "/finanzas", label: "Finanzas" }));
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
    expect(purchasesMock).not.toHaveBeenCalled();
  });

  it("says the Dashboard total includes adjustments, keeps «Compras» and has no pencil (D11, SPEC §8)", async () => {
    financeMock.mockResolvedValue(ZONED_WEEK);
    render(<FinanceDashboard />);
    const page = createPurchaseHistoryPage();

    expect(await page.findText(FINANCE_TEXT.INCLUDES_ADJUSTMENTS)).toBeInTheDocument();
    // Los contadores del total; "Sin total" también es el badge de Walmart en el desglose (SCRUM-72).
    const totalCard = within(await createFinanceDashboardPage().findTotalCard());
    expect(totalCard.getByText(FINANCE_TEXT.PURCHASES).nextSibling).toHaveTextContent("2");
    expect(totalCard.getByText(FINANCE_TEXT.WITHOUT_TOTAL).nextSibling).toHaveTextContent("1");
    expect(page.queryEditButton(/^Editar total/u)).not.toBeInTheDocument();
    // Desde SCRUM-72 el ajuste se ve una vez, en la línea del desglose (D45), no en el total.
    expect(totalCard.queryByText(FINANCE_TEXT.ADJUSTMENT)).not.toBeInTheDocument();
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

describe("FinanceDashboard: pending purchases reminder (SCRUM-92)", () => {
  it("reminds with a link to «Compras sin total» of the Historial, without a pencil (D11, D26)", async () => {
    pendingMock.mockResolvedValue([
      { closedAt: new Date(2026, 9, 14, 10, 0).toISOString(), id: "old", storeName: "Walmart", totalAmount: null },
      { closedAt: new Date(2026, 8, 20, 10, 0).toISOString(), id: "last-month", storeName: "Walmart", totalAmount: null },
    ]);
    render(<FinanceDashboard />);
    const page = createPurchaseHistoryPage();

    expect(await page.findText("Tienes 2 compras sin total desde hace más de 24 horas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Completarlas" })).toHaveAttribute("href", "/finanzas/historial#compras-sin-total");
    expect(page.getAllEditButtons()).toHaveLength(0);
    expect(screen.queryByRole("region", { name: FINANCE_TEXT.PENDING_SECTION_TITLE })).not.toBeInTheDocument();
  });
});

describe("FinanceDashboard: spending by store (SCRUM-72)", () => {
  // Normaliza el espacio de miles de Intl para comparar el texto de cada fila.
  const toPlainSpaces = (texts: (string | null)[]) => texts.map((text) => text?.replace(/\s/gu, " "));

  it("lists the week's stores from the highest to the lowest amount, with «Sin total» last (CA-01, CA-02, D46)", async () => {
    render(<FinanceDashboard />);
    const page = createSpendingByStorePage();

    await page.findSection();

    expect(toPlainSpaces(page.getRowTexts())).toEqual([
      "MaxiPali₡10 000",
      "MasXMenos₡5 000",
      `Walmart1 sin total${FINANCE_TEXT.WITHOUT_TOTAL}`,
    ]);
    expect(page.querySectionText(FINANCE_TEXT.ADJUSTMENT)).not.toBeInTheDocument();
  });

  it("comes from the same purchases as the total (rule 107)", async () => {
    render(<FinanceDashboard />);
    const dashboard = createFinanceDashboardPage();

    expect(await dashboard.findTotalText(amount("₡15 000"))).toBeInTheDocument();
    expect(createSpendingByStorePage().getRows()).toHaveLength(3);
    expect(purchasesMock).toHaveBeenCalledTimes(1);
  });

  it("recalculates the breakdown when the period changes (rule 116)", async () => {
    render(<FinanceDashboard />);
    const dashboard = createFinanceDashboardPage();
    const page = createSpendingByStorePage();
    await page.findSection();

    await dashboard.choosePeriod("Día");

    await waitFor(() => expect(toPlainSpaces(page.getRowTexts())).toEqual(["MaxiPali₡10 000"]));
  });

  it("is not shown while the spending loads (rule 115)", async () => {
    purchasesMock.mockReturnValue(new Promise(() => {}));
    render(<FinanceDashboard />);
    await createFinanceDashboardPage().findPeriodGroup();

    expect(createSpendingByStorePage().querySection()).not.toBeInTheDocument();
  });

  it("is not shown when the spending fails; the error is only in the total (rule 115)", async () => {
    purchasesMock.mockRejectedValue(new Error("network"));
    render(<FinanceDashboard />);
    const dashboard = createFinanceDashboardPage();

    expect(await dashboard.findText(FINANCE_TEXT.SPENDING_LOAD_ERROR)).toBeInTheDocument();
    expect(createSpendingByStorePage().querySection()).not.toBeInTheDocument();
  });

  it("is not shown in a period without purchases (D48)", async () => {
    purchasesMock.mockResolvedValue([]);
    render(<FinanceDashboard />);
    const dashboard = createFinanceDashboardPage();

    expect(await dashboard.findText(FINANCE_TEXT.SPENDING_EMPTY)).toBeInTheDocument();
    expect(createSpendingByStorePage().querySection()).not.toBeInTheDocument();
  });

  it("is not shown without a registered account, and nothing is requested (D6)", async () => {
    sessionMock.mockResolvedValue(false);
    render(<FinanceDashboard />);

    expect(await createFinanceDashboardPage().findNoAccountNotice()).toBeInTheDocument();
    expect(createSpendingByStorePage().querySection()).not.toBeInTheDocument();
    expect(purchasesMock).not.toHaveBeenCalled();
    expect(financeMock).not.toHaveBeenCalled();
  });

  describe("with a saved time zone (one read, get_period_finance)", () => {
    const zonedWeek = (overrides: Partial<ZonedPeriodFinance>): ZonedPeriodFinance => ({
      adjustments: [],
      bounds: { end: new Date(2026, 9, 19), start: new Date(2026, 9, 12) },
      purchases: [],
      spending: { adjustmentCount: 0, closedCount: 0, total: 0, withoutTotalCount: 0 },
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...overrides,
    });
    const adjustment = (id: string, amountValue: number, scope: ZonedPeriodFinance["adjustments"][number]["scope"]) => ({
      amount: amountValue,
      effectiveAt: NOW.toISOString(),
      id,
      scope,
    });

    it("orders «Supermercado no disponible» by its amount and after a named store in a tie (D49)", async () => {
      financeMock.mockResolvedValue(
        zonedWeek({
          purchases: [
            purchase("a", "MasXMenos", 3000),
            purchase("b", null, 8000),
            purchase("c", "MaxiPali", 8000),
            purchase("d", "MaxiPali", null),
            purchase("e", "Walmart", 12000),
          ],
          spending: { adjustmentCount: 0, closedCount: 4, total: 31000, withoutTotalCount: 1 },
        }),
      );
      render(<FinanceDashboard />);
      const page = createSpendingByStorePage();

      await page.findSection();

      expect(toPlainSpaces(page.getRowTexts())).toEqual([
        "Walmart₡12 000",
        "MaxiPali1 sin total₡8 000",
        `${FINANCE_TEXT.STORE_UNAVAILABLE}₡8 000`,
        "MasXMenos₡3 000",
      ]);
    });

    it("shows one adjustment as «Ajuste manual» with its sign, outside the list (D45, D50)", async () => {
      financeMock.mockResolvedValue(
        zonedWeek({
          adjustments: [adjustment("day", 500, SPENDING_PERIOD.DAY)],
          purchases: [purchase("a", "MaxiPali", 10000)],
          spending: { adjustmentCount: 1, closedCount: 1, total: 10500, withoutTotalCount: 0 },
        }),
      );
      render(<FinanceDashboard />);
      const page = createSpendingByStorePage();

      await page.findSection();

      expect(page.querySectionText(FINANCE_TEXT.ADJUSTMENT)).toBeInTheDocument();
      expect(page.querySectionText(amount("\\+₡500"))).toBeInTheDocument();
      expect(page.queryListText(FINANCE_TEXT.ADJUSTMENT)).not.toBeInTheDocument();
      expect(page.getRows()).toHaveLength(1);
    });

    it("shows two or more adjustments as «Ajustes manuales» with their sum (D50)", async () => {
      financeMock.mockResolvedValue(
        zonedWeek({
          adjustments: [adjustment("day", 500, SPENDING_PERIOD.DAY), adjustment("week", -2000, SPENDING_PERIOD.WEEK)],
          purchases: [purchase("a", "MaxiPali", 10000)],
          spending: { adjustmentCount: 2, closedCount: 1, total: 8500, withoutTotalCount: 0 },
        }),
      );
      render(<FinanceDashboard />);
      const page = createSpendingByStorePage();

      await page.findSection();

      expect(page.querySectionText(FINANCE_TEXT.ADJUSTMENTS)).toBeInTheDocument();
      expect(page.querySectionText(amount("−₡1 500"))).toBeInTheDocument();
      expect(page.querySectionText(FINANCE_TEXT.ADJUSTMENT)).not.toBeInTheDocument();
    });

    it("is not shown in a period with only adjustments, while the total shows them (D48)", async () => {
      financeMock.mockResolvedValue(
        zonedWeek({
          adjustments: [adjustment("week", 8000, SPENDING_PERIOD.WEEK)],
          spending: { adjustmentCount: 1, closedCount: 0, total: 8000, withoutTotalCount: 0 },
        }),
      );
      render(<FinanceDashboard />);
      const dashboard = createFinanceDashboardPage();

      expect(await dashboard.findTotalText(amount("₡8 000"))).toBeInTheDocument();
      expect(dashboard.queryText(FINANCE_TEXT.INCLUDES_ADJUSTMENTS)).toBeInTheDocument();
      expect(createSpendingByStorePage().querySection()).not.toBeInTheDocument();
    });
  });
});
