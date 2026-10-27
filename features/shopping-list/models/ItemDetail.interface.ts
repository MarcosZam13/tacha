import type { StorePrice } from "@/types/catalog.types";

/** Lo que el detalle de una variante agrega a lo que la fila ya muestra. */
export interface ItemDetail {
  brands: string[];
  storePrices: StorePrice[];
}
