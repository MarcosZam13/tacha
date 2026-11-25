import { describe, expect, it } from "vitest";
import type { CatalogProduct } from "@/types/catalog.types";
import { formatSizeLabel } from "../formatSizeLabel";
import { toCatalogSearchResults } from "../toCatalogSearchResults";

const LECHE: CatalogProduct = {
  category: "Lácteos",
  productId: "product-1",
  productName: "Leche",
  variants: [
    { baseQuantity: 1000, baseUnit: "ml", imageUrl: null, priceRangeByStore: {}, variantId: "variant-1" },
    { baseQuantity: 500, baseUnit: "ml", imageUrl: null, priceRangeByStore: {}, variantId: "variant-2" },
  ],
};

describe("toCatalogSearchResults", () => {
  it("returns one result per variant, with the product name and its size", () => {
    expect(toCatalogSearchResults([LECHE])).toEqual([
      { productName: "Leche", sizeLabel: formatSizeLabel(1000, "ml"), variantId: "variant-1" },
      { productName: "Leche", sizeLabel: formatSizeLabel(500, "ml"), variantId: "variant-2" },
    ]);
  });

  it("returns nothing for a product without variants", () => {
    expect(toCatalogSearchResults([{ ...LECHE, variants: [] }])).toEqual([]);
  });
});
