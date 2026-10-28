import type { NullableRef } from "@/types/nullable.types";
import type { RecipeCoverageViewModel } from "./recipe-coverage.interfaces";
import type { RecipeDeletionViewModel } from "./recipe-deletion.interfaces";
import type { RecipeListAdditionViewModel } from "./recipe-list-addition.interfaces";

// Interfaces del catálogo de recetas (SCRUM-94). La unión de estados de la
// pantalla está en recipe-catalog.types.ts.

/**
 * Una receta tal como la devuelve RECIPES_DB.CATALOG_SELECT. Solo la conoce
 * el adapter (utils/toRecipeSummary.ts): la pantalla nunca ve esta forma.
 */
export interface RecipeRow {
  base_servings: number;
  id: string;
  image_url: NullableRef<string>;
  name: string;
  recipe_ingredients: {
    id: string;
    position: number;
    product_catalog: { name: string };
  }[];
}

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

/** Lo que useRecipeCatalogViewModel le entrega a RecipeCatalog.tsx, ya calculado. */
export interface RecipeCatalogViewModel {
  /** "Ver qué falta" agrupado aparte: lo usan el botón y el panel de cada tarjeta. */
  coverage: RecipeCoverageViewModel;
  /** Eliminación agrupada aparte: solo la usan el diálogo y el botón de cada tarjeta. */
  deletion: RecipeDeletionViewModel;
  errorMessage: NullableRef<string>;
  hasRecipes: boolean;
  isEmpty: boolean;
  isLoading: boolean;
  /** Agregar a la lista agrupado aparte: lo usan el botón de cada tarjeta y el diálogo de repetir. */
  listAddition: RecipeListAdditionViewModel;
  recipes: RecipeSummary[];
}
