import { PRODUCT_GROUP_EDITOR_TEXT, PRODUCT_GROUP_LIMIT } from "../constants/product-group-editor.constants";
import type { ProductGroupEditorItem, ProductGroupEditorItemRow } from "../models/product-group-editor.interfaces";
import { toProductGroupItemLabel } from "./toProductGroupItemLabel";

/**
 * Una fila del grupo en armado, lista para dibujar: qué botones del stepper se
 * pueden usar y los nombres accesibles con el producto ("Quitar Leche — 1 L"),
 * para que no haya varios "Quitar" iguales.
 */
export const toProductGroupItemRow = (item: ProductGroupEditorItem): ProductGroupEditorItemRow => {
  const label = toProductGroupItemLabel(item);
  return {
    canDecrease: item.quantity > PRODUCT_GROUP_LIMIT.QUANTITY_MIN,
    canIncrease: item.quantity < PRODUCT_GROUP_LIMIT.QUANTITY_MAX,
    decreaseLabel: `${PRODUCT_GROUP_EDITOR_TEXT.DECREASE_PREFIX}${label}`,
    increaseLabel: `${PRODUCT_GROUP_EDITOR_TEXT.INCREASE_PREFIX}${label}`,
    label,
    quantity: item.quantity,
    removeLabel: `${PRODUCT_GROUP_EDITOR_TEXT.REMOVE_ITEM_PREFIX}${label}`,
    variantId: item.variantId,
  };
};
