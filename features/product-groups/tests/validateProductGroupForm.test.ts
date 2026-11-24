import { describe, expect, it } from "vitest";
import { PRODUCT_GROUP_EDITOR_ERROR } from "../constants/product-group-editor.constants";
import type { ProductGroupEditorItem, ProductGroupEditorValues } from "../models/product-group-editor.interfaces";
import { hasProductGroupFormErrors, validateProductGroupForm } from "../utils/validateProductGroupForm";

const LECHE: ProductGroupEditorItem = {
  isPersonal: false,
  productName: "Leche",
  quantity: 1,
  sizeLabel: "1 L",
  variantId: "variant-leche",
};
const QUESO_CASERO: ProductGroupEditorItem = { ...LECHE, isPersonal: true, productName: "Queso casero", variantId: "v-1" };

const VALID: ProductGroupEditorValues = { items: [LECHE], name: "Mercado", shareWithHousehold: false };

describe("validateProductGroupForm", () => {
  it("accepts a named group with at least one product", () => {
    expect(hasProductGroupFormErrors(validateProductGroupForm(VALID))).toBe(false);
  });

  // Regla 1 del SPEC: de 1 a 60 caracteres, sin contar los espacios a los costados.
  // 60/61 escritos a mano: si alguien cambia la constante, el test lo nota.
  it.each([
    ["", PRODUCT_GROUP_EDITOR_ERROR.NAME_REQUIRED],
    ["   ", PRODUCT_GROUP_EDITOR_ERROR.NAME_REQUIRED],
    ["a".repeat(61), PRODUCT_GROUP_EDITOR_ERROR.NAME_TOO_LONG],
  ])("rejects the name %j", (name, expectedError) => {
    expect(validateProductGroupForm({ ...VALID, name }).name).toBe(expectedError);
  });

  it("accepts a name of exactly the maximum length, with spaces around", () => {
    const name = ` ${"a".repeat(60)} `;

    expect(validateProductGroupForm({ ...VALID, name }).name).toBeUndefined();
  });

  // Regla 2.
  it("asks for at least one product", () => {
    const errors = validateProductGroupForm({ ...VALID, items: [] });

    expect(errors.items).toBe(PRODUCT_GROUP_EDITOR_ERROR.ITEMS_REQUIRED);
    expect(hasProductGroupFormErrors(errors)).toBe(true);
  });

  // Regla 7: un grupo compartido con un producto personal sin compartir.
  it("names each personal product once when a shared group has them", () => {
    const errors = validateProductGroupForm({
      ...VALID,
      items: [LECHE, QUESO_CASERO, { ...QUESO_CASERO, variantId: "v-2" }],
      shareWithHousehold: true,
    });

    expect(errors.share).toBe(`${PRODUCT_GROUP_EDITOR_ERROR.SHARE_WITH_PERSONAL_PREFIX}Queso casero`);
  });

  it("allows personal products in a group that is not shared", () => {
    expect(validateProductGroupForm({ ...VALID, items: [QUESO_CASERO] }).share).toBeUndefined();
  });
});
