import type { NullableRef } from "@/types/nullable.types";

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
    position: number;
    product_catalog: { name: string };
  }[];
}
