// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogProduct } from "@/types/catalog.types";
import { listMyProducts } from "../services/my-products.service";
import { MyProducts } from "../MyProducts";
import { createMyProductsPage } from "./MyProducts.page";

// Sin Supabase real: los productos salen de un servicio simulado.
vi.mock("../services/my-products.service", () => ({ listMyProducts: vi.fn() }));
const listMyProductsMock = vi.mocked(listMyProducts);

afterEach(cleanup);

beforeEach(() => {
  listMyProductsMock.mockReset();
});

const MANUAL_PRODUCT: CatalogProduct = {
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
});
