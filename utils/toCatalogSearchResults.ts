import type { CatalogProduct, CatalogSearchResult } from "@/types/catalog.types";
import { formatSizeLabel } from "@/utils/formatSizeLabel";

/**
 * Aplana los productos madre del buscador a una fila por variante, porque lo
 * que se añade a la lista (list_items) o a un grupo (product_group_items) es
 * la variante. Compartido por la lista general y los grupos (SCRUM-110).
 */
export const toCatalogSearchResults = (products: CatalogProduct[]): CatalogSearchResult[] =>
  products.flatMap((product) =>
    product.variants.map((variant) => ({
      productName: product.productName,
      sizeLabel: formatSizeLabel(variant.baseQuantity, variant.baseUnit),
      variantId: variant.variantId,
    })),
  );
