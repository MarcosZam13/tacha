import type { CatalogBaseUnitType } from "@/constants";
import type { AddRecipeToListResponse, AddRecipeToListRow } from "../models/recipe-list-addition.interfaces";

/**
 * Adapter: convierte lo que devuelve add_recipe_to_general_list en lo que usa
 * la pantalla (camelCase, unidad tipada). Es una función pura: la forma de la
 * base no sale del servicio.
 */
export const toAddRecipeToListResponse = (row: AddRecipeToListRow): AddRecipeToListResponse => ({
  addedProductNames: row.added,
  missingItems: row.missing.map((item) => ({
    productName: item.product_name,
    quantity: item.quantity,
    // La RPC copia quantity_unit del ingrediente, que el check de la base limita a las 3 unidades.
    unit: item.unit as CatalogBaseUnitType,
  })),
  skippedProductNames: row.skipped,
});
