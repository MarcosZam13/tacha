import type { CatalogProduct } from "@/types/catalog.types";
import { formatSizeLabel } from "@/utils/formatSizeLabel";
import type { CatalogSearchResult } from "../models/CatalogSearchResult.interface";

/**
 * Aplana los productos madre del buscador a una fila por variante, porque lo
 * que se añade a la lista es la variante (list_items la referencia).
 */
export const toCatalogSearchResults = (products: CatalogProduct[]): CatalogSearchResult[] =>
  products.flatMap((product) =>
    product.variants.map((variant) => ({
      productName: product.productName,
      sizeLabel: formatSizeLabel(variant.baseQuantity, variant.baseUnit),
      variantId: variant.variantId,
    })),
  );
