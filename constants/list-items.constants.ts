// RPC de list_items que usan tanto la lista general (shopping-list) como el
// detalle de producto (catalog-product-detail, SCRUM-85) para agregar un
// producto o cambiar su cantidad. Ver migraciones 004/015/024 (add_item_to_general_list)
// y 005 (change_item_quantity: el delta solo puede ser -1 o 1, la base lo rechaza si no).
export const LIST_ITEMS_DB = {
  RPC: {
    ADD_VARIANT_TO_GENERAL_LIST: "add_item_to_general_list",
    CHANGE_ITEM_QUANTITY: "change_item_quantity",
  },
} as const;

// MIN es espejo del check quantity_requested >= 1 de list_items: la UI
// deshabilita el "−" ahí, y la base lo rechaza igual si alguien lo salta.
// STEP son los únicos deltas que acepta la RPC change_item_quantity.
export const ITEM_QUANTITY = {
  MIN: 1,
  STEP: {
    DECREASE: -1,
    INCREASE: 1,
  },
} as const;

export type ItemQuantityStepType = (typeof ITEM_QUANTITY.STEP)[keyof typeof ITEM_QUANTITY.STEP];
