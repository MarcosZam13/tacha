import type { ItemCheck } from "./ItemCheck.interface";
import type { NullableRef } from "@/types/nullable.types";
import type { RecipeShortfall } from "./RecipeShortfall.interface";
import type { ShortfallSnapshot } from "./shortfall-resolution.types";

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
  /** A qué vuelve la fila al destachar si "¿Qué hiciste?" la cambió (SCRUM-115); null si no. */
  shortfallSnapshot: NullableRef<ShortfallSnapshot>;
  sizeLabel: string;
  variantId: string;
}
