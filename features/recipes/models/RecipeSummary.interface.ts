import type { NullableRef } from "@/types/nullable.types";

/** Una receta lista para dibujar en su tarjeta: los textos ya vienen armados. */
export interface RecipeSummary {
  id: string;
  imageUrl: NullableRef<string>;
  mainIngredientNames: string[];
  /** "+2 más" si hay más ingredientes que el límite; null si se ven todos. */
  moreIngredientsLabel: NullableRef<string>;
  name: string;
  /** Letra que se muestra cuando la receta no tiene foto. */
  placeholderInitial: string;
  servingsLabel: string;
}
