import { FINANCE_DB, PRODUCT_HISTORY, PRODUCT_TARGET_KIND } from "../constants/finance.constants";
import type { PurchasedProduct } from "../models/PurchasedProduct.interface";
import type {
  PurchasedProductRow,
  PurchasedProductsPage,
  PurchasedProductsResponse,
} from "../models/PurchasedProductsPage.interface";

const contractError = (reason: string): Error =>
  new Error(`${FINANCE_DB.RPC.GET_PURCHASED_PRODUCTS} devolvió ${reason}`);

const isCount = (value: number, minimum: number): boolean => Number.isInteger(value) && value >= minimum;

const toPurchasedProduct = (productRow: PurchasedProductRow): PurchasedProduct => {
  if (!isCount(productRow.appearance_count, 1)) throw contractError("un conteo de apariciones inválido");
  if (Number.isNaN(new Date(productRow.last_purchased_at).getTime())) throw contractError("una fecha inválida");

  const common = { appearanceCount: productRow.appearance_count, lastPurchasedAt: productRow.last_purchased_at };

  // Exactamente uno: el nombre normalizado, o la presentación si no está disponible (regla 96).
  if (productRow.product_key !== null) {
    if (productRow.product_catalog_variant_id !== null || productRow.product_name === null) {
      throw contractError("un producto con clave y sin nombre, o con presentación");
    }
    return {
      ...common,
      name: productRow.product_name,
      target: { kind: PRODUCT_TARGET_KIND.BY_NAME, productKey: productRow.product_key },
    };
  }

  if (productRow.product_catalog_variant_id === null || productRow.product_name !== null) {
    throw contractError("un producto no disponible sin presentación, o con nombre");
  }
  return {
    ...common,
    name: null,
    target: { kind: PRODUCT_TARGET_KIND.UNAVAILABLE, variantId: productRow.product_catalog_variant_id },
  };
};

/**
 * Adapter: convierte un bloque de get_purchased_products (SPEC §12) en lo que
 * usa la vista "Productos". Función pura: la forma de la base no sale de acá.
 * Respeta el orden de la base (D33).
 *
 * Un bloque que no coincide con su conteo es un error y no se muestra cortado
 * (SPEC §7, como la regla 30): con `total_count` y el `offset` pedido, el bloque
 * trae exactamente min(PAGE_SIZE, total_count - offset) productos, o ninguno si
 * el offset ya pasó el final.
 */
export const toPurchasedProductsPage = (
  response: PurchasedProductsResponse,
  offset: number,
): PurchasedProductsPage => {
  if (!isCount(response.total_count, 0)) throw contractError("un conteo inválido");

  const expectedLength = Math.min(PRODUCT_HISTORY.PAGE_SIZE, Math.max(0, response.total_count - offset));
  if (response.products.length !== expectedLength) throw contractError("un bloque que no coincide con su conteo");

  return { products: response.products.map(toPurchasedProduct), totalCount: response.total_count };
};
