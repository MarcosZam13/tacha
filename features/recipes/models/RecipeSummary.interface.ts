import type { NullableRef } from "@/types/nullable.types";

/** Una receta lista para dibujar en su tarjeta: los textos ya vienen armados. */
export interface RecipeSummary {
  /** Ruta del editor de esta receta ("/recetas/{id}/editar"). */
  editPath: string;
  hasIngredients: boolean;
  id: string;
  imageUrl: NullableRef<string>;
  /** El id es el del ingrediente de la receta: dos productos pueden llamarse igual. */
  mainIngredients: { id: string; name: string }[];
  /** "+2 más" si hay más ingredientes que el límite; null si se ven todos. */
  moreIngredientsLabel: NullableRef<string>;
  name: string;
  /** Letra que se muestra cuando la receta no tiene foto. */
  placeholderInitial: string;
  servingsLabel: string;
}
