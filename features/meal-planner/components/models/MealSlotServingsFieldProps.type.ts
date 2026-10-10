import type { MealSlotDialogViewModel } from "../../models/meal-plan.interfaces";

/** Subconjunto del ViewModel del diálogo: el contador del multiplicador. */
export type MealSlotServingsFieldProps = Pick<
  MealSlotDialogViewModel,
  | "canDecreaseServings"
  | "canIncreaseServings"
  | "isSaving"
  | "multiplierLabel"
  | "onMultiplierDecrease"
  | "onMultiplierIncrease"
  | "servingsSummary"
>;
