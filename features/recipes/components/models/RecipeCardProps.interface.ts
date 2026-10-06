import type { RecipeSummary } from "../../models/recipe-catalog.interfaces";
import type { RecipeDeletionViewModel } from "../../models/recipe-deletion.interfaces";
import type { RecipeCardAddToList, RecipeListAdditionViewModel } from "../../models/recipe-list-addition.interfaces";

export interface RecipeCardProps {
  /** Estado del botón "Agregar receta a lista" y del resumen de esta tarjeta, ya calculado. */
  addToList: RecipeCardAddToList;
  /** Mismas firmas que los ViewModels: si cambian allá, la tarjeta se entera al compilar. */
  onAddToListRequest: RecipeListAdditionViewModel["onAddRequest"];
  onDeleteRequest: RecipeDeletionViewModel["onDeleteRequest"];
  recipe: RecipeSummary;
}
