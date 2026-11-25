import type { PurchasedProductsPage } from "../models/PurchasedProductsPage.interface";
import { toProductTargetId } from "./toProductTargetId";

/**
 * Agrega el bloque siguiente a lo ya cargado ("Cargar más", D35 y regla 94).
 * Función pura: no cambia ninguna de las dos páginas.
 *
 * - **Orden:** lo cargado, tal cual, y después el bloque nuevo en el orden de
 *   la base (D33).
 * - **Repetidos:** con `offset`, si los datos cambian entre bloques, un producto
 *   puede llegar otra vez (SPEC §15, problema 4). Se muestra una sola vez, en el
 *   lugar donde ya estaba, aunque su conteo haya cambiado.
 * - **Conteo:** `totalCount` es el del bloque nuevo, el más reciente de la base.
 *
 * El largo del resultado puede no coincidir con lo que se pidió: el próximo
 * `offset` sale de los productos que llegaron de la base, no de este largo.
 */
export const mergeProductPages = (
  loadedPage: PurchasedProductsPage,
  nextPage: PurchasedProductsPage,
): PurchasedProductsPage => {
  const seenIdentities = new Set(loadedPage.products.map((product) => toProductTargetId(product.target)));
  const newProducts = nextPage.products.filter((product) => {
    const identity = toProductTargetId(product.target);
    if (seenIdentities.has(identity)) return false;
    seenIdentities.add(identity);
    return true;
  });

  return { products: [...loadedPage.products, ...newProducts], totalCount: nextPage.totalCount };
};
