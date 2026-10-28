import type { StorePrice, StorePriceRange } from "@/types/catalog.types";

/**
 * Un precio por marca y tienda → un rango por tienda (el más bajo y el más
 * alto entre sus marcas), de la tienda más barata a la más cara.
 * Promovido desde shopping-list (SCRUM-85): catalog-product-detail también
 * agrupa precios por marca en un rango por tienda.
 */
export const toStorePriceRanges = (storePrices: StorePrice[]): StorePriceRange[] => {
  const rangesByStore = new Map<string, StorePriceRange>();

  storePrices.forEach(({ price, storeName, storeSlug }) => {
    const range = rangesByStore.get(storeName);
    rangesByStore.set(storeName, {
      maxPrice: range ? Math.max(range.maxPrice, price) : price,
      minPrice: range ? Math.min(range.minPrice, price) : price,
      storeName,
      storeSlug: storeSlug ?? range?.storeSlug,
    });
  });

  return [...rangesByStore.values()].sort((first, second) => first.minPrice - second.minPrice);
};
