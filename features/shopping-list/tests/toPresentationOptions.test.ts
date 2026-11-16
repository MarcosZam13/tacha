import { describe, expect, it } from "vitest";
import { CATALOG_BASE_UNIT } from "@/constants";
import type { PresentationRow } from "../models/shortfall-resolution.types";
import { toPresentationOptions } from "../utils/toPresentationOptions";

const CURRENT_VARIANT_ID = "variant-1l";

const createRow = (variantId: string, baseQuantity: number, prices: number[]): PresentationRow => ({
  baseQuantity,
  baseUnit: CATALOG_BASE_UNIT.MILLILITERS,
  prices,
  variantId,
});

describe("toPresentationOptions", () => {
  it("leaves out the presentation the row already has", () => {
    const options = toPresentationOptions(
      [createRow(CURRENT_VARIANT_ID, 1000, [900]), createRow("variant-galon", 3780, [2300])],
      CURRENT_VARIANT_ID,
    );

    expect(options.map((option) => option.variantId)).toEqual(["variant-galon"]);
  });

  it("orders by approximate price, then the ones without a price by size (rule 37)", () => {
    const options = toPresentationOptions(
      [
        createRow("variant-galon", 3780, [2300, 2500]),
        createRow("variant-sin-precio-grande", 2000, []),
        createRow("variant-pinito", 200, [400]),
        createRow("variant-sin-precio-chica", 500, []),
      ],
      CURRENT_VARIANT_ID,
    );

    expect(options.map((option) => option.variantId)).toEqual([
      "variant-pinito",
      "variant-galon",
      "variant-sin-precio-chica",
      "variant-sin-precio-grande",
    ]);
  });

  it("shows the price range between brands and stores, or that there is no reference price", () => {
    const [withPrice, withoutPrice] = toPresentationOptions(
      [createRow("variant-galon", 3780, [2500, 2300]), createRow("variant-sin-precio", 500, [])],
      CURRENT_VARIANT_ID,
    );

    expect(withPrice.sizeLabel).toBe("3780 ml");
    expect(withPrice.priceLabel).toMatch(/2.300.*2.500/);
    expect(withPrice.accessibleLabel).toBe(`3780 ml, ${withPrice.priceLabel}`);
    expect(withoutPrice.priceLabel).toBe("Sin precio de referencia");
  });

  it("offers only presentations in the unit of the row's shortfalls (rule 37)", () => {
    const options = toPresentationOptions(
      [
        createRow("variant-galon", 3780, [2300]),
        { baseQuantity: 800, baseUnit: CATALOG_BASE_UNIT.GRAMS, prices: [5800], variantId: "variant-polvo" },
      ],
      CURRENT_VARIANT_ID,
      [CATALOG_BASE_UNIT.MILLILITERS],
    );

    expect(options.map((option) => option.variantId)).toEqual(["variant-galon"]);
  });

  it("does not filter by unit when the row has no shortfalls", () => {
    const options = toPresentationOptions(
      [
        createRow("variant-galon", 3780, [2300]),
        { baseQuantity: 800, baseUnit: CATALOG_BASE_UNIT.GRAMS, prices: [5800], variantId: "variant-polvo" },
      ],
      CURRENT_VARIANT_ID,
    );

    expect(options).toHaveLength(2);
  });

  it("marks no presentation as the best one (CA-03)", () => {
    const options = toPresentationOptions([createRow("variant-galon", 3780, [2300])], CURRENT_VARIANT_ID);

    expect(Object.keys(options[0]).sort()).toEqual(["accessibleLabel", "priceLabel", "sizeLabel", "variantId"]);
  });
});
