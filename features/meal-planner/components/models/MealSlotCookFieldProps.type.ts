import type { MealSlotDialogViewModel } from "../../models/meal-plan.interfaces";

/** Subconjunto del ViewModel del diálogo: el selector de cocinero. */
export type MealSlotCookFieldProps = Pick<MealSlotDialogViewModel, "cookChoice" | "isSaving" | "onCookChange">;
