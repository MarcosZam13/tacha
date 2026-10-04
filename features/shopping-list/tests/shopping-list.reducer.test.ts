import { describe, expect, it } from "vitest";
import { SHOPPING_LIST_ACTION, SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import type { ShoppingListState } from "../models/ShoppingListState.interface";
import { INITIAL_SHOPPING_LIST_STATE, shoppingListReducer } from "../utils/shopping-list.reducer";

const createItem = (overrides: Partial<ShoppingListItem> = {}): ShoppingListItem => ({
  id: "item-leche",
  productName: "Leche entera",
  quantity: 1,
  sizeLabel: "1000 ml",
  variantId: "variant-leche",
  ...overrides,
});

const createLoadedState = (items: ShoppingListItem[]): ShoppingListState =>
  shoppingListReducer(INITIAL_SHOPPING_LIST_STATE, { items, type: SHOPPING_LIST_ACTION.LOADED });

describe("shoppingListReducer: loading", () => {
  it("starts loading and stops once the list arrives", () => {
    const items = [createItem()];

    const state = shoppingListReducer(INITIAL_SHOPPING_LIST_STATE, { items, type: SHOPPING_LIST_ACTION.LOADED });

    expect(INITIAL_SHOPPING_LIST_STATE.isLoading).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.items).toEqual(items);
  });

  it("stops loading and keeps the list empty when loading fails", () => {
    const state = shoppingListReducer(INITIAL_SHOPPING_LIST_STATE, {
      errorMessage: SHOPPING_LIST_TEXT.LOAD_ERROR,
      type: SHOPPING_LIST_ACTION.LOAD_FAILED,
    });

    expect(state.isLoading).toBe(false);
    expect(state.items).toEqual([]);
    expect(state.loadErrorMessage).toBe(SHOPPING_LIST_TEXT.LOAD_ERROR);
  });
});

describe("shoppingListReducer: adding", () => {
  it("appends a variant that was not in the list", () => {
    const leche = createItem();
    const arroz = createItem({ id: "item-arroz", productName: "Arroz", variantId: "variant-arroz" });

    const state = shoppingListReducer(createLoadedState([leche]), {
      item: arroz,
      type: SHOPPING_LIST_ACTION.ITEM_UPSERTED,
    });

    expect(state.items).toEqual([leche, arroz]);
  });

  it("replaces the row when the same variant is added again, instead of duplicating it", () => {
    const leche = createItem();
    // La base ya sumó 1 (merge en add_item_to_general_list) y devuelve la fila con cantidad 2.
    const mergedLeche = createItem({ quantity: 2 });

    const state = shoppingListReducer(createLoadedState([leche]), {
      item: mergedLeche,
      type: SHOPPING_LIST_ACTION.ITEM_UPSERTED,
    });

    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
  });

  it("keeps the list untouched and shows the error when adding fails", () => {
    const loadedState = createLoadedState([createItem()]);

    const state = shoppingListReducer(loadedState, {
      errorMessage: SHOPPING_LIST_TEXT.ADD_ERROR,
      type: SHOPPING_LIST_ACTION.ADD_FAILED,
    });

    expect(state.items).toEqual(loadedState.items);
    expect(state.addErrorMessage).toBe(SHOPPING_LIST_TEXT.ADD_ERROR);
  });
});

describe("shoppingListReducer: changing quantity", () => {
  it("marks only the changed row as pending while the database answers", () => {
    const leche = createItem();
    const arroz = createItem({ id: "item-arroz", variantId: "variant-arroz" });

    const state = shoppingListReducer(createLoadedState([leche, arroz]), {
      itemId: leche.id,
      type: SHOPPING_LIST_ACTION.QUANTITY_CHANGE_STARTED,
    });

    expect(state.pendingItemIds).toEqual([leche.id]);
  });

  it("shows the quantity the database returned and frees the row", () => {
    const leche = createItem();
    const pendingState = shoppingListReducer(createLoadedState([leche]), {
      itemId: leche.id,
      type: SHOPPING_LIST_ACTION.QUANTITY_CHANGE_STARTED,
    });

    const state = shoppingListReducer(pendingState, {
      itemId: leche.id,
      quantity: 3,
      type: SHOPPING_LIST_ACTION.QUANTITY_CHANGED,
    });

    expect(state.items[0].quantity).toBe(3);
    expect(state.pendingItemIds).toEqual([]);
  });

  it("keeps the last confirmed quantity and frees the row when the change fails", () => {
    const leche = createItem({ quantity: 1 });
    const pendingState = shoppingListReducer(createLoadedState([leche]), {
      itemId: leche.id,
      type: SHOPPING_LIST_ACTION.QUANTITY_CHANGE_STARTED,
    });

    const state = shoppingListReducer(pendingState, {
      errorMessage: SHOPPING_LIST_TEXT.QUANTITY_ERROR,
      itemId: leche.id,
      type: SHOPPING_LIST_ACTION.QUANTITY_CHANGE_FAILED,
    });

    // La base rechaza bajar de 1 (check quantity_requested >= 1): la fila se queda en 1.
    expect(state.items[0].quantity).toBe(1);
    expect(state.pendingItemIds).toEqual([]);
    expect(state.quantityErrorMessage).toBe(SHOPPING_LIST_TEXT.QUANTITY_ERROR);
  });

  it("clears the quantity error after the next successful change on any row", () => {
    const leche = createItem();
    const arroz = createItem({ id: "item-arroz", variantId: "variant-arroz" });
    const failedState = shoppingListReducer(createLoadedState([leche, arroz]), {
      errorMessage: SHOPPING_LIST_TEXT.QUANTITY_ERROR,
      itemId: leche.id,
      type: SHOPPING_LIST_ACTION.QUANTITY_CHANGE_FAILED,
    });

    const state = shoppingListReducer(failedState, {
      itemId: arroz.id,
      quantity: 2,
      type: SHOPPING_LIST_ACTION.QUANTITY_CHANGED,
    });

    expect(state.quantityErrorMessage).toBeNull();
  });
});
