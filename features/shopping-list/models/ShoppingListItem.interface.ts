import type { ItemCheck } from "./ItemCheck.interface";
import type { RecipeShortfall } from "./RecipeShortfall.interface";

/**
 * Una fila de la lista general tal como la muestra la pantalla. Su estado de
 * tachado (cuándo, en qué compra, cuánto se compró) es un ItemCheck.
 */
export interface ShoppingListItem extends ItemCheck {
  id: string;
  productName: string;
  quantity: number;
  /** Avisos de faltante de receta o plan (SCRUM-114), uno por receta; [] si no tiene. */
  recipeShortfalls: RecipeShortfall[];
  sizeLabel: string;
  variantId: string;
}
