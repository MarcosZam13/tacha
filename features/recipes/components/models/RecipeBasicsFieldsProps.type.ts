import type { RecipeEditorViewModel } from "../../models/recipe-editor.interfaces";

/** Subconjunto del ViewModel: si cambia una firma allá, esto se entera solo. */
export type RecipeBasicsFieldsProps = Pick<
  RecipeEditorViewModel,
  "baseServings" | "baseServingsError" | "name" | "nameError" | "onBaseServingsChange" | "onNameChange"
>;
