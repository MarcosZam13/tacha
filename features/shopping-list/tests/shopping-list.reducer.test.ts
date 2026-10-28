import { describe, expect, it } from "vitest";
import { SHOPPING_LIST_ACTION, SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import type { ShoppingListState } from "../models/ShoppingListState.interface";
import { INITIAL_SHOPPING_LIST_STATE, shoppingListReducer } from "../utils/shopping-list.reducer";

const createItem = (overrides: Partial<ShoppingListItem> = {}): ShoppingListItem => ({
  checkedAt: null,
  id: "item-leche",
  productName: "Leche entera",
  purchaseSessionId: null,
  quantity: 1,
  quantityBought: null,
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

describe("shoppingListReducer: checking off (moving rows between sections)", () => {
  // La hora la pone la base (trigger de la migración 015); el reducer solo la copia.
  const CHECKED_AT = "2026-10-08T15:30:00.000Z";

  it("marks only the touched row as pending while the database saves the check", () => {
    const leche = createItem();
    const arroz = createItem({ id: "item-arroz", variantId: "variant-arroz" });

    const state = shoppingListReducer(createLoadedState([leche, arroz]), {
      itemId: leche.id,
      type: SHOPPING_LIST_ACTION.CHECK_TOGGLE_STARTED,
    });

    expect(state.pendingItemIds).toEqual([leche.id]);
    // Todavía no cambia de sección: se mueve cuando la base confirma.
    expect(state.items[0].checkedAt).toBeNull();
  });

  it("moves a pending row to the checked section with the time the database returned", () => {
    const leche = createItem();
    const pendingState = shoppingListReducer(createLoadedState([leche]), {
      itemId: leche.id,
      type: SHOPPING_LIST_ACTION.CHECK_TOGGLE_STARTED,
    });

    const state = shoppingListReducer(pendingState, {
      check: { checkedAt: CHECKED_AT, purchaseSessionId: null, quantityBought: null },
      itemId: leche.id,
      type: SHOPPING_LIST_ACTION.CHECK_TOGGLED,
    });

    expect(state.items[0].checkedAt).toBe(CHECKED_AT);
    expect(state.pendingItemIds).toEqual([]);
  });

  it("moves a checked row back to pending without changing the order of the list", () => {
    const leche = createItem({ checkedAt: CHECKED_AT });
    const arroz = createItem({ id: "item-arroz", variantId: "variant-arroz" });
    const cafe = createItem({ id: "item-cafe", variantId: "variant-cafe" });

    const state = shoppingListReducer(createLoadedState([leche, arroz, cafe]), {
      check: { checkedAt: null, purchaseSessionId: null, quantityBought: null },
      itemId: leche.id,
      type: SHOPPING_LIST_ACTION.CHECK_TOGGLED,
    });

    // Las secciones se derivan de checkedAt sobre este mismo orden: leche vuelve
    // a su lugar (la primera) y las demás no se mueven.
    expect(state.items.map((item) => item.id)).toEqual([leche.id, arroz.id, cafe.id]);
    expect(state.items[0].checkedAt).toBeNull();
  });

  it("keeps the row in its section, frees it and shows the error when the check fails", () => {
    const leche = createItem();
    const pendingState = shoppingListReducer(createLoadedState([leche]), {
      itemId: leche.id,
      type: SHOPPING_LIST_ACTION.CHECK_TOGGLE_STARTED,
    });

    const state = shoppingListReducer(pendingState, {
      errorMessage: SHOPPING_LIST_TEXT.CHECK_ERROR,
      itemId: leche.id,
      type: SHOPPING_LIST_ACTION.CHECK_TOGGLE_FAILED,
    });

    expect(state.items[0].checkedAt).toBeNull();
    expect(state.pendingItemIds).toEqual([]);
    expect(state.checkErrorMessage).toBe(SHOPPING_LIST_TEXT.CHECK_ERROR);
  });

  it("clears the check error after the next successful check on any row", () => {
    const leche = createItem();
    const arroz = createItem({ id: "item-arroz", variantId: "variant-arroz" });
    const failedState = shoppingListReducer(createLoadedState([leche, arroz]), {
      errorMessage: SHOPPING_LIST_TEXT.CHECK_ERROR,
      itemId: leche.id,
      type: SHOPPING_LIST_ACTION.CHECK_TOGGLE_FAILED,
    });

    const state = shoppingListReducer(failedState, {
      check: { checkedAt: CHECKED_AT, purchaseSessionId: null, quantityBought: null },
      itemId: arroz.id,
      type: SHOPPING_LIST_ACTION.CHECK_TOGGLED,
    });

    expect(state.checkErrorMessage).toBeNull();
  });

  it("reopens a checked row when the database returns it pending after adding it again", () => {
    const leche = createItem({ checkedAt: CHECKED_AT, quantity: 3 });
    // add_item_to_general_list (015) reabre la fila tachada con cantidad 1.
    const reopenedLeche = createItem({ checkedAt: null, quantity: 1 });

    const state = shoppingListReducer(createLoadedState([leche]), {
      item: reopenedLeche,
      type: SHOPPING_LIST_ACTION.ITEM_UPSERTED,
    });

    expect(state.items).toEqual([reopenedLeche]);
  });
});

describe("shoppingListReducer: shopping mode (SCRUM-67)", () => {
  const CHECKED_AT = "2026-10-09T15:30:00.000Z";
  const SESSION_ID = "session-maxipali";

  it("keeps the purchase and the bought quantity the database returned when checking off in a purchase", () => {
    const leche = createItem({ quantity: 2 });

    const state = shoppingListReducer(createLoadedState([leche]), {
      // check_list_item_in_session (016): lo comprado arranca igual a lo pedido.
      check: { checkedAt: CHECKED_AT, purchaseSessionId: SESSION_ID, quantityBought: 2 },
      itemId: leche.id,
      type: SHOPPING_LIST_ACTION.CHECK_TOGGLED,
    });

    expect(state.items[0]).toMatchObject({ checkedAt: CHECKED_AT, purchaseSessionId: SESSION_ID, quantityBought: 2 });
  });

  it("drops the purchase and the bought quantity when the row is unchecked", () => {
    const leche = createItem({ checkedAt: CHECKED_AT, purchaseSessionId: SESSION_ID, quantityBought: 3 });

    const state = shoppingListReducer(createLoadedState([leche]), {
      // El trigger de 016 limpia las tres columnas al destachar.
      check: { checkedAt: null, purchaseSessionId: null, quantityBought: null },
      itemId: leche.id,
      type: SHOPPING_LIST_ACTION.CHECK_TOGGLED,
    });

    expect(state.items[0]).toMatchObject({ checkedAt: null, purchaseSessionId: null, quantityBought: null });
  });

  it("shows the bought quantity the database returned, keeps the requested one and frees the row", () => {
    const leche = createItem({ checkedAt: CHECKED_AT, purchaseSessionId: SESSION_ID, quantity: 2, quantityBought: 2 });
    const pendingState = shoppingListReducer(createLoadedState([leche]), {
      itemId: leche.id,
      type: SHOPPING_LIST_ACTION.QUANTITY_CHANGE_STARTED,
    });

    const state = shoppingListReducer(pendingState, {
      itemId: leche.id,
      quantityBought: 3,
      type: SHOPPING_LIST_ACTION.BOUGHT_QUANTITY_CHANGED,
    });

    expect(state.items[0].quantityBought).toBe(3);
    expect(state.items[0].quantity).toBe(2);
    expect(state.pendingItemIds).toEqual([]);
  });

  it("clears the quantity error after the bought quantity changes", () => {
    const leche = createItem({ checkedAt: CHECKED_AT, purchaseSessionId: SESSION_ID, quantityBought: 1 });
    const failedState = shoppingListReducer(createLoadedState([leche]), {
      errorMessage: SHOPPING_LIST_TEXT.QUANTITY_ERROR,
      itemId: leche.id,
      type: SHOPPING_LIST_ACTION.QUANTITY_CHANGE_FAILED,
    });

    const state = shoppingListReducer(failedState, {
      itemId: leche.id,
      quantityBought: 2,
      type: SHOPPING_LIST_ACTION.BOUGHT_QUANTITY_CHANGED,
    });

    expect(state.quantityErrorMessage).toBeNull();
  });
});
