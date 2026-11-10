import type { CatalogBaseUnitType } from "@/constants";
import type { Database } from "@/types/database.types";

/** Una fila de get_general_list_recipe_shortfalls (migración 037, faltante en vivo), tal como llega de la base. */
export type RecipeShortfallRow =
  Database["public"]["Functions"]["get_general_list_recipe_shortfalls"]["Returns"][number];

/**
 * Lo que le falta a una fila de la lista para una receta (SCRUM-114): un
 * registro de list_item_recipe_requirements que la base ya filtró como aviso
 * (faltante mayor que 0, en ml o g). Una receta del plan semanal llega igual.
 * Desde SCRUM-115 el faltante es en vivo: lo que hay del producto en la lista
 * contra lo que piden las recetas (SPEC §18, regla 33).
 */
export interface RecipeShortfall {
  quantityMissing: number;
  recipeName: string;
  unit: CatalogBaseUnitType;
}
