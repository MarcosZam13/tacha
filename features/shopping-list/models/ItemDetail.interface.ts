/** Último precio de una marca en una tienda, tal como lo devuelve el servicio. */
export interface StorePrice {
  price: number;
  storeName: string;
}

/** Precio más bajo y más alto entre las marcas de una tienda. */
export interface StorePriceRange {
  maxPrice: number;
  minPrice: number;
  storeName: string;
}

/** Lo que el detalle de una variante agrega a lo que la fila ya muestra. */
export interface ItemDetail {
  brands: string[];
  storePrices: StorePrice[];
}
