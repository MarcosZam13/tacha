import type { RecipeEditorViewModel } from "../../models/recipe-editor.interfaces";

/** Subconjunto del ViewModel: si cambia una firma allá, esto se entera solo. */
export type RecipeIngredientsFieldProps = Pick<
  RecipeEditorViewModel,
  | "ingredientNotice"
  | "ingredients"
  | "ingredientsError"
  | "ingredientSearch"
  | "onIngredientQuantityChange"
  | "onIngredientUnitChange"
  | "onRemoveIngredient"
>;
