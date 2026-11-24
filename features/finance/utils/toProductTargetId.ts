import { PRODUCT_TARGET_KIND } from "../constants/finance.constants";
import type { ProductPurchaseTarget } from "../models/ProductPurchaseTarget.type";

/**
 * La identidad de un producto en la vista "Productos": para no repetirlo entre
 * bloques (regla 94), como `key` de React y para saber cuál está elegido. Lleva
 * el tipo delante para que una clave y una presentación con el mismo texto
 * nunca se confundan.
 */
export const toProductTargetId = (target: ProductPurchaseTarget): string =>
  target.kind === PRODUCT_TARGET_KIND.BY_NAME
    ? `${target.kind}:${target.productKey}`
    : `${target.kind}:${target.variantId}`;
