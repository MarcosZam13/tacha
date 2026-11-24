// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTE } from "@/constants";
import { ProductPurchaseHistory } from "../ProductPurchaseHistory";
import { FINANCE_TEXT, PRODUCT_HISTORY, PRODUCT_HISTORY_TEXT, PRODUCT_TARGET_KIND } from "../constants/finance.constants";
import type { ProductPurchase } from "../models/ProductPurchase.interface";
import type { PurchasedProduct } from "../models/PurchasedProduct.interface";
import type { PurchasedProductsPage } from "../models/PurchasedProductsPage.interface";
import {
  getProductPurchases,
  getPurchasedProducts,
  getSavedTimeZone,
  hasRegisteredSession,
} from "../services/finance.service";
import { createProductPurchaseHistoryPage } from "./ProductPurchaseHistory.page";

vi.mock("../services/finance.service", () => ({
  getProductPurchases: vi.fn(),
  getPurchasedProducts: vi.fn(),
  getSavedTimeZone: vi.fn(),
  hasRegisteredSession: vi.fn(),
}));
const sessionMock = vi.mocked(hasRegisteredSession);
const productsMock = vi.mocked(getPurchasedProducts);
const purchasesMock = vi.mocked(getProductPurchases);
const timeZoneMock = vi.mocked(getSavedTimeZone);

// El vacío se ve y además se anuncia en role="status": se busca el texto visible.
const VISIBLE_TEXT = { selector: "p:not([aria-live])" };

// Intl separa los miles con un espacio especial: se normaliza para comparar.
const toPlainSpaces = (text: string | null): string => text?.replace(/\s/gu, " ") ?? "";

const named = (productKey: string, name: string, appearanceCount: number): PurchasedProduct => ({
  appearanceCount,
  lastPurchasedAt: "2026-10-18T21:00:00+00:00",
  name,
  target: { kind: PRODUCT_TARGET_KIND.BY_NAME, productKey },
});
const MILK = named("leche", "Leche", 4);
const RICE = named("arroz", "Arroz", 1);
const UNAVAILABLE: PurchasedProduct = {
  appearanceCount: 1,
  lastPurchasedAt: "2026-10-14T15:00:00+00:00",
  name: null,
  target: { kind: PRODUCT_TARGET_KIND.UNAVAILABLE, variantId: "variant-1" },
};
const page = (products: PurchasedProduct[], totalCount = products.length): PurchasedProductsPage => ({
  products,
  totalCount,
});

// Tres compras de Leche que suman sus 4 apariciones (regla 89).
const MILK_PURCHASES: ProductPurchase[] = [
  {
    appearanceCount: 2,
    closedAt: "2026-10-18T21:00:00+00:00",
    id: "p3",
    storeName: "MaxiPali",
    totalAmount: 15000,
    variantNames: ["1 L", "2 L"],
  },
  {
    appearanceCount: 1,
    closedAt: "2026-10-14T15:00:00+00:00",
    id: "p2",
    storeName: "Walmart",
    totalAmount: null,
    variantNames: ["1 L"],
  },
  { appearanceCount: 1, closedAt: "2026-10-12T15:00:00+00:00", id: "p1", storeName: null, totalAmount: 0, variantNames: [] },
];

beforeEach(() => {
  vi.resetAllMocks();
  sessionMock.mockResolvedValue(true);
  productsMock.mockResolvedValue(page([MILK, RICE, UNAVAILABLE]));
  purchasesMock.mockResolvedValue(MILK_PURCHASES);
  timeZoneMock.mockResolvedValue("America/Costa_Rica");
});

afterEach(cleanup);

describe("ProductPurchaseHistory: access (D6, rule 91)", () => {
  it("asks to sign in and asks nothing without a registered account", async () => {
    sessionMock.mockResolvedValue(false);
    render(<ProductPurchaseHistory />);
    const view = createProductPurchaseHistoryPage();

    expect(await view.findNoAccountNotice()).toBeInTheDocument();
    expect(view.queryViewSwitch()).not.toBeInTheDocument();
    expect(view.queryProductList()).not.toBeInTheDocument();
    expect(productsMock).not.toHaveBeenCalled();
    expect(purchasesMock).not.toHaveBeenCalled();
  });
});

describe("ProductPurchaseHistory: list (CA-01)", () => {
  it("shows the selector with Productos active and Historial still active in the tabs (D31)", async () => {
    render(<ProductPurchaseHistory />);
    const view = createProductPurchaseHistoryPage();

    await view.findViewSwitch();
    expect(view.getProductsViewLink()).toHaveAttribute("aria-current", "page");
    expect(view.getProductsViewLink()).toHaveAttribute("href", APP_ROUTE.FINANCE_HISTORY_PRODUCTS);
    expect(view.getPurchasesViewLink()).not.toHaveAttribute("aria-current");
    expect(view.getPurchasesViewLink()).toHaveAttribute("href", APP_ROUTE.FINANCE_HISTORY);
    expect(screen.getByRole("link", { name: "Historial" })).toHaveAttribute("aria-current", "page");
  });

  it("shows each product with its times, in the order received, as a button with its full name", async () => {
    render(<ProductPurchaseHistory />);
    const view = createProductPurchaseHistoryPage();

    await view.findProductList();
    expect(view.getProductButtons().map((button) => button.getAttribute("aria-label"))).toEqual([
      "Leche, 4 veces",
      "Arroz, 1 vez",
      "Producto no disponible, 1 vez",
    ]);
    expect(view.getProductButton("Leche, 4 veces")).toHaveAttribute("aria-expanded", "false");
    expect(productsMock).toHaveBeenCalledWith({ offset: 0, search: "" });
  });

  it("announces how many products there are without moving the focus (SPEC §9)", async () => {
    render(<ProductPurchaseHistory />);
    const view = createProductPurchaseHistoryPage();

    await view.findProductList();
    expect(view.getStatusRegion()).toHaveTextContent("3 productos");
  });

  it("shows the empty message without products", async () => {
    productsMock.mockResolvedValue(page([]));
    render(<ProductPurchaseHistory />);

    expect(await screen.findByText(PRODUCT_HISTORY_TEXT.EMPTY, VISIBLE_TEXT)).toBeInTheDocument();
  });

  it("shows the error with Retry when the first block fails, and retries it", async () => {
    productsMock.mockRejectedValueOnce(new Error("red"));
    render(<ProductPurchaseHistory />);
    const view = createProductPurchaseHistoryPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(PRODUCT_HISTORY_TEXT.LOAD_ERROR);
    expect(view.queryProductList()).not.toBeInTheDocument();
    await view.retry();

    expect(await view.findProductList()).toBeInTheDocument();
    expect(productsMock).toHaveBeenCalledTimes(2);
  });

  it("goes to No account when the session expired before retrying (SPEC §7)", async () => {
    productsMock.mockRejectedValueOnce(new Error("401"));
    render(<ProductPurchaseHistory />);
    const view = createProductPurchaseHistoryPage();
    await screen.findByRole("alert");

    sessionMock.mockResolvedValue(false);
    await view.retry();

    expect(await view.findNoAccountNotice()).toBeInTheDocument();
    expect(productsMock).toHaveBeenCalledTimes(1);
  });
});

describe("ProductPurchaseHistory: Load more (D35, rule 94)", () => {
  const firstBlock = Array.from({ length: PRODUCT_HISTORY.PAGE_SIZE }, (_, index) =>
    named(`producto ${index}`, `Producto ${index}`, 1),
  );

  it("adds the next block without repeats, hides the button at the end and focuses the first new product", async () => {
    productsMock
      .mockResolvedValueOnce(page(firstBlock, PRODUCT_HISTORY.PAGE_SIZE + 2))
      .mockResolvedValueOnce(page([firstBlock[0], RICE], PRODUCT_HISTORY.PAGE_SIZE + 2));
    render(<ProductPurchaseHistory />);
    const view = createProductPurchaseHistoryPage();

    await view.loadMore();

    await waitFor(() => expect(view.queryLoadMoreButton()).not.toBeInTheDocument());
    expect(productsMock).toHaveBeenLastCalledWith({ offset: PRODUCT_HISTORY.PAGE_SIZE, search: "" });
    expect(view.getProductButtons()).toHaveLength(PRODUCT_HISTORY.PAGE_SIZE + 1);
    expect(view.getProductButton("Arroz, 1 vez")).toHaveFocus();
  });

  it("keeps the loaded products when Load more fails, with the error and Retry next to it", async () => {
    productsMock
      .mockResolvedValueOnce(page(firstBlock, PRODUCT_HISTORY.PAGE_SIZE + 1))
      .mockRejectedValueOnce(new Error("red"))
      .mockResolvedValueOnce(page([RICE], PRODUCT_HISTORY.PAGE_SIZE + 1));
    render(<ProductPurchaseHistory />);
    const view = createProductPurchaseHistoryPage();

    await view.loadMore();

    expect(await screen.findByRole("alert")).toHaveTextContent(PRODUCT_HISTORY_TEXT.MORE_ERROR);
    expect(view.getProductButtons()).toHaveLength(PRODUCT_HISTORY.PAGE_SIZE);
    await view.retry();

    expect(await view.findProductButton("Arroz, 1 vez")).toBeInTheDocument();
    expect(productsMock).toHaveBeenLastCalledWith({ offset: PRODUCT_HISTORY.PAGE_SIZE, search: "" });
  });
});

describe("ProductPurchaseHistory: detail (CA-02, D32)", () => {
  it("opens the purchases of the product in the same screen, by its key, with the focus on its title", async () => {
    render(<ProductPurchaseHistory />);
    const view = createProductPurchaseHistoryPage();
    await view.findProductList();

    await view.toggleProduct("Leche, 4 veces");

    expect(await view.findDetailTitle()).toHaveTextContent("Leche");
    await waitFor(() => expect(screen.getByRole("heading", { level: 2 })).toHaveFocus());
    expect(view.getProductButton("Leche, 4 veces")).toHaveAttribute("aria-expanded", "true");
    expect(purchasesMock).toHaveBeenCalledWith(MILK.target);
  });

  it("shows one row per purchase with date, store, variants, times and the purchase total (rules 85, 86 and 89)", async () => {
    render(<ProductPurchaseHistory />);
    const view = createProductPurchaseHistoryPage();
    await view.findProductList();
    await view.toggleProduct("Leche, 4 veces");

    const rows = await view.findDetailRows("Leche");

    expect(rows.map((row) => toPlainSpaces(row.textContent))).toEqual([
      "Domingo 18 de octubre" + "MaxiPali" + "1 L, 2 L · 2 veces" + "Total de la compra: ₡15 000",
      "Miércoles 14 de octubre" + "Walmart" + "1 L · 1 vez" + FINANCE_TEXT.WITHOUT_TOTAL,
      "Lunes 12 de octubre" + FINANCE_TEXT.STORE_UNAVAILABLE + "1 vez" + "Total de la compra: ₡0",
    ]);
    expect(screen.getByText(PRODUCT_HISTORY_TEXT.AMOUNT_NOTE)).toBeVisible();
    expect(screen.queryByRole("button", { name: /^Editar total/u })).not.toBeInTheDocument();
  });

  it("closes the detail when the product is tapped again, with the focus on its button", async () => {
    render(<ProductPurchaseHistory />);
    const view = createProductPurchaseHistoryPage();
    await view.findProductList();
    await view.toggleProduct("Leche, 4 veces");
    await view.findDetail();

    await view.toggleProduct("Leche, 4 veces");

    expect(view.queryDetail()).not.toBeInTheDocument();
    expect(view.getProductButton("Leche, 4 veces")).toHaveFocus();
    expect(view.getProductButton("Leche, 4 veces")).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps a single detail open: tapping another product switches it", async () => {
    purchasesMock.mockResolvedValueOnce(MILK_PURCHASES).mockResolvedValueOnce([MILK_PURCHASES[0]]);
    render(<ProductPurchaseHistory />);
    const view = createProductPurchaseHistoryPage();
    await view.findProductList();
    await view.toggleProduct("Leche, 4 veces");
    await view.findDetailRows("Leche");

    await view.toggleProduct("Arroz, 1 vez");

    expect(await view.findDetailRows("Arroz")).toHaveLength(1);
    expect(screen.getAllByRole("region")).toHaveLength(1);
    expect(view.getProductButton("Leche, 4 veces")).toHaveAttribute("aria-expanded", "false");
  });

  it("asks an unavailable product by its variant (rule 96)", async () => {
    render(<ProductPurchaseHistory />);
    const view = createProductPurchaseHistoryPage();
    await view.findProductList();

    await view.toggleProduct("Producto no disponible, 1 vez");

    await waitFor(() => expect(purchasesMock).toHaveBeenCalledWith(UNAVAILABLE.target));
  });

  it("shows the error inside the detail with the list still visible, and retries the same product", async () => {
    purchasesMock.mockRejectedValueOnce(new Error("red")).mockResolvedValueOnce(MILK_PURCHASES);
    render(<ProductPurchaseHistory />);
    const view = createProductPurchaseHistoryPage();
    await view.findProductList();
    await view.toggleProduct("Leche, 4 veces");

    const detail = await view.findDetail();
    expect(await within(detail).findByRole("alert")).toHaveTextContent(PRODUCT_HISTORY_TEXT.DETAIL_LOAD_ERROR);
    expect(view.queryProductList()).toBeInTheDocument();
    await view.retry();

    expect(await view.findDetailRows("Leche")).toHaveLength(3);
    expect(purchasesMock).toHaveBeenLastCalledWith(MILK.target);
  });

  it("shows the empty message when the product has no purchases left (rule 90)", async () => {
    purchasesMock.mockResolvedValue([]);
    render(<ProductPurchaseHistory />);
    const view = createProductPurchaseHistoryPage();
    await view.findProductList();

    await view.toggleProduct("Leche, 4 veces");

    expect(await screen.findByText(PRODUCT_HISTORY_TEXT.DETAIL_EMPTY, VISIBLE_TEXT)).toBeInTheDocument();
  });
});

describe("ProductPurchaseHistory: search (D33, rule 93)", () => {
  it("searches after the wait, back from the first block, and closes the detail", async () => {
    render(<ProductPurchaseHistory />);
    const view = createProductPurchaseHistoryPage();
    await view.findProductList();
    await view.toggleProduct("Leche, 4 veces");
    await view.findDetail();
    productsMock.mockResolvedValue(page([MILK]));

    await view.search("lec");

    await waitFor(() => expect(productsMock).toHaveBeenLastCalledWith({ offset: 0, search: "lec" }));
    await waitFor(() => expect(view.queryDetail()).not.toBeInTheDocument());
    await waitFor(() => expect(view.getStatusRegion()).toHaveTextContent("1 producto"));
    // Una sola petición para todo lo escrito, no una por tecla.
    expect(productsMock.mock.calls.filter(([query]) => query.search !== "")).toHaveLength(1);
  });

  it("says there are no results when the search finds nothing", async () => {
    render(<ProductPurchaseHistory />);
    const view = createProductPurchaseHistoryPage();
    await view.findProductList();
    productsMock.mockResolvedValue(page([]));

    await view.search("zzz");

    expect(await screen.findByText(PRODUCT_HISTORY_TEXT.NO_MATCHES, VISIBLE_TEXT)).toBeInTheDocument();
  });
});
