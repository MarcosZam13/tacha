// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPriceDisclaimerPage } from "@/components/price-disclaimer/tests/PriceDisclaimer.page";
import { APP_ROUTE } from "@/constants";
import { PurchaseHistory } from "../PurchaseHistory";
import { FINANCE_TEXT } from "../constants/finance.constants";
import type { PeriodBounds } from "../models/PeriodBounds.interface";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import { getPeriodPurchases, hasRegisteredSession } from "../services/finance.service";
import { createPurchaseHistoryPage } from "./PurchaseHistory.page";

// La pantalla con el servicio falso: sin Supabase ni sesión real.
vi.mock("../services/finance.service", () => ({
  getPeriodPurchases: vi.fn(),
  hasRegisteredSession: vi.fn(),
}));
const sessionMock = vi.mocked(hasRegisteredSession);
const purchasesMock = vi.mocked(getPeriodPurchases);

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
