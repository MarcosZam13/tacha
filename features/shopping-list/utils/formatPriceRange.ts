import { PRICE_FORMAT } from "../constants/shopping-list.constants";
import type { StorePriceRange } from "../models/ItemDetail.interface";

// Se crea una vez: armar un Intl.NumberFormat en cada llamada es lo caro.
const priceFormatter = new Intl.NumberFormat(PRICE_FORMAT.LOCALE, {
  currency: PRICE_FORMAT.CURRENCY,
  maximumFractionDigits: PRICE_FORMAT.MAX_FRACTION_DIGITS,
  style: "currency",
});

/** 2300–2500 → "₡2 300 – ₡2 500"; si las marcas cuestan igual, un solo precio. */
export const formatPriceRange = ({ maxPrice, minPrice }: StorePriceRange): string =>
  minPrice === maxPrice
    ? priceFormatter.format(minPrice)
    : `${priceFormatter.format(minPrice)}${PRICE_FORMAT.RANGE_SEPARATOR}${priceFormatter.format(maxPrice)}`;
