// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG_CATEGORY_TEXT } from "@/constants";
import { createPriceDisclaimerPage } from "@/components/price-disclaimer/tests/PriceDisclaimer.page";
import { getCategories } from "@/services/catalog.service";
import { deletePersonalProduct, getPersonalProductUsage, hasHousehold } from "@/services/personal-product.service";
import type { MyProduct } from "../models/my-products.interfaces";
import { listMyProducts } from "../services/my-products.service";
import { MyProducts } from "../MyProducts";
import { createMyProductsPage } from "./MyProducts.page";

// Sin Supabase real: los productos salen de un servicio simulado.
vi.mock("../services/my-products.service", () => ({ listMyProducts: vi.fn() }));
// HU-58: editar y eliminar llaman a la base por estos servicios.
vi.mock("@/services/catalog.service", () => ({ getCategories: vi.fn() }));
vi.mock("@/services/personal-product.service", () => ({
  createPersonalProduct: vi.fn(),
  deletePersonalProduct: vi.fn(),
  getPersonalProductUsage: vi.fn(),
  hasHousehold: vi.fn(),
  updatePersonalProduct: vi.fn(),
}));
const listMyProductsMock = vi.mocked(listMyProducts);
const getCategoriesMock = vi.mocked(getCategories);
const deletePersonalProductMock = vi.mocked(deletePersonalProduct);
const getPersonalProductUsageMock = vi.mocked(getPersonalProductUsage);
const hasHouseholdMock = vi.mocked(hasHousehold);

afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
  getCategoriesMock.mockResolvedValue([{ id: "category-1", name: "Lácteos" }]);
  hasHouseholdMock.mockResolvedValue(false);
});

const MANUAL_PRODUCT: MyProduct = {
  category: CATALOG_CATEGORY_TEXT.UNASSIGNED,
  productId: "product-1",
  productName: "Leche",
  variants: [
    {
      baseQuantity: 1000,
      baseUnit: "ml",
      imageUrl: null,
      priceRangeByStore: {},
      variantId: "variant-1",
    },
  ],
  editable: {
    baseQuantity: 1000,
    baseUnit: "ml",
    brandName: null,
    categoryId: "category-1",
    name: "Leche",
    productId: "product-1",
  },
};

describe("MyProducts", () => {
  it("shows the section title with my products as the current sub-tab", async () => {
    listMyProductsMock.mockResolvedValue([]);
    render(<MyProducts />);
    const page = createMyProductsPage();

    expect(page.getTitle()).toBeInTheDocument();
    expect(page.getMyProductsTab()).toHaveAttribute("aria-current", "page");
    expect(page.getSearchTab()).not.toHaveAttribute("aria-current");

    await waitFor(() => expect(page.queryEmptyState()).toBeInTheDocument());
  });

  // CA-01: los productos del household se ven con la etiqueta "Agregado por mí".
  it("shows the household's manual products with the badge", async () => {
    listMyProductsMock.mockResolvedValue([MANUAL_PRODUCT]);
    render(<MyProducts />);
    const page = createMyProductsPage();

    await waitFor(() => expect(page.getCard("Leche — 1000 ml")).toBeInTheDocument());
    expect(page.getBadge()).toHaveLength(1);
    expect(page.queryEmptyState()).not.toBeInTheDocument();
  });

  // CA-02: sin productos personalizados, el estado vacío con el texto del ticket.
  it("shows the empty state text from the ticket when there are no products", async () => {
    listMyProductsMock.mockResolvedValue([]);
    render(<MyProducts />);
    const page = createMyProductsPage();

    await waitFor(() => expect(page.getEmptyState()).toBeInTheDocument());
    expect(page.queryCards()).toHaveLength(0);
  });

  it("shows an error message when the query fails", async () => {
    listMyProductsMock.mockRejectedValue(new Error("network error"));
    render(<MyProducts />);
    const page = createMyProductsPage();

    await waitFor(() => expect(page.getError()).toBeInTheDocument());
    expect(page.queryEmptyState()).not.toBeInTheDocument();
  });

  // SCRUM-75: el aviso de precios estimados va una sola vez, debajo de las tarjetas.
  it("shows the price disclaimer once, below the cards (SCRUM-75 CA-01, CA-02)", async () => {
    listMyProductsMock.mockResolvedValue([
      MANUAL_PRODUCT,
      { ...MANUAL_PRODUCT, productId: "product-2", productName: "Café" },
    ]);
    render(<MyProducts />);
    const page = createMyProductsPage();
    const disclaimer = createPriceDisclaimerPage();

    await waitFor(() => expect(page.queryCards()).toHaveLength(2));
    const cardsList = page.queryCards()[0].closest("ul");

    expect(disclaimer.queryAllDisclaimers()).toHaveLength(1);
    expect(cardsList).not.toContainElement(disclaimer.getDisclaimer());
    expect(
      (cardsList as HTMLElement).compareDocumentPosition(disclaimer.getDisclaimer()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  // HU-58 (SCRUM-89) CA-01: editar abre el mismo formulario, precargado.
  it("opens the edit form pre-filled from a card", async () => {
    listMyProductsMock.mockResolvedValue([MANUAL_PRODUCT]);
    render(<MyProducts />);
    const page = createMyProductsPage();
    await waitFor(() => expect(page.getEditButton("Leche")).toBeInTheDocument());

    await page.clickEdit("Leche");

    expect(await page.findEditDialog()).toBeInTheDocument();
    expect(page.getNameInput().value).toBe("Leche");
  });

  // HU-58 CA-02: eliminar pide confirmación y avisa dónde se usa; al confirmar, refresca el listado.
  it("asks before deleting, warns where the product is used and reloads after deleting", async () => {
    listMyProductsMock.mockResolvedValue([MANUAL_PRODUCT]);
    getPersonalProductUsageMock.mockResolvedValue({ activeListCount: 1, recipeCount: 0 });
    deletePersonalProductMock.mockResolvedValue("archived");
    render(<MyProducts />);
    const page = createMyProductsPage();
    await waitFor(() => expect(page.getDeleteButton("Leche")).toBeInTheDocument());

    await page.clickDelete("Leche");
    expect(await page.findDeleteDialog()).toBeInTheDocument();
    expect(await page.findUsageNotice()).toHaveTextContent("1 lista activa");
    expect(deletePersonalProductMock).not.toHaveBeenCalled();

    await page.confirmDelete();

    expect(deletePersonalProductMock).toHaveBeenCalledWith("product-1");
    await waitFor(() => expect(listMyProductsMock).toHaveBeenCalledTimes(2));
  });
});
