import type { NullableUndefined } from "@/types/nullable.types";

/**
 * Un mensaje por campo; undefined = sin error. Los de cantidad van por
 * productId porque cada ingrediente tiene su propio input.
 */
export interface RecipeEditorErrors {
  baseServings?: NullableUndefined<string>;
  ingredients?: NullableUndefined<string>;
  name?: NullableUndefined<string>;
  quantityByProductId: Record<string, string>;
}
