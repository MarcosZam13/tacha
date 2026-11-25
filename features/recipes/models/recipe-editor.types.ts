import type { CatalogBaseUnitType } from "@/constants";
import type { RECIPE_EDITOR_ACTION, RecipeAudienceType, SAVE_RECIPE_OUTCOME } from "../constants/recipes.constants";
import type { RecipeEditorErrors, RecipeEditorIngredient, RecipeForEditing } from "./recipe-editor.interfaces";

// Types del editor de recetas (SCRUM-95). Las interfaces (formulario,
// estado, ViewModel y mutación) están en recipe-editor.interfaces.ts.

/**
 * Unión discriminada por `type`: en cada `case` del reducer TypeScript sabe
 * qué otros campos trae la acción (ej. `productId` solo en las de ingrediente).
 */
export type RecipeEditorAction =
  | { type: typeof RECIPE_EDITOR_ACTION.AUDIENCE_CHANGED; audience: RecipeAudienceType }
  | { type: typeof RECIPE_EDITOR_ACTION.BASE_SERVINGS_CHANGED; baseServings: string }
  | { type: typeof RECIPE_EDITOR_ACTION.INGREDIENT_ADDED; ingredient: RecipeEditorIngredient }
  | { type: typeof RECIPE_EDITOR_ACTION.INGREDIENT_QUANTITY_CHANGED; productId: string; quantity: string }
  | { type: typeof RECIPE_EDITOR_ACTION.INGREDIENT_REMOVED; productId: string }
  | { type: typeof RECIPE_EDITOR_ACTION.INGREDIENT_UNIT_CHANGED; productId: string; unit: CatalogBaseUnitType }
  | { type: typeof RECIPE_EDITOR_ACTION.LOAD_FAILED }
  | ({ type: typeof RECIPE_EDITOR_ACTION.LOADED } & RecipeForEditing)
  | { type: typeof RECIPE_EDITOR_ACTION.NAME_CHANGED; name: string }
  | { type: typeof RECIPE_EDITOR_ACTION.NOT_FOUND }
  | { type: typeof RECIPE_EDITOR_ACTION.SAVE_FAILED; message: string }
  | { type: typeof RECIPE_EDITOR_ACTION.SAVE_STARTED }
  | {
      type: typeof RECIPE_EDITOR_ACTION.SAVED_PARTIALLY;
      /** Ya no tiene familia: se vuelve a "Solo para mí". */
      hasLostHousehold: boolean;
      message: string;
      recipeId: string;
    }
  | { type: typeof RECIPE_EDITOR_ACTION.VALIDATION_FAILED; errors: RecipeEditorErrors };

/**
 * Cómo terminó el guardado completo. Solo lo que quedó guardado a medias lleva el
 * id de la receta: sin él, la receta no se guardó.
 */
export type SaveRecipeOutcome =
  | { kind: typeof SAVE_RECIPE_OUTCOME.NOT_FOUND }
  | { kind: typeof SAVE_RECIPE_OUTCOME.SAVED }
  | { kind: typeof SAVE_RECIPE_OUTCOME.SAVE_FAILED }
  | { kind: typeof SAVE_RECIPE_OUTCOME.PERSONAL_PRODUCTS; productNames: string[]; recipeId?: string }
  | {
      kind:
        | typeof SAVE_RECIPE_OUTCOME.HOUSEHOLD_LIMIT
        | typeof SAVE_RECIPE_OUTCOME.NO_HOUSEHOLD
        | typeof SAVE_RECIPE_OUTCOME.PHOTO_FAILED
        | typeof SAVE_RECIPE_OUTCOME.SHARE_FAILED;
      recipeId: string;
    };
