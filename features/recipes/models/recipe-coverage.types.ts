import type {
  RECIPE_COVERAGE_INGREDIENT_STATUS,
  RECIPE_COVERAGE_REASON,
  RECIPE_COVERAGE_STATUS,
} from "../constants/recipes.constants";
import type { CoverageIngredient } from "./recipe-coverage.interfaces";

// Types de "Ver qué falta" (SCRUM-98). Las interfaces están en
// recipe-coverage.interfaces.ts.

export type CoverageIngredientStatusType =
  (typeof RECIPE_COVERAGE_INGREDIENT_STATUS)[keyof typeof RECIPE_COVERAGE_INGREDIENT_STATUS];

export type CoverageReasonType = (typeof RECIPE_COVERAGE_REASON)[keyof typeof RECIPE_COVERAGE_REASON];

/**
 * Unión discriminada por `status`. Fuera de `closed` siempre hay una receta
 * elegida, y solo `ready` tiene ingredientes: no se puede llegar a "listo"
 * sin saber qué se revisó. Un solo panel abierto a la vez (regla 33).
 */
export type RecipeCoverageState =
  | { status: typeof RECIPE_COVERAGE_STATUS.CLOSED }
  | { status: typeof RECIPE_COVERAGE_STATUS.LOADING; recipeId: string }
  | { status: typeof RECIPE_COVERAGE_STATUS.ERROR; recipeId: string }
  | { status: typeof RECIPE_COVERAGE_STATUS.NOT_FOUND; recipeId: string }
  | { status: typeof RECIPE_COVERAGE_STATUS.READY; recipeId: string; ingredients: CoverageIngredient[] };

/** Los estados en que hay un panel que dibujar: todos menos `closed`. */
export type RecipeCoveragePanelStatusType = Exclude<
  RecipeCoverageState["status"],
  typeof RECIPE_COVERAGE_STATUS.CLOSED
>;
