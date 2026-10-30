import type { ItemCheck } from "./ItemCheck.interface";

/**
 * Lo que devuelve la base al tachar o destachar con set_list_item_checked.
 * Casi siempre es la misma fila. Si al destachar ya había una pendiente de la
 * misma presentación, la base las junta y devuelve la pendiente (SCRUM-156):
 * `itemId` es otro y `quantity` es la suma.
 */
export interface ItemCheckResult {
  check: ItemCheck;
  itemId: string;
  quantity: number;
}
