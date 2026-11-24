import { describe, expect, it } from "vitest";
import { CATALOG_CARD_TEXT } from "@/constants";
import type { CatalogProduct, CatalogProductVariant } from "@/types/catalog.types";
import { formatPriceRange } from "../formatPriceRange";
import { toCatalogCards } from "../toCatalogCards";

const createProduct = (variant: Partial<CatalogProductVariant>): CatalogProduct => ({
  category: "Lácteos",
  productId: "product-1",
  productName: "Queso",
  variants: [
    { baseQuantity: 500, baseUnit: "g", imageUrl: null, priceRangeByStore: {}, variantId: "variant-1", ...variant },
  ],
});

// El mismo formato que usa la tarjeta, para comparar el texto exacto.
const REFERENCE_PRICE_LABEL = formatPriceRange({ maxPrice: 2850, minPrice: 2850 });
const SCRAPED_RANGE_LABEL = formatPriceRange({ maxPrice: 1200, minPrice: 800 });

// HU-57 (SCRUM-88): precio de referencia del usuario vs. precios del scraping.
describe("toCatalogCards: precio de referencia", () => {
  it("shows the reference price, marked as such, when there are no scraped prices", () => {
    const [card] = toCatalogCards([createProduct({ referencePrice: 2850 })]);

    expect(card.isReferencePrice).toBe(true);
    expect(card.priceLabel).toBe(REFERENCE_PRICE_LABEL);
  });

  it("never mixes it with scraped prices: the scraped range wins (CA-03)", () => {
    const [card] = toCatalogCards([
      createProduct({ priceRangeByStore: { maxipali: { maxPrice: 1200, minPrice: 800 } }, referencePrice: 2850 }),
    ]);

    expect(card.isReferencePrice).toBeUndefined();
    expect(card.priceLabel).toBe(SCRAPED_RANGE_LABEL);
  });

  it("keeps the store name even without a price", () => {
    const [card] = toCatalogCards([createProduct({ referenceStoreName: "Feria del agricultor" })]);

    expect(card.storeName).toBe("Feria del agricultor");
    expect(card.priceLabel).toBe(CATALOG_CARD_TEXT.NO_PRICE);
  });
});
