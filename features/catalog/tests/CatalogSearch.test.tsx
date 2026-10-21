// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPriceDisclaimerPage } from "@/components/price-disclaimer/tests/PriceDisclaimer.page";
import { PRODUCT_SEARCH_TEXT } from "@/constants";
import { searchCatalog } from "@/services/catalog.service";
import type { CatalogProduct } from "@/types/catalog.types";
import { CatalogSearch } from "../CatalogSearch";

// Sin Supabase real: los resultados salen de un servicio simulado.
vi.mock("@/services/catalog.service", () => ({ searchCatalog: vi.fn() }));
const searchCatalogMock = vi.mocked(searchCatalog);

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

beforeEach(() => {
  searchCatalogMock.mockReset();
});

const createProduct = (productId: string, productName: string): CatalogProduct => ({
  productId,
  productName,
  variants: [
    {
      baseQuantity: 1000,
      baseUnit: "ml",
      imageUrl: null,
      priceRangeByStore: { maxipali: { maxPrice: 1500, minPrice: 1200 } },
      variantId: `${productId}-variant`,
    },
  ],
});

// SCRUM-75: el aviso de precios estimados va una sola vez, al final de los resultados.
describe("CatalogSearch: price disclaimer", () => {
  it("shows the notice once, after the search results (CA-01, CA-02)", async () => {
    searchCatalogMock.mockResolvedValue([createProduct("p1", "Leche"), createProduct("p2", "Café")]);
    render(<CatalogSearch />);
    const disclaimer = createPriceDisclaimerPage();

    await userEvent.type(screen.getByRole("textbox", { name: PRODUCT_SEARCH_TEXT.LABEL }), "le");
    const results = await screen.findByRole("list");

    // Una sola vez aunque haya varias tarjetas, nunca dentro de una.
    expect(disclaimer.queryAllDisclaimers()).toHaveLength(1);
    expect(results).not.toContainElement(disclaimer.getDisclaimer());
    // Después de los resultados en el orden del documento.
    expect(results.compareDocumentPosition(disclaimer.getDisclaimer()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("stays visible before searching, at the end of the catalog (CA-01)", () => {
    render(<CatalogSearch />);
    const disclaimer = createPriceDisclaimerPage();

    expect(disclaimer.queryAllDisclaimers()).toHaveLength(1);
    expect(searchCatalogMock).not.toHaveBeenCalled();
  });
});
