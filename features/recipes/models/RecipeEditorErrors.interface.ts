/**
 * Un mensaje por campo; sin valor = sin error. Los de cantidad van por
 * productId porque cada ingrediente tiene su propio input.
 */
export interface RecipeEditorErrors {
  baseServings?: string;
  ingredients?: string;
  name?: string;
  quantityByProductId: Record<string, string>;
}
