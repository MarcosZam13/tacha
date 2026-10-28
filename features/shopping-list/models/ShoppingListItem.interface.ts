import type { ItemCheck } from "./ItemCheck.interface";

/**
 * Una fila de la lista general tal como la muestra la pantalla. Su estado de
 * tachado (cuándo, en qué compra, cuánto se compró) es un ItemCheck.
 */
export interface ShoppingListItem extends ItemCheck {
  id: string;
  productName: string;
  quantity: number;
  sizeLabel: string;
  variantId: string;
}
