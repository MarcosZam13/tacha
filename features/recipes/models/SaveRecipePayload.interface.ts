import type { CatalogBaseUnitType } from "@/constants";
import type { NullableRef } from "@/types/nullable.types";

/**
 * Lo que se manda a save_recipe, ya validado y convertido a números
 * (nextjs-enterprise-patterns §4). Sin owner_id ni household_id: el dueño
 * lo pone la base con auth.uid().
 */
export interface SaveRecipePayload {
  baseServings: number;
  ingredients: {
    productId: string;
    quantityUnit: CatalogBaseUnitType;
    quantityValue: number;
  }[];
  name: string;
  /** null = receta nueva; con valor = editar esa receta. */
  recipeId: NullableRef<string>;
}
