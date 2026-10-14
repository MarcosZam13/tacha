import { CATALOG_CARD, CATALOG_CARD_TEXT } from "@/constants";
import type { CatalogCardData, CatalogProduct } from "@/types/catalog.types";
import { formatPriceRange } from "./formatPriceRange";
import { formatSizeLabel } from "./formatSizeLabel";
import { getOverallPriceRange } from "./getOverallPriceRange";

/**
 * Aplana los productos madre a una tarjeta por variante: lo que se muestra es
 * producto + tamaño ("Leche — 1000 ml"), no el producto madre solo.
 */
export const toCatalogCards = (products: CatalogProduct[]): CatalogCardData[] =>
  products.flatMap((product) =>
    product.variants.map((variant) => {
      const priceRange = getOverallPriceRange(variant.priceRangeByStore);
      const sizeLabel = formatSizeLabel(variant.baseQuantity, variant.baseUnit);

      return {
        id: variant.variantId,
        imageUrl: variant.imageUrl,
        placeholderInitial: product.productName.trim().charAt(0).toUpperCase(),
        priceLabel: priceRange ? formatPriceRange(priceRange) : CATALOG_CARD_TEXT.NO_PRICE,
        title: `${product.productName}${CATALOG_CARD.TITLE_SEPARATOR}${sizeLabel}`,
      };
    }),
  );
