import { describe, expect, it } from "vitest";
import { PRODUCT_TARGET_KIND } from "../constants/finance.constants";
import type { ProductPurchase } from "../models/ProductPurchase.interface";
import type { PurchasedProduct } from "../models/PurchasedProduct.interface";
import { toProductAccessibleName, toProductDetailRow, toProductNameText } from "../utils/toProductHistoryTexts";

// Intl separa los miles con un espacio especial: se normaliza para comparar.
const toPlainSpaces = (text: string): string => text.replace(/\s/gu, " ");

const MILK: PurchasedProduct = {
  appearanceCount: 4,
  lastPurchasedAt: "2026-10-18T21:00:00+00:00",
  name: "Leche",
  target: { kind: PRODUCT_TARGET_KIND.BY_NAME, productKey: "leche" },
};
const UNAVAILABLE: PurchasedProduct = {
  ...MILK,
  appearanceCount: 1,
  name: null,
  target: { kind: PRODUCT_TARGET_KIND.UNAVAILABLE, variantId: "variant-1" },
};
const PURCHASE: ProductPurchase = {
  appearanceCount: 2,
  closedAt: "2026-10-18T21:00:00+00:00",
  id: "p1",
  storeName: "MaxiPali",
  totalAmount: 15000,
  variantNames: ["1 L", "2 L"],
};

describe("toProductNameText and toProductAccessibleName", () => {
  it("names a product with its times (SPEC §9)", () => {
    expect(toProductNameText(MILK)).toBe("Leche");
    expect(toProductAccessibleName(MILK)).toBe("Leche, 4 veces");
  });

  it("names an unavailable product (rule 96)", () => {
    expect(toProductNameText(UNAVAILABLE)).toBe("Producto no disponible");
    expect(toProductAccessibleName(UNAVAILABLE)).toBe("Producto no disponible, 1 vez");
  });
});

describe("toProductDetailRow", () => {
  it("says the amount is the purchase total, never a product price (rule 85)", () => {
    const row = toProductDetailRow(PURCHASE, "America/Costa_Rica");

    expect(toPlainSpaces(row.amountText)).toBe("Total de la compra: ₡15 000");
    expect(row).toMatchObject({
      appearanceText: "1 L, 2 L · 2 veces",
      dateText: "Domingo 18 de octubre",
      hasNoTotal: false,
      id: "p1",
      storeText: "MaxiPali",
    });
  });

  it("uses the saved time zone for the date (rule 87)", () => {
    // 02:00 UTC del lunes es todavía domingo en Costa Rica.
    const lateSunday = { ...PURCHASE, closedAt: "2026-10-19T02:00:00+00:00" };

    expect(toProductDetailRow(lateSunday, "America/Costa_Rica").dateText).toBe("Domingo 18 de octubre");
    expect(toProductDetailRow(lateSunday, "UTC").dateText).toBe("Lunes 19 de octubre");
  });

  it("keeps Sin total apart from ₡0 (D8)", () => {
    expect(toProductDetailRow({ ...PURCHASE, totalAmount: null }, null)).toMatchObject({
      amountText: "Sin total",
      hasNoTotal: true,
    });
    expect(toPlainSpaces(toProductDetailRow({ ...PURCHASE, totalAmount: 0 }, null).amountText)).toBe(
      "Total de la compra: ₡0",
    );
  });

  it("shows only the times without readable variants, and a missing store (rule 86)", () => {
    expect(toProductDetailRow({ ...PURCHASE, storeName: null, variantNames: [] }, null)).toMatchObject({
      appearanceText: "2 veces",
      storeText: "Supermercado no disponible",
    });
  });
});
