import type { PRODUCT_TARGET_KIND } from "../constants/finance.constants";

/**
 * Con qué se pide el detalle de un producto (SCRUM-93, SPEC §12). Es una unión
 * porque get_product_purchases recibe exactamente uno de los dos:
 * - por nombre: el product_key que devolvió la lista, tal cual. El cliente no
 *   lo normaliza (D39 y D40 viven solo en la base);
 * - no disponible: la presentación de un "Producto no disponible" (regla 96).
 */
export type ProductPurchaseTarget =
  | { kind: typeof PRODUCT_TARGET_KIND.BY_NAME; productKey: string }
  | { kind: typeof PRODUCT_TARGET_KIND.UNAVAILABLE; variantId: string };
