import type { RecipeSummary } from "../../models/recipe-catalog.interfaces";
import type { RecipeDeletionViewModel } from "../../models/recipe-deletion.interfaces";

export interface RecipeCardProps {
  /** Misma firma que el ViewModel: si cambia allá, la tarjeta se entera al compilar. */
  onDeleteRequest: RecipeDeletionViewModel["onDeleteRequest"];
  recipe: RecipeSummary;
}
