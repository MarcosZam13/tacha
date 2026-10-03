import type { RecipeDeletionViewModel } from "../../models/recipe-deletion.interfaces";

/**
 * Todo lo de la eliminación menos onDeleteRequest, que es de la tarjeta: el
 * diálogo se abre desde afuera y solo confirma o cancela.
 */
export type RecipeDeleteDialogProps = Omit<RecipeDeletionViewModel, "onDeleteRequest">;
