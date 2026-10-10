import { SERVINGS_MULTIPLIER } from "../constants/meal-planner.constants";
import type { RecipeOption, RecipeOptionRow } from "../models/meal-plan.interfaces";
import { formatResultingServings } from "./formatResultingServings";

/** Adapter: una fila de recipes → una opción del diálogo, con sus porciones base ya escritas. */
export const toRecipeOption = (row: RecipeOptionRow): RecipeOption => ({
  baseServings: row.base_servings,
  id: row.id,
  name: row.name,
  servingsLabel: formatResultingServings(row.base_servings, SERVINGS_MULTIPLIER.DEFAULT),
});
