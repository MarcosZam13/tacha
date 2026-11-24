import { describe, expect, it } from "vitest";
import { toProductGroupItemRow } from "../utils/toProductGroupItemRow";

const LECHE = { isPersonal: false, productName: "Leche", quantity: 1, sizeLabel: "1 L", variantId: "variant-leche" };

describe("toProductGroupItemRow", () => {
  it("names the buttons after the product, so each row's buttons are distinct", () => {
    expect(toProductGroupItemRow(LECHE)).toEqual({
      canDecrease: false,
      canIncrease: true,
      decreaseLabel: "Restar uno a Leche — 1 L",
      increaseLabel: "Sumar uno a Leche — 1 L",
      label: "Leche — 1 L",
      quantity: 1,
      removeLabel: "Quitar Leche — 1 L",
      variantId: "variant-leche",
    });
  });

  // Regla 3 del SPEC: la cantidad va de 1 a 99 (literales del SPEC, no las constantes del código).
  it("disables minus at 1 and plus at 99", () => {
    expect(toProductGroupItemRow({ ...LECHE, quantity: 2 })).toMatchObject({ canDecrease: true, canIncrease: true });
    expect(toProductGroupItemRow({ ...LECHE, quantity: 99 })).toMatchObject({ canDecrease: true, canIncrease: false });
  });
});
