// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SpendingByStore } from "../components/SpendingByStore";
import type {
  SpendingByStoreProps,
  StoreSpendingRowProps,
} from "../components/models/SpendingByStoreProps.interface";
import { FINANCE_TEXT } from "../constants/finance.constants";
import { createSpendingByStorePage } from "./SpendingByStore.page";

// Los textos llegan armados del ViewModel; el componente solo los dibuja.
const createRow = (overrides: Partial<StoreSpendingRowProps> = {}): StoreSpendingRowProps => ({
  amountText: "₡12 000",
  hasNoTotal: false,
  id: "Walmart",
  storeText: "Walmart",
  withoutTotalText: null,
  ...overrides,
});

const createProps = (overrides: Partial<SpendingByStoreProps> = {}): SpendingByStoreProps => ({
  adjustment: null,
  rows: [
    createRow(),
    createRow({ amountText: "₡8 000", id: "MaxiPali", storeText: "MaxiPali", withoutTotalText: "1 sin total" }),
    createRow({ amountText: "₡8 000", id: "", storeText: FINANCE_TEXT.STORE_UNAVAILABLE }),
    createRow({ amountText: FINANCE_TEXT.WITHOUT_TOTAL, hasNoTotal: true, id: "MasXMenos", storeText: "MasXMenos", withoutTotalText: "2 sin total" }),
  ],
  ...overrides,
});

afterEach(() => {
  cleanup();
});

describe("SpendingByStore (SCRUM-72)", () => {
  it("is a section named by its title (SPEC §9)", () => {
    render(<SpendingByStore {...createProps()} />);
    const page = createSpendingByStorePage();

    expect(page.getSection()).toBeInTheDocument();
    expect(page.getTitle()).toBeInTheDocument();
  });

  it("shows one list item per store, in the order it receives (CA-01, CA-02)", () => {
    render(<SpendingByStore {...createProps()} />);
    const page = createSpendingByStorePage();

    expect(page.getRows()).toHaveLength(4);
    expect(page.getRowTexts()).toEqual([
      "Walmart₡12 000",
      "MaxiPali1 sin total₡8 000",
      `${FINANCE_TEXT.STORE_UNAVAILABLE}₡8 000`,
      `MasXMenos2 sin total${FINANCE_TEXT.WITHOUT_TOTAL}`,
    ]);
  });

  it("shows how many purchases without a total a store has, only when it has some (D47)", () => {
    render(<SpendingByStore {...createProps()} />);
    const page = createSpendingByStorePage();
    const [walmart, maxiPali] = page.getRows();

    expect(page.getRowText(maxiPali, "1 sin total")).toBeInTheDocument();
    expect(walmart).not.toHaveTextContent("sin total");
  });

  it("shows «Sin total» as a badge for a store with only purchases without a total (D46, D27)", () => {
    render(<SpendingByStore {...createProps()} />);
    const page = createSpendingByStorePage();

    const badge = page.getRowText(page.getRows()[3], FINANCE_TEXT.WITHOUT_TOTAL);
    expect(badge).toHaveClass("text-tacha-terracotta-text", "bg-tacha-terracotta/10");
    expect(badge.className).not.toMatch(/danger|red-/u);
    expect(badge).not.toHaveAttribute("role", "alert");
  });

  it("shows a real ₡0 as an amount, not as a badge (D8)", () => {
    render(<SpendingByStore {...createProps({ rows: [createRow({ amountText: "₡0" })] })} />);
    const page = createSpendingByStorePage();

    const amount = page.getRowText(page.getRows()[0], "₡0");
    expect(amount).not.toHaveClass("text-tacha-terracotta-text");
    expect(amount.tagName).toBe("P");
  });

  it("shows the adjustment outside the list, with its label and sign (D45)", () => {
    render(<SpendingByStore {...createProps({ adjustment: { amountText: "+₡500", labelText: FINANCE_TEXT.ADJUSTMENT } })} />);
    const page = createSpendingByStorePage();

    expect(page.querySectionText(FINANCE_TEXT.ADJUSTMENT)).toBeInTheDocument();
    expect(page.querySectionText("+₡500")).toBeInTheDocument();
    expect(page.queryListText(FINANCE_TEXT.ADJUSTMENT)).not.toBeInTheDocument();
    expect(page.getRows()).toHaveLength(4);
  });

  it("shows the plural label it receives for two or more adjustments (D50)", () => {
    render(<SpendingByStore {...createProps({ adjustment: { amountText: "−₡1 500", labelText: FINANCE_TEXT.ADJUSTMENTS } })} />);
    const page = createSpendingByStorePage();

    expect(page.querySectionText(FINANCE_TEXT.ADJUSTMENTS)).toBeInTheDocument();
    expect(page.querySectionText(FINANCE_TEXT.ADJUSTMENT)).not.toBeInTheDocument();
  });

  it("shows no adjustment line without adjustments", () => {
    render(<SpendingByStore {...createProps()} />);
    const page = createSpendingByStorePage();

    expect(page.querySectionText(FINANCE_TEXT.ADJUSTMENT)).not.toBeInTheDocument();
    expect(page.querySectionText(FINANCE_TEXT.ADJUSTMENTS)).not.toBeInTheDocument();
  });

  it("has no pencils nor links: it is read-only (D11, rule 117)", () => {
    render(<SpendingByStore {...createProps({ adjustment: { amountText: "+₡500", labelText: FINANCE_TEXT.ADJUSTMENT } })} />);
    const page = createSpendingByStorePage();

    expect(page.queryLinksAndButtons()).toHaveLength(0);
  });
});
