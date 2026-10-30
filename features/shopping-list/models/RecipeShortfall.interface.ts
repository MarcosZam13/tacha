import type { CatalogBaseUnitType } from "@/constants";
import type { Database } from "@/types/database.types";

/** Una fila de get_general_list_shortfalls (migración 033), tal como llega de la base. */
export type RecipeShortfallRow = Database["public"]["Functions"]["get_general_list_shortfalls"]["Returns"][number];

/**
 * Lo que le falta a una fila de la lista para una receta (SCRUM-114): un
 * registro de list_item_recipe_requirements que la base ya filtró como aviso
 * (faltante mayor que 0, en ml o g). Una receta del plan semanal llega igual.
 */
export interface RecipeShortfall {
  quantityMissing: number;
  recipeName: string;
  unit: CatalogBaseUnitType;
}
