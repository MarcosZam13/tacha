import { describe, expect, it } from "vitest";
import { PRODUCT_TARGET_KIND } from "../constants/finance.constants";
import type { PurchasedProduct } from "../models/PurchasedProduct.interface";
import type { PurchasedProductsPage } from "../models/PurchasedProductsPage.interface";
import { mergeProductPages } from "../utils/mergeProductPages";

const named = (productKey: string, appearanceCount = 1): PurchasedProduct => ({
  appearanceCount,
  lastPurchasedAt: "2026-10-18T21:00:00+00:00",
  name: productKey,
  target: { kind: PRODUCT_TARGET_KIND.BY_NAME, productKey },
});

const unavailable = (variantId: string): PurchasedProduct => ({
  appearanceCount: 1,
  lastPurchasedAt: "2026-10-14T15:00:00+00:00",
  name: null,
  target: { kind: PRODUCT_TARGET_KIND.UNAVAILABLE, variantId },
});

const page = (products: PurchasedProduct[], totalCount: number): PurchasedProductsPage => ({ products, totalCount });

const targetsOf = (merged: PurchasedProductsPage) => merged.products.map((product) => product.target);

describe("mergeProductPages", () => {
  it("appends the next block after the loaded products, keeping both orders (D33)", () => {
    const merged = mergeProductPages(page([named("leche"), named("arroz")], 4), page([named("cafe"), named("sal")], 4));

    expect(merged).toEqual(page([named("leche"), named("arroz"), named("cafe"), named("sal")], 4));
  });

  it("accepts a shorter last block", () => {
    const merged = mergeProductPages(page([named("leche"), named("arroz")], 3), page([named("cafe")], 3));

    expect(merged).toEqual(page([named("leche"), named("arroz"), named("cafe")], 3));
  });

  it("keeps the loaded products when the next block is empty, with the newest count", () => {
    const merged = mergeProductPages(page([named("leche")], 3), page([], 1));

    expect(merged).toEqual(page([named("leche")], 1));
  });

  it("takes the next block as is when nothing was loaded", () => {
    expect(mergeProductPages(page([], 0), page([named("leche")], 1))).toEqual(page([named("leche")], 1));
  });

  it("gives an empty list when both blocks are empty", () => {
    expect(mergeProductPages(page([], 0), page([], 0))).toEqual(page([], 0));
  });

  it("shows a product repeated between blocks only once, where it already was (rule 94)", () => {
    // Entre un bloque y otro, "arroz" bajó de lugar y volvió a llegar con otro conteo.
    const merged = mergeProductPages(
      page([named("leche", 5), named("arroz", 3)], 4),
      page([named("arroz", 2), named("cafe")], 4),
    );

    expect(merged.products).toEqual([named("leche", 5), named("arroz", 3), named("cafe")]);
  });

  it("drops a product repeated inside the next block", () => {
    const merged = mergeProductPages(page([named("leche")], 3), page([named("cafe"), named("cafe")], 3));

    expect(targetsOf(merged)).toEqual([named("leche").target, named("cafe").target]);
  });

  it("drops a repeated unavailable product by its variant", () => {
    const merged = mergeProductPages(
      page([unavailable("variant-1")], 2),
      page([unavailable("variant-1"), unavailable("variant-2")], 2),
    );

    expect(targetsOf(merged)).toEqual([unavailable("variant-1").target, unavailable("variant-2").target]);
  });

  it("never mixes up a product key and a variant with the same text", () => {
    const merged = mergeProductPages(page([named("same-text")], 2), page([unavailable("same-text")], 2));

    expect(merged.products).toEqual([named("same-text"), unavailable("same-text")]);
  });

  it("gives a block made only of repeats as the loaded products", () => {
    const merged = mergeProductPages(page([named("leche"), named("arroz")], 2), page([named("arroz")], 2));

    expect(merged).toEqual(page([named("leche"), named("arroz")], 2));
  });

  it("does not change the pages it receives", () => {
    const loadedPage = page([named("leche")], 2);
    const nextPage = page([named("cafe")], 2);

    mergeProductPages(loadedPage, nextPage);

    expect(loadedPage).toEqual(page([named("leche")], 2));
    expect(nextPage).toEqual(page([named("cafe")], 2));
  });
});
