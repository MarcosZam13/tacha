import type { AddWeekToListResponse, AddWeekToListRow } from "../models/week-list-addition.interfaces";

/**
 * Adapter: convierte lo que devuelve add_week_to_general_list en lo que usa la
 * pantalla (camelCase). Función pura: la forma de la base no sale del servicio.
 * Un producto que falta en dos unidades se nombra una sola vez.
 */
export const toAddWeekToListResponse = (row: AddWeekToListRow): AddWeekToListResponse => ({
  addedProductNames: row.added,
  ingredientCount: row.ingredients,
  mealCount: row.meals,
  missingProductNames: [...new Set(row.missing.map((item) => item.product_name))],
  skippedProductNames: row.skipped,
});
