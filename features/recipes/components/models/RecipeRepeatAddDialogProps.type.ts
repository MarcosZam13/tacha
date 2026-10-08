import type { RecipeListAdditionViewModel } from "../../models/recipe-list-addition.interfaces";

/** Subconjunto del ViewModel: el diálogo de repetir no necesita lo de cada tarjeta. */
export type RecipeRepeatAddDialogProps = Pick<
  RecipeListAdditionViewModel,
  "isRepeatDialogOpen" | "onRepeatCancel" | "onRepeatConfirm" | "repeatRecipeName"
>;
