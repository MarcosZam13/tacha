import type { CatalogBaseUnitType } from "@/constants";
import type { RecipeShortfall, RecipeShortfallRow } from "../models/RecipeShortfall.interface";

/**
 * Filas de get_general_list_shortfalls → los avisos de cada fila de la lista,
 * por id. Conserva el orden de la base (una línea por receta, en el orden en
 * que se registraron). Qué es un aviso ya lo decidió la base: acá no se filtra.
 */
export const toRecipeShortfalls = (shortfallRows: RecipeShortfallRow[]): Map<string, RecipeShortfall[]> => {
  const shortfallsByItemId = new Map<string, RecipeShortfall[]>();

  for (const shortfallRow of shortfallRows) {
    const itemShortfalls = shortfallsByItemId.get(shortfallRow.list_item_id) ?? [];
    itemShortfalls.push({
      quantityMissing: shortfallRow.quantity_missing,
      recipeName: shortfallRow.recipe_name,
      // quantity_unit es text en la base; la RPC solo devuelve ml o g (033).
      unit: shortfallRow.quantity_unit as CatalogBaseUnitType,
    });
    shortfallsByItemId.set(shortfallRow.list_item_id, itemShortfalls);
  }

  return shortfallsByItemId;
};
