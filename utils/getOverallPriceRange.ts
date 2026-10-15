import type { NullableRef } from "@/types/nullable.types";
import type { PriceRange } from "@/types/catalog.types";

/**
 * Rango por tienda → un solo rango: el mínimo de los mínimos y el máximo de
 * los máximos (documento-proyecto §4.5: rango, no promedio). Null si no hay
 * ninguna tienda con precio.
 */
export const getOverallPriceRange = (
  priceRangeByStore: Record<string, PriceRange>,
): NullableRef<PriceRange> => {
  const storeRanges = Object.values(priceRangeByStore);
  if (storeRanges.length === 0) return null;

  return {
    maxPrice: Math.max(...storeRanges.map((storeRange) => storeRange.maxPrice)),
    minPrice: Math.min(...storeRanges.map((storeRange) => storeRange.minPrice)),
  };
};
