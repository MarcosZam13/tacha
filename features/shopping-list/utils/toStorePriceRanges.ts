import type { StorePrice, StorePriceRange } from "../models/ItemDetail.interface";

/**
 * Un precio por marca y tienda → un rango por tienda (el más bajo y el más
 * alto entre sus marcas), de la tienda más barata a la más cara.
 */
export const toStorePriceRanges = (storePrices: StorePrice[]): StorePriceRange[] => {
  const rangesByStore = new Map<string, StorePriceRange>();

  storePrices.forEach(({ price, storeName }) => {
    const range = rangesByStore.get(storeName);
    rangesByStore.set(storeName, {
      maxPrice: range ? Math.max(range.maxPrice, price) : price,
      minPrice: range ? Math.min(range.minPrice, price) : price,
      storeName,
    });
  });

  return [...rangesByStore.values()].sort((first, second) => first.minPrice - second.minPrice);
};
