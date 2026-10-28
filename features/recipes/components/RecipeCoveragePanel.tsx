import { Button, Spinner } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { RECIPE_COVERAGE_STATUS, RECIPE_COVERAGE_TEXT } from "../constants/recipes.constants";
import { RecipeCoverageIngredient } from "./RecipeCoverageIngredient";
import type { RecipeCoveragePanelProps } from "./models/RecipeCoveragePanelProps.interface";

/**
 * Panel "Ver qué falta" dentro de la tarjeta: el resumen y cada ingrediente
 * con su estado, o cargando / error / no encontrada. Solo presentación: qué
 * está cubierto lo decide la base y useRecipeCoverage lo mantiene al día.
 *
 * El resumen es role="status": cuando cambia (por ejemplo, al tachar algo en
 * otra pestaña) el lector de pantalla anuncia el resumen nuevo, no toda la
 * lista. El error es role="alert" porque aparece sin que cambie la página.
 */
export const RecipeCoveragePanel = ({ coverage, onRetry }: RecipeCoveragePanelProps): React.JSX.Element => (
  <section
    id={coverage.panelId}
    aria-label={RECIPE_COVERAGE_TEXT.INGREDIENTS_LABEL}
    className="flex flex-col gap-3 rounded-tacha-badge border border-tacha-border p-3"
  >
    {coverage.panelStatus === RECIPE_COVERAGE_STATUS.LOADING ? <Spinner label={RECIPE_COVERAGE_TEXT.LOADING} /> : null}

    {coverage.messageText ? (
      <div role="alert" className="flex flex-col items-start gap-2 font-body text-sm text-red-600">
        <p>{coverage.messageText}</p>
        {/* Reintentar solo sirve si falló la red; una receta que no existe no vuelve. */}
        {coverage.panelStatus === RECIPE_COVERAGE_STATUS.ERROR ? (
          <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onRetry}>
            {RECIPE_COVERAGE_TEXT.RETRY}
          </Button>
        ) : null}
      </div>
    ) : null}

    {coverage.panelStatus === RECIPE_COVERAGE_STATUS.READY ? (
      <>
        <p role="status" className="font-body text-sm font-semibold text-tacha-text">
          {coverage.summaryText}
        </p>
        <ul className="flex flex-col gap-2">
          {coverage.ingredients.map((ingredient) => (
            <RecipeCoverageIngredient key={ingredient.id} ingredient={ingredient} />
          ))}
        </ul>
      </>
    ) : null}
  </section>
);
