import type { NullableRef } from "@/types/nullable.types";

/** Una fila de la lista general tal como la muestra la pantalla. */
export interface ShoppingListItem {
  /** Cuándo se tachó (ISO, hora de la base); null = pendiente. */
  checkedAt: NullableRef<string>;
  id: string;
  productName: string;
  quantity: number;
  sizeLabel: string;
  variantId: string;
}
