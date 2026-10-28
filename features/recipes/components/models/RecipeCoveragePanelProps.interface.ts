import type { RecipeCardCoverage, RecipeCoverageViewModel } from "../../models/recipe-coverage.interfaces";

export interface RecipeCoveragePanelProps {
  /** Estado del panel de esta tarjeta, ya calculado. */
  coverage: RecipeCardCoverage;
  /** Misma firma que el ViewModel: si cambia allá, el panel se entera al compilar. */
  onRetry: RecipeCoverageViewModel["onCoverageRetry"];
}
