import { describe, expect, it } from "vitest";
import type { CatalogSearchResult } from "@/types/catalog.types";
import {
  PRODUCT_GROUP_EDITOR_ACTION,
  PRODUCT_GROUP_EDITOR_ERROR,
  PRODUCT_GROUP_EDITOR_STATUS,
  PRODUCT_GROUP_EDITOR_TEXT,
  PRODUCT_GROUP_QUANTITY_STEP,
} from "../constants/product-group-editor.constants";
import type { ProductGroupQuantityStepType } from "../constants/product-group-editor.constants";
import type { ProductGroupEditorState } from "../models/product-group-editor.interfaces";
import type { ProductGroupEditorAction } from "../models/product-group-editor.types";
import {
  createInitialProductGroupEditorState,
  productGroupEditorReducer,
} from "../utils/product-group-editor.reducer";

const LECHE: CatalogSearchResult = { productName: "Leche", sizeLabel: "1 L", variantId: "variant-leche" };
const QUESO_CASERO: CatalogSearchResult = {
  isPersonal: true,
  productName: "Queso casero",
  sizeLabel: "500 g",
  variantId: "variant-queso",
};

const reduce = (actions: ProductGroupEditorAction[], state = createInitialProductGroupEditorState()) =>
  actions.reduce(productGroupEditorReducer, state);

const add = (option: CatalogSearchResult): ProductGroupEditorAction => ({
  option,
  type: PRODUCT_GROUP_EDITOR_ACTION.ITEM_ADDED,
});

const step = (variantId: string, quantityStep: ProductGroupQuantityStepType): ProductGroupEditorAction => ({
  step: quantityStep,
  type: PRODUCT_GROUP_EDITOR_ACTION.ITEM_QUANTITY_STEPPED,
  variantId,
});

describe("productGroupEditorReducer", () => {
  it("starts empty, personal and without changes", () => {
    const state = createInitialProductGroupEditorState();

    expect(state.values).toEqual({ items: [], name: "", shareWithHousehold: false });
    expect(state.hasChanges).toBe(false);
    expect(state.status).toBe(PRODUCT_GROUP_EDITOR_STATUS.EDITING);
  });

  // CA-01: elegir una presentación agrega una fila con cantidad 1.
  it("adds a picked option as a row with quantity 1 and announces it", () => {
    const state = reduce([add(QUESO_CASERO)]);

    expect(state.values.items).toEqual([
      { isPersonal: true, productName: "Queso casero", quantity: 1, sizeLabel: "500 g", variantId: "variant-queso" },
    ]);
    expect(state.announcement).toBe(`${PRODUCT_GROUP_EDITOR_TEXT.ITEM_ADDED_PREFIX}Queso casero — 500 g`);
    expect(state.hasChanges).toBe(true);
  });

  it("treats an option without isPersonal as not personal", () => {
    const [item] = reduce([add(LECHE)]).values.items;

    expect(item.isPersonal).toBe(false);
  });

  // Regla 4: la misma presentación otra vez suma 1 en vez de duplicar la fila.
  it("adds 1 to the existing row when the same option is picked again", () => {
    const state = reduce([add(LECHE), add(LECHE)]);

    expect(state.values.items).toHaveLength(1);
    expect(state.values.items[0].quantity).toBe(2);
    expect(state.announcement).toBe(`${PRODUCT_GROUP_EDITOR_TEXT.ITEM_INCREASED_PREFIX}Leche — 1 L`);
  });

  it("keeps the rows in the order they were picked", () => {
    const state = reduce([add(LECHE), add(QUESO_CASERO)]);

    expect(state.values.items.map((item) => item.variantId)).toEqual(["variant-leche", "variant-queso"]);
  });

  // Regla 3: la cantidad no sale de 1-99.
  it("keeps the quantity between the minimum and the maximum", () => {
    const decreased = reduce([add(LECHE), step("variant-leche", PRODUCT_GROUP_QUANTITY_STEP.DECREASE)]);
    expect(decreased.values.items[0].quantity).toBe(1);

    const atMax: ProductGroupEditorState = {
      ...decreased,
      values: {
        ...decreased.values,
        items: [{ ...decreased.values.items[0], quantity: 99 }],
      },
    };
    expect(reduce([step("variant-leche", PRODUCT_GROUP_QUANTITY_STEP.INCREASE)], atMax).values.items[0].quantity).toBe(99);
    expect(reduce([add(LECHE)], atMax).values.items[0].quantity).toBe(99);
  });

  it("steps only the quantity of the row it names", () => {
    const state = reduce([add(LECHE), add(QUESO_CASERO), step("variant-queso", PRODUCT_GROUP_QUANTITY_STEP.INCREASE)]);

    expect(state.values.items.map((item) => item.quantity)).toEqual([1, 2]);
  });

  // CA-02: "Quitar" saca la fila antes de guardar.
  it("removes a row and announces it", () => {
    const state = reduce([
      add(LECHE),
      add(QUESO_CASERO),
      { type: PRODUCT_GROUP_EDITOR_ACTION.ITEM_REMOVED, variantId: "variant-leche" },
    ]);

    expect(state.values.items.map((item) => item.variantId)).toEqual(["variant-queso"]);
    expect(state.announcement).toBe(`${PRODUCT_GROUP_EDITOR_TEXT.ITEM_REMOVED_PREFIX}Leche — 1 L`);
  });

  it("ignores removing a row that is not there", () => {
    const before = reduce([add(LECHE)]);

    expect(
      productGroupEditorReducer(before, { type: PRODUCT_GROUP_EDITOR_ACTION.ITEM_REMOVED, variantId: "other" }),
    ).toBe(before);
  });

  // SPEC §7: con 50 productos no entra otro, y se avisa.
  it("does not add a new row past the maximum, and announces the limit", () => {
    // 50 escrito a mano (SPEC §5, regla 2): un oráculo que no depende de la constante.
    const full = reduce(
      Array.from({ length: 50 }, (_, index) =>
        add({ productName: `Producto ${index}`, sizeLabel: "1 u", variantId: `variant-${index}` }),
      ),
    );

    const state = reduce([add(LECHE)], full);

    expect(state.values.items).toHaveLength(50);
    expect(state.announcement).toBe(PRODUCT_GROUP_EDITOR_TEXT.ITEMS_LIMIT_REACHED);
  });

  it("clears only the error of the field that changes", () => {
    const withErrors = reduce([
      {
        errors: { items: PRODUCT_GROUP_EDITOR_ERROR.ITEMS_REQUIRED, name: PRODUCT_GROUP_EDITOR_ERROR.NAME_REQUIRED },
        type: PRODUCT_GROUP_EDITOR_ACTION.VALIDATION_FAILED,
      },
    ]);

    const typedName = reduce([{ name: "Mercado", type: PRODUCT_GROUP_EDITOR_ACTION.NAME_CHANGED }], withErrors);
    expect(typedName.errors.items).toBe(PRODUCT_GROUP_EDITOR_ERROR.ITEMS_REQUIRED);
    expect(typedName.errors.name).toBeUndefined();

    const addedItem = reduce([add(LECHE)], withErrors);
    expect(addedItem.errors.items).toBeUndefined();
    expect(addedItem.errors.name).toBe(PRODUCT_GROUP_EDITOR_ERROR.NAME_REQUIRED);
  });

  it("clears the share error when sharing changes or a row is removed", () => {
    const withShareError = reduce([
      add(QUESO_CASERO),
      { errors: { share: PRODUCT_GROUP_EDITOR_ERROR.SHARE_WITH_PERSONAL_PREFIX }, type: PRODUCT_GROUP_EDITOR_ACTION.VALIDATION_FAILED },
    ]);

    expect(
      reduce([{ shareWithHousehold: false, type: PRODUCT_GROUP_EDITOR_ACTION.SHARE_CHANGED }], withShareError).errors
        .share,
    ).toBeUndefined();
    expect(
      reduce([{ type: PRODUCT_GROUP_EDITOR_ACTION.ITEM_REMOVED, variantId: "variant-queso" }], withShareError).errors
        .share,
    ).toBeUndefined();
  });

  it("keeps what was typed when saving fails", () => {
    const typed = reduce([{ name: "Mercado", type: PRODUCT_GROUP_EDITOR_ACTION.NAME_CHANGED }, add(LECHE)]);

    const saving = reduce([{ type: PRODUCT_GROUP_EDITOR_ACTION.SAVE_STARTED }], typed);
    expect(saving.status).toBe(PRODUCT_GROUP_EDITOR_STATUS.SAVING);

    const failed = reduce([{ type: PRODUCT_GROUP_EDITOR_ACTION.SAVE_FAILED }], saving);
    expect(failed.status).toBe(PRODUCT_GROUP_EDITOR_STATUS.ERROR);
    expect(failed.saveErrorMessage).toBe(PRODUCT_GROUP_EDITOR_TEXT.SAVE_ERROR);
    expect(failed.values).toEqual(typed.values);

    expect(reduce([{ type: PRODUCT_GROUP_EDITOR_ACTION.SAVE_STARTED }], failed).saveErrorMessage).toBeNull();
  });
});
