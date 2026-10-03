import type { NullableRef } from "@/types/nullable.types";

/** Una tienda del detalle con su precio ya formateado ("₡2 300 – ₡2 500"). */
export interface StorePriceRow {
  priceLabel: string;
  storeName: string;
}

/** Lo que dibuja el modal de detalle, ya calculado por el ViewModel. */
export interface ItemDetailViewModel {
  brands: string[];
  errorMessage: NullableRef<string>;
  isLoading: boolean;
  priceRows: StorePriceRow[];
  productName: string;
  sizeLabel: string;
}
