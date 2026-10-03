import type { CatalogBaseUnitType } from "@/constants";
import type { RECIPE_EDITOR_ACTION } from "../constants/recipes.constants";
import type { RecipeEditorErrors, RecipeEditorIngredient, RecipeEditorValues } from "./recipe-editor.interfaces";

// Types del editor de recetas (SCRUM-95). Las interfaces (formulario,
// estado, ViewModel y mutación) están en recipe-editor.interfaces.ts.

/**
 * Unión discriminada por `type`: en cada `case` del reducer TypeScript sabe
 * qué otros campos trae la acción (ej. `productId` solo en las de ingrediente).
 */
export type RecipeEditorAction =
  | { type: typeof RECIPE_EDITOR_ACTION.BASE_SERVINGS_CHANGED; baseServings: string }
  | { type: typeof RECIPE_EDITOR_ACTION.INGREDIENT_ADDED; ingredient: RecipeEditorIngredient }
  | { type: typeof RECIPE_EDITOR_ACTION.INGREDIENT_QUANTITY_CHANGED; productId: string; quantity: string }
  | { type: typeof RECIPE_EDITOR_ACTION.INGREDIENT_REMOVED; productId: string }
  | { type: typeof RECIPE_EDITOR_ACTION.INGREDIENT_UNIT_CHANGED; productId: string; unit: CatalogBaseUnitType }
  | { type: typeof RECIPE_EDITOR_ACTION.LOAD_FAILED }
  | { type: typeof RECIPE_EDITOR_ACTION.LOADED; values: RecipeEditorValues }
  | { type: typeof RECIPE_EDITOR_ACTION.NAME_CHANGED; name: string }
  | { type: typeof RECIPE_EDITOR_ACTION.NOT_FOUND }
  | { type: typeof RECIPE_EDITOR_ACTION.SAVE_FAILED }
  | { type: typeof RECIPE_EDITOR_ACTION.SAVE_STARTED }
  | { type: typeof RECIPE_EDITOR_ACTION.VALIDATION_FAILED; errors: RecipeEditorErrors };
