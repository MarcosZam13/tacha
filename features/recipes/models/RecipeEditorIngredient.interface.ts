import type { CatalogBaseUnitType } from "@/constants";

/**
 * Un ingrediente mientras se edita la receta. Queda ligado al producto madre
 * desde que se elige (CA-02). La cantidad es texto porque es lo que hay en
 * el input: "0," o "" se volverían 0 si se guardaran como número al escribir.
 */
export interface RecipeEditorIngredient {
  productId: string;
  productName: string;
  quantity: string;
  unit: CatalogBaseUnitType;
}
