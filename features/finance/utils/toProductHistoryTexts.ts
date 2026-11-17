import type { NullableRef } from "@/types/nullable.types";
import { FINANCE_TEXT, PRODUCT_HISTORY_TEXT } from "../constants/finance.constants";
import type { ProductPurchaseDetailRow } from "../components/models/ProductPurchaseDetailProps.interface";
import type { ProductPurchase } from "../models/ProductPurchase.interface";
import type { PurchasedProduct } from "../models/PurchasedProduct.interface";
import { formatColones } from "./formatColones";
import { formatTimes } from "./formatCount";
import { formatDay } from "./formatPeriodRange";

/** El nombre que se muestra, o "Producto no disponible" (regla 96). */
export const toProductNameText = (product: PurchasedProduct): string =>
  product.name ?? PRODUCT_HISTORY_TEXT.UNAVAILABLE;

/** El nombre completo del botón de un producto: "Leche, 4 veces" (SPEC §9). */
export const toProductAccessibleName = (product: PurchasedProduct): string =>
  `${toProductNameText(product)}${PRODUCT_HISTORY_TEXT.NAME_COUNT_SEPARATOR}${formatTimes(product.appearanceCount)}`;

/**
 * Una compra del detalle en textos (SPEC §8):
 * - el monto es el total de la compra entera, "Total de la compra: ₡15 000", o
 *   "Sin total" (regla 85, D8); nunca un precio del producto;
 * - "1 L, 2 L · 2 veces": las presentaciones y las apariciones (regla 89);
 * - la fecha, con la zona guardada (regla 87); null = la del navegador.
 */
export const toProductDetailRow = (
  purchase: ProductPurchase,
  timeZone: NullableRef<string>,
): ProductPurchaseDetailRow => {
  const timesText = formatTimes(purchase.appearanceCount);
  const variantsText = purchase.variantNames.join(PRODUCT_HISTORY_TEXT.VARIANTS_SEPARATOR);

  return {
    amountText:
      purchase.totalAmount === null
        ? FINANCE_TEXT.WITHOUT_TOTAL
        : `${PRODUCT_HISTORY_TEXT.TOTAL_PREFIX}${formatColones(purchase.totalAmount)}`,
    appearanceText: variantsText ? `${variantsText}${PRODUCT_HISTORY_TEXT.VARIANTS_TIMES_SEPARATOR}${timesText}` : timesText,
    dateText: formatDay(new Date(purchase.closedAt), timeZone),
    hasNoTotal: purchase.totalAmount === null,
    id: purchase.id,
    storeText: purchase.storeName ?? FINANCE_TEXT.STORE_UNAVAILABLE,
  };
};
