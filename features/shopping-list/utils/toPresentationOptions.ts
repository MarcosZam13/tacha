import type { CatalogBaseUnitType } from "@/constants";
import type { NullableRef } from "@/types/nullable.types";
import type { PriceRange } from "@/types/catalog.types";
import { formatPriceRange } from "@/utils/formatPriceRange";
import { formatSizeLabel } from "@/utils/formatSizeLabel";
import { SHORTFALL_PANEL_TEXT } from "../constants/shortfall-resolution.constants";
import type { PresentationOption, PresentationRow } from "../models/shortfall-resolution.types";

interface PricedRow extends PresentationRow {
  priceRange: NullableRef<PriceRange>;
}

const toPriceRange = (prices: number[]): NullableRef<PriceRange> =>
  prices.length === 0 ? null : { maxPrice: Math.max(...prices), minPrice: Math.min(...prices) };

// Primero las que tienen precio, de la más barata a la más cara; después las
// sin precio, de la más chica a la más grande (regla 37). El tamaño desempata.
const comparePresentations = (left: PricedRow, right: PricedRow): number => {
  if (left.priceRange && right.priceRange && left.priceRange.minPrice !== right.priceRange.minPrice) {
    return left.priceRange.minPrice - right.priceRange.minPrice;
  }
  if (left.priceRange && !right.priceRange) return -1;
  if (!left.priceRange && right.priceRange) return 1;
  return left.baseQuantity - right.baseQuantity;
};

/**
 * Las presentaciones del producto → lo que dibuja la vista "Cambié a otra
 * presentación". Quita la que ya tiene la fila y las que no están en la
 * unidad de sus avisos (una de 800 g nunca cubre una receta en ml, regla 37),
 * y ordena por precio sin marcar ninguna como "la mejor" (CA-03): el usuario
 * elige siempre. Sin unidades (fila sin avisos) no filtra por unidad.
 */
export const toPresentationOptions = (
  presentationRows: PresentationRow[],
  currentVariantId: string,
  shortfallUnits: CatalogBaseUnitType[] = [],
): PresentationOption[] =>
  presentationRows
    .filter((presentationRow) => presentationRow.variantId !== currentVariantId)
    .filter(
      (presentationRow) => shortfallUnits.length === 0 || shortfallUnits.includes(presentationRow.baseUnit),
    )
    .map((presentationRow) => ({ ...presentationRow, priceRange: toPriceRange(presentationRow.prices) }))
    .sort(comparePresentations)
    .map((pricedRow) => {
      const sizeLabel = formatSizeLabel(pricedRow.baseQuantity, pricedRow.baseUnit);
      const priceLabel = pricedRow.priceRange ? formatPriceRange(pricedRow.priceRange) : SHORTFALL_PANEL_TEXT.NO_PRICE;
      return {
        accessibleLabel: `${sizeLabel}${SHORTFALL_PANEL_TEXT.PRESENTATION_LABEL_SEPARATOR}${priceLabel}`,
        priceLabel,
        sizeLabel,
        variantId: pricedRow.variantId,
      };
    });
