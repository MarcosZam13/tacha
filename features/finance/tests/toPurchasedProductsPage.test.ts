import { describe, expect, it } from "vitest";
import { PRODUCT_HISTORY, PRODUCT_TARGET_KIND } from "../constants/finance.constants";
import type { PurchasedProductRow, PurchasedProductsResponse } from "../models/PurchasedProductsPage.interface";
import { toPurchasedProductsPage } from "../utils/toPurchasedProductsPage";

const namedRow = (overrides: Partial<PurchasedProductRow> = {}): PurchasedProductRow => ({
  appearance_count: 4,
  last_purchased_at: "2026-10-18T21:00:00+00:00",
  product_catalog_variant_id: null,
  product_key: "azucar",
  product_name: "Azúcar",
  ...overrides,
});

const unavailableRow = (overrides: Partial<PurchasedProductRow> = {}): PurchasedProductRow => ({
  appearance_count: 1,
  last_purchased_at: "2026-10-14T15:00:00+00:00",
  product_catalog_variant_id: "variant-1",
  product_key: null,
  product_name: null,
  ...overrides,
});

const rowsOf = (length: number): PurchasedProductRow[] =>
  Array.from({ length }, (_, index) => namedRow({ product_key: `producto ${index}`, product_name: `Producto ${index}` }));

const response = (products: PurchasedProductRow[], totalCount = products.length): PurchasedProductsResponse => ({
  products,
  total_count: totalCount,
});

describe("toPurchasedProductsPage", () => {
  it("maps a named product with its key as the detail target, as the database sent it", () => {
    expect(toPurchasedProductsPage(response([namedRow()]), 0)).toEqual({
      products: [
        {
          appearanceCount: 4,
          lastPurchasedAt: "2026-10-18T21:00:00+00:00",
          name: "Azúcar",
          target: { kind: PRODUCT_TARGET_KIND.BY_NAME, productKey: "azucar" },
        },
      ],
      totalCount: 1,
    });
  });

  it("maps an unavailable product with its variant as the target and no name (rule 96)", () => {
    expect(toPurchasedProductsPage(response([unavailableRow()]), 0).products).toEqual([
      {
        appearanceCount: 1,
        lastPurchasedAt: "2026-10-14T15:00:00+00:00",
        name: null,
        target: { kind: PRODUCT_TARGET_KIND.UNAVAILABLE, variantId: "variant-1" },
      },
    ]);
  });

  it("keeps the database order (D33)", () => {
    const products = toPurchasedProductsPage(response([namedRow(), unavailableRow()]), 0).products;

    expect(products.map((product) => product.target.kind)).toEqual([
      PRODUCT_TARGET_KIND.BY_NAME,
      PRODUCT_TARGET_KIND.UNAVAILABLE,
    ]);
  });

  it("accepts a full block followed by more products", () => {
    const page = toPurchasedProductsPage(response(rowsOf(PRODUCT_HISTORY.PAGE_SIZE), 45), 0);

    expect(page).toMatchObject({ totalCount: 45 });
    expect(page.products).toHaveLength(PRODUCT_HISTORY.PAGE_SIZE);
  });

  it("accepts a shorter last block", () => {
    expect(toPurchasedProductsPage(response(rowsOf(5), 45), 40).products).toHaveLength(5);
  });

  it("accepts an empty block once the offset is past the end", () => {
    expect(toPurchasedProductsPage(response([], 45), 60)).toEqual({ products: [], totalCount: 45 });
  });

  it("accepts an empty history", () => {
    expect(toPurchasedProductsPage(response([]), 0)).toEqual({ products: [], totalCount: 0 });
  });

  it.each([
    ["fewer products than the count says", response(rowsOf(3), 45), 0],
    ["a block larger than the page size", response(rowsOf(PRODUCT_HISTORY.PAGE_SIZE + 1), 50), 0],
    ["products past the end", response(rowsOf(1), 45), 60],
  ])("rejects a block that does not match its count: %s (SPEC §7)", (_, blockResponse, offset) => {
    expect(() => toPurchasedProductsPage(blockResponse, offset)).toThrow(/no coincide con su conteo/);
  });

  it.each([-1, 1.5])("rejects an invalid total count: %s", (totalCount) => {
    expect(() => toPurchasedProductsPage(response([], totalCount), 0)).toThrow(/conteo inválido/);
  });

  it.each([
    ["a key with a variant", namedRow({ product_catalog_variant_id: "variant-1" })],
    ["a key without a name", namedRow({ product_name: null })],
    ["no key and no variant", unavailableRow({ product_catalog_variant_id: null })],
    ["no key but a name", unavailableRow({ product_name: "Azúcar" })],
  ])("rejects a product outside the contract: %s", (_, productRow) => {
    expect(() => toPurchasedProductsPage(response([productRow]), 0)).toThrow(/get_purchased_products devolvió/);
  });

  it.each([0, 2.5])("rejects an appearance count of %s", (appearanceCount) => {
    expect(() => toPurchasedProductsPage(response([namedRow({ appearance_count: appearanceCount })]), 0)).toThrow(
      /conteo de apariciones/,
    );
  });

  it("rejects an invalid date", () => {
    expect(() => toPurchasedProductsPage(response([namedRow({ last_purchased_at: "ayer" })]), 0)).toThrow(
      /fecha inválida/,
    );
  });
});
