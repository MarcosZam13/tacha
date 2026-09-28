import type { NullableUndefined } from "@/types/nullable.types";
import type { RecipeEditorIngredient } from "./RecipeEditorIngredient.interface";

/**
 * Un ingrediente listo para dibujar: el mismo del formulario más su error.
 * Extiende en vez de copiar los campos, así si el ingrediente gana uno nuevo
 * la fila lo recibe sin tocar este archivo.
 */
export interface RecipeIngredientRowViewModel extends RecipeEditorIngredient {
  quantityError: NullableUndefined<string>;
}
