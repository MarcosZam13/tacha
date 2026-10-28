import type { MealSlotDialogViewModel } from "../../models/meal-plan.interfaces";

/** Todo el diálogo menos onSlotOpen, que es de los espacios: el diálogo se abre desde afuera. */
export type MealSlotDialogProps = Omit<MealSlotDialogViewModel, "onSlotOpen">;
