import type { RecipeCardCoverage, RecipeCoverageViewModel } from "../../models/recipe-coverage.interfaces";
import type { RecipeSummary } from "../../models/recipe-catalog.interfaces";
import type { RecipeDeletionViewModel } from "../../models/recipe-deletion.interfaces";
import type { RecipeCardCopy, RecipeCopyViewModel } from "../../models/recipe-sharing.interfaces";
import type { RecipeCardAddToList, RecipeListAdditionViewModel } from "../../models/recipe-list-addition.interfaces";

export interface RecipeCardProps {
  /** Estado del botón "Agregar receta a lista" y del resumen de esta tarjeta, ya calculado. */
  addToList: RecipeCardAddToList;
  /** Estado de "Guardar copia personal"; solo se dibuja en las de la familia. */
  copy: RecipeCardCopy;
  /** Estado del botón "Ver qué falta" y de su panel en esta tarjeta, ya calculado. */
  coverage: RecipeCardCoverage;
  /** Mismas firmas que los ViewModels: si cambian allá, la tarjeta se entera al compilar. */
  onAddToListRequest: RecipeListAdditionViewModel["onAddRequest"];
  onCopyRequest: RecipeCopyViewModel["onCopyRequest"];
  onCoverageRetry: RecipeCoverageViewModel["onCoverageRetry"];
  onCoverageToggle: RecipeCoverageViewModel["onCoverageToggle"];
  onDeleteRequest: RecipeDeletionViewModel["onDeleteRequest"];
  recipe: RecipeSummary;
}
