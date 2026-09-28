import type { RecipeEditorViewModel } from "../../models/RecipeEditorViewModel.interface";

/** Subconjunto del ViewModel: si cambia una firma allá, esto se entera solo. */
export type RecipeBasicsFieldsProps = Pick<
  RecipeEditorViewModel,
  "baseServings" | "baseServingsError" | "name" | "nameError" | "onBaseServingsChange" | "onNameChange"
>;
