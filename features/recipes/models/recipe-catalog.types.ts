import type { RECIPE_CATALOG_STATUS } from "../constants/recipes.constants";
import type { RecipeSummary } from "./recipe-catalog.interfaces";

// Types del catálogo de recetas (SCRUM-94). Las interfaces están en
// recipe-catalog.interfaces.ts.

/**
 * Unión discriminada por `status`: la pantalla está en uno solo de estos
 * estados, y `recipes` solo existe cuando ya cargó. Con tres booleanos
 * (isLoading, hasError, ...) se podría llegar a "cargando y con error".
 */
export type RecipeCatalogState =
  | { status: typeof RECIPE_CATALOG_STATUS.ERROR }
  | { status: typeof RECIPE_CATALOG_STATUS.LOADING }
  | { status: typeof RECIPE_CATALOG_STATUS.READY; recipes: RecipeSummary[] };
