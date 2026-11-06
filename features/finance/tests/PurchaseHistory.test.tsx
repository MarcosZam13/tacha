// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPriceDisclaimerPage } from "@/components/price-disclaimer/tests/PriceDisclaimer.page";
import { APP_ROUTE } from "@/constants";
import { PurchaseHistory } from "../PurchaseHistory";
import { FINANCE_TEXT } from "../constants/finance.constants";
import type { PeriodBounds } from "../models/PeriodBounds.interface";
import type { ZonedPeriodFinance } from "../models/PeriodFinance.type";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import {
  getPeriodFinance,
  getPeriodPurchases,
  hasRegisteredSession,
  setPeriodTotal,
  setPurchaseTotal,
} from "../services/finance.service";
import { createPurchaseHistoryPage } from "./PurchaseHistory.page";

// La pantalla con el servicio falso: sin Supabase ni sesión real.
vi.mock("../services/finance.service", () => ({
  getPeriodFinance: vi.fn(),
  getPeriodPurchases: vi.fn(),
  hasRegisteredSession: vi.fn(),
  setPeriodTotal: vi.fn(),
  setPurchaseTotal: vi.fn(),
  setSpendingTimeZone: vi.fn(),
}));
const sessionMock = vi.mocked(hasRegisteredSession);
const purchasesMock = vi.mocked(getPeriodPurchases);
const financeMock = vi.mocked(getPeriodFinance);
const purchaseSaveMock = vi.mocked(setPurchaseTotal);
const periodSaveMock = vi.mocked(setPeriodTotal);

// Domingo 18 de octubre de 2026, 15:00 en hora local.
const NOW = new Date(2026, 9, 18, 15, 0);
const DAY_START = new Date(2026, 9, 18).getTime();

// Intl separa los miles con un espacio especial: se normaliza para comparar.
const toPlainSpaces = (text: string | null): string => text?.replace(/\s/gu, " ") ?? "";

// Intl también en los montos sueltos: se buscan con cualquier espacio.
const amount = (text: string): RegExp => new RegExp(`^${text.replace(/ /gu, "\\s")}$`, "u");

const SUNDAY_PURCHASE: PeriodPurchase = {
  closedAt: new Date(2026, 9, 18, 10, 0).toISOString(),
  id: "sunday",
  storeName: "MaxiPali",
  totalAmount: 10000,
};
const WEDNESDAY_PURCHASE: PeriodPurchase = {
  closedAt: new Date(2026, 9, 14, 10, 0).toISOString(),
  id: "wednesday",
  storeName: "Walmart",
  totalAmount: null,
};
const MONDAY_PURCHASE: PeriodPurchase = {
  closedAt: new Date(2026, 9, 12, 10, 0).toISOString(),
  id: "monday",
  storeName: "MasXMenos",
  totalAmount: 5000,
};
const WEEK_PURCHASES = [SUNDAY_PURCHASE, WEDNESDAY_PURCHASE, MONDAY_PURCHASE];

// El día pide desde hoy; lo demás, la semana.
const purchasesByPeriod = async ({ start }: PeriodBounds) =>
  start.getTime() === DAY_START ? [SUNDAY_PURCHASE] : WEEK_PURCHASES;

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  // Sin zona guardada: se lee como antes, con el navegador (SPEC regla 59).
  financeMock.mockResolvedValue({ timeZone: null });
  sessionMock.mockResolvedValue(true);
  purchasesMock.mockImplementation(purchasesByPeriod);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("PurchaseHistory: access (D6)", () => {
  it("asks to sign in, without tabs, notice or queries, without a registered account", async () => {
    sessionMock.mockResolvedValue(false);
    render(<PurchaseHistory />);
    const page = createPurchaseHistoryPage();

    expect(await page.findNoAccountNotice()).toBeInTheDocument();
    expect(page.getTitle()).toBeInTheDocument();
    expect(page.getLoginLink()).toHaveAttribute("href", "/login");
    expect(page.queryTabsNavigation()).not.toBeInTheDocument();
    expect(page.queryPeriodGroup()).not.toBeInTheDocument();
    expect(page.queryPurchaseList()).not.toBeInTheDocument();
    expect(createPriceDisclaimerPage().queryAllDisclaimers()).toHaveLength(0);
    expect(purchasesMock).not.toHaveBeenCalled();
  });

  it("keeps the status region mounted from the start", async () => {
    render(<PurchaseHistory />);
    const page = createPurchaseHistoryPage();

    expect(page.getStatusRegion()).toBeInTheDocument();
    expect(page.getStatusRegion()).toBeEmptyDOMElement();
    await page.findPurchaseList();
  });
});

describe("PurchaseHistory: list (CA-01)", () => {
  it("marks Historial as the current tab and links both tabs", async () => {
    render(<PurchaseHistory />);
    const page = createPurchaseHistoryPage();

    await page.findTabsNavigation();

    expect(page.getHistoryTab()).toHaveAttribute("aria-current", "page");
    expect(page.getHistoryTab()).toHaveAttribute("href", APP_ROUTE.FINANCE_HISTORY);
    expect(page.getDashboardTab()).not.toHaveAttribute("aria-current");
    expect(page.getDashboardTab()).toHaveAttribute("href", APP_ROUTE.FINANCE);
    await page.findPurchaseList();
  });

  it("shows each purchase with its date, store and amount, in the order of the service", async () => {
    render(<PurchaseHistory />);
    const page = createPurchaseHistoryPage();

    const rows = await page.findPurchaseRows();

    expect(rows.map((row) => toPlainSpaces(row.textContent))).toEqual([
      "Domingo 18 de octubreMaxiPali₡10 000",
      "Miércoles 14 de octubreWalmartSin total",
      "Lunes 12 de octubreMasXMenos₡5 000",
    ]);
  });

  it("shows ₡0 for a real zero and «Sin total» for a null total, apart (D8)", async () => {
    purchasesMock.mockResolvedValue([{ ...SUNDAY_PURCHASE, totalAmount: 0 }, WEDNESDAY_PURCHASE]);
    render(<PurchaseHistory />);
    const page = createPurchaseHistoryPage();

    const [zeroRow, withoutTotalRow] = await page.findPurchaseRows();

    expect(zeroRow).toHaveTextContent("₡0");
    expect(withoutTotalRow).toHaveTextContent(FINANCE_TEXT.WITHOUT_TOTAL);
    expect(withoutTotalRow).not.toHaveTextContent("₡0");
  });

  it("keeps a row without a store name, with its amount in the total (rule 29)", async () => {
    purchasesMock.mockResolvedValue([{ ...SUNDAY_PURCHASE, storeName: null }]);
    render(<PurchaseHistory />);
    const page = createPurchaseHistoryPage();

    const [row] = await page.findPurchaseRows();

    expect(row).toHaveTextContent(FINANCE_TEXT.STORE_UNAVAILABLE);
    expect(toPlainSpaces(row.textContent)).toContain("₡10 000");
    expect(toPlainSpaces(page.getStatusRegion()?.textContent ?? null)).toBe("Gastado esta semana: ₡10 000");
  });
});

describe("PurchaseHistory: period (CA-02)", () => {
  it("starts on Semana with the total highlighted and its dates", async () => {
    render(<PurchaseHistory />);
    const page = createPurchaseHistoryPage();

    await page.findPurchaseList();

    expect(page.getPeriodButton("Semana")).toHaveAttribute("aria-pressed", "true");
    expect(await page.findText("Gastado esta semana")).toBeInTheDocument();
    expect(await page.findText(amount("₡15 000"))).toBeInTheDocument();
    expect(await page.findText("Lunes 12 a domingo 18 de octubre")).toBeInTheDocument();
  });

  it("filters the list and changes the total without leaving the screen", async () => {
    render(<PurchaseHistory />);
    const page = createPurchaseHistoryPage();
    await page.findPurchaseList();

    await page.choosePeriod("Día");

    await waitFor(async () => expect(await page.findPurchaseRows()).toHaveLength(1));
    expect(page.getPeriodButton("Día")).toHaveAttribute("aria-pressed", "true");
    expect(await page.findText("Gastado hoy")).toBeInTheDocument();
    expect(toPlainSpaces(page.getStatusRegion()?.textContent ?? null)).toBe("Gastado hoy: ₡10 000");
  });
});

describe("PurchaseHistory: states and price notice (§6)", () => {
  it("shows the notice once and no list while loading", async () => {
    purchasesMock.mockReturnValue(new Promise(() => undefined));
    render(<PurchaseHistory />);
    const page = createPurchaseHistoryPage();

    await page.findPeriodGroup();

    expect(createPriceDisclaimerPage().queryAllDisclaimers()).toHaveLength(1);
    expect(page.queryPurchaseList()).not.toBeInTheDocument();
  });

  it("shows the notice once between the total and the list when ready", async () => {
    render(<PurchaseHistory />);
    const page = createPurchaseHistoryPage();

    const list = await page.findPurchaseList();
    const total = await page.findText(amount("₡15 000"));
    const disclaimerPage = createPriceDisclaimerPage();

    expect(disclaimerPage.queryAllDisclaimers()).toHaveLength(1);
    const disclaimer = disclaimerPage.getDisclaimer();
    expect(total.compareDocumentPosition(disclaimer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(disclaimer.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows ₡0, the empty message and the notice, without a list, when there are no purchases", async () => {
    purchasesMock.mockResolvedValue([]);
    render(<PurchaseHistory />);
    const page = createPurchaseHistoryPage();

    expect(await page.findText(FINANCE_TEXT.SPENDING_EMPTY)).toBeInTheDocument();
    expect(await page.findText("₡0")).toBeInTheDocument();
    expect(page.queryPurchaseList()).not.toBeInTheDocument();
    expect(page.queryAlert()).not.toBeInTheDocument();
    expect(createPriceDisclaimerPage().queryAllDisclaimers()).toHaveLength(1);
  });

  it("shows the error and the notice without a list, and loads again on retry", async () => {
    purchasesMock.mockRejectedValueOnce(new Error("incomplete"));
    render(<PurchaseHistory />);
    const page = createPurchaseHistoryPage();

    expect(await page.findText(FINANCE_TEXT.SPENDING_LOAD_ERROR)).toBeInTheDocument();
    expect(page.getAlert()).toHaveTextContent(FINANCE_TEXT.SPENDING_LOAD_ERROR);
    expect(page.queryPurchaseList()).not.toBeInTheDocument();
    expect(createPriceDisclaimerPage().queryAllDisclaimers()).toHaveLength(1);

    await page.retry();

    expect(await page.findPurchaseRows()).toHaveLength(3);
    expect(page.queryAlert()).not.toBeInTheDocument();
  });

  it("goes to the notice to sign in when the session expired before retrying", async () => {
    purchasesMock.mockRejectedValueOnce(new Error("401"));
    render(<PurchaseHistory />);
    const page = createPurchaseHistoryPage();
    await page.findText(FINANCE_TEXT.SPENDING_LOAD_ERROR);
    sessionMock.mockResolvedValue(false);

    await page.retry();

    expect(await page.findNoAccountNotice()).toBeInTheDocument();
    expect(purchasesMock).toHaveBeenCalledTimes(1);
    expect(createPriceDisclaimerPage().queryAllDisclaimers()).toHaveLength(0);
  });
});

describe("PurchaseHistory: editing totals (SCRUM-91)", () => {
  const SUNDAY_PENCIL = "Editar total del domingo 18 de octubre, MaxiPali";
  const WEDNESDAY_PENCIL = "Editar total del miércoles 14 de octubre, Walmart";
  const WEEK_PENCIL = "Editar total de esta semana";
  const PURCHASE_INPUT = FINANCE_TEXT.PURCHASE_TOTAL_INPUT_LABEL;
  const WEEK_INPUT = "Total de esta semana (₡)";

  // Con la zona del navegador guardada: las fechas son las mismas de siempre.
  const ZONED_WEEK: ZonedPeriodFinance = {
    adjustments: [],
    bounds: { end: new Date(2026, 9, 19), start: new Date(2026, 9, 12) },
    purchases: WEEK_PURCHASES,
    spending: { adjustmentCount: 0, closedCount: 2, total: 15000, withoutTotalCount: 1 },
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  const renderLoaded = async () => {
    financeMock.mockResolvedValue(ZONED_WEEK);
    render(<PurchaseHistory />);
    const page = createPurchaseHistoryPage();
    await page.findEditButton(SUNDAY_PENCIL);
    return page;
  };

  it("gives every purchase and the period total a pencil (CA-01, CA-02, D12)", async () => {
    const page = await renderLoaded();

    expect(page.getEditButton(SUNDAY_PENCIL)).toBeEnabled();
    expect(page.getEditButton(WEDNESDAY_PENCIL)).toBeEnabled();
    expect(page.getEditButton(WEEK_PENCIL)).toBeEnabled();
  });

  it("opens the field with the amount and the focus, and cancels back to the pencil", async () => {
    const page = await renderLoaded();

    await page.openEdit(SUNDAY_PENCIL);
    expect(page.getTotalInput(PURCHASE_INPUT)).toHaveValue("10000");
    expect(page.getTotalInput(PURCHASE_INPUT)).toHaveFocus();

    await page.cancel();
    expect(page.queryTotalInput(PURCHASE_INPUT)).not.toBeInTheDocument();
    expect(page.getEditButton(SUNDAY_PENCIL)).toHaveFocus();
  });

  it("opens a «Sin total» purchase empty and closes it with Escape", async () => {
    const page = await renderLoaded();

    await page.openEdit(WEDNESDAY_PENCIL);
    expect(page.getTotalInput(PURCHASE_INPUT)).toHaveValue("");

    await page.pressKey("{Escape}");
    expect(page.queryTotalInput(PURCHASE_INPUT)).not.toBeInTheDocument();
    expect(page.getEditButton(WEDNESDAY_PENCIL)).toHaveFocus();
  });

  it("keeps a single field open: opening another pencil closes the first (D21)", async () => {
    const page = await renderLoaded();

    await page.openEdit(SUNDAY_PENCIL);
    await page.openEdit(WEEK_PENCIL);

    expect(page.getAllTotalInputs()).toHaveLength(1);
    expect(page.getTotalInput(WEEK_INPUT)).toHaveFocus();
  });

  it("shows the validation error without calling the database (D13)", async () => {
    const page = await renderLoaded();

    await page.openEdit(SUNDAY_PENCIL);
    await page.replaceTotal(PURCHASE_INPUT, "12.5");
    await page.save();

    expect(page.getTotalInput(PURCHASE_INPUT)).toHaveAccessibleDescription(FINANCE_TEXT.TOTAL_INVALID);
    expect(purchaseSaveMock).not.toHaveBeenCalled();
  });

  it("saves a purchase, shows its new amount and total, and announces it", async () => {
    purchaseSaveMock.mockResolvedValue({ closedAt: SUNDAY_PURCHASE.closedAt, id: "sunday", totalAmount: 12000 });
    const page = await renderLoaded();

    await page.openEdit(SUNDAY_PENCIL);
    await page.replaceTotal(PURCHASE_INPUT, "12000");
    await page.save();

    await waitFor(() => expect(page.queryTotalInput(PURCHASE_INPUT)).not.toBeInTheDocument());
    expect(purchaseSaveMock).toHaveBeenCalledWith({ purchaseId: "sunday", total: 12000 });
    expect(page.queryText(amount("₡12 000"))).toBeInTheDocument();
    expect(page.queryText(amount("₡17 000"))).toBeInTheDocument();
    expect(toPlainSpaces(page.getStatusRegion()?.textContent ?? null)).toBe(
      "Total guardado. Gastado esta semana: ₡17 000",
    );
    expect(page.getEditButton(SUNDAY_PENCIL)).toHaveFocus();
  });

  it("disables the field and every pencil while saving (D21, rule 56)", async () => {
    purchaseSaveMock.mockReturnValue(new Promise(() => undefined));
    const page = await renderLoaded();

    await page.openEdit(SUNDAY_PENCIL);
    await page.save();

    await waitFor(() => expect(page.getSavingButton()).toBeDisabled());
    expect(page.getTotalInput(PURCHASE_INPUT)).toBeDisabled();
    expect(page.getEditButton(WEDNESDAY_PENCIL)).toBeDisabled();
    expect(page.getEditButton(WEEK_PENCIL)).toBeDisabled();
  });

  it("announces a save error and keeps what was written", async () => {
    purchaseSaveMock.mockRejectedValue(new Error("network"));
    const page = await renderLoaded();

    await page.openEdit(SUNDAY_PENCIL);
    await page.replaceTotal(PURCHASE_INPUT, "12000");
    await page.save();

    expect(await page.findText("No se pudo guardar el total. Intenta de nuevo.")).toHaveAttribute("role", "alert");
    expect(page.getTotalInput(PURCHASE_INPUT)).toHaveValue("12000");
    expect(page.getTotalInput(PURCHASE_INPUT)).toHaveFocus();
  });

  it("saves the period total and shows it", async () => {
    periodSaveMock.mockResolvedValue({
      adjustment: { amount: 5000, effectiveAt: NOW.toISOString(), id: "adjustment-1", scope: "week" },
    });
    const page = await renderLoaded();

    await page.openEdit(WEEK_PENCIL);
    expect(page.getTotalInput(WEEK_INPUT)).toHaveValue("15000");
    await page.replaceTotal(WEEK_INPUT, "20000");
    await page.save();

    await waitFor(() => expect(page.queryTotalInput(WEEK_INPUT)).not.toBeInTheDocument());
    expect(periodSaveMock).toHaveBeenCalledWith({ period: "week", total: 20000 });
    expect(page.queryText(amount("₡20 000"))).toBeInTheDocument();
    expect(page.getEditButton(WEEK_PENCIL)).toHaveFocus();
  });
});