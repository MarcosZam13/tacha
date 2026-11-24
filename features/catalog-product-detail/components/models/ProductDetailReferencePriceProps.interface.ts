import type { NullableRef } from "@/types/nullable.types";

export interface ProductDetailReferencePriceProps {
  /** Precio ya formateado ("₡2 850"); null si el usuario solo anotó la tienda. */
  priceLabel: NullableRef<string>;
  /** Tienda de referencia; null si el usuario solo anotó el precio. */
  storeName: NullableRef<string>;
}
