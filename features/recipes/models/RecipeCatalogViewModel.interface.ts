import type { NullableRef } from "@/types/nullable.types";
import type { RecipeSummary } from "./RecipeSummary.interface";

/** Lo que useRecipeCatalogViewModel le entrega a RecipeCatalog.tsx, ya calculado. */
export interface RecipeCatalogViewModel {
  errorMessage: NullableRef<string>;
  hasRecipes: boolean;
  isEmpty: boolean;
  isLoading: boolean;
  recipes: RecipeSummary[];
}
