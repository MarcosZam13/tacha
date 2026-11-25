import type { MealSlotDialogViewModel } from "../../models/meal-plan.interfaces";

/** Subconjunto del ViewModel del diálogo: la lista de recetas. */
export type MealSlotRecipeListProps = Pick<
  MealSlotDialogViewModel,
  "isSaving" | "noRecipesText" | "onRecipeChoose" | "onRecipesRetry" | "recipeOptions" | "recipesStatus" | "selectedRecipeId"
>;
