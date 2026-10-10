import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { MEAL_PLANNER_TEXT } from "../constants/meal-planner.constants";
import type { WeekSelectorProps } from "./models/WeekSelectorProps.type";

/**
 * Selector de semana: flecha atrás, el rango ("12 – 18 oct") con su etiqueta
 * ("Esta semana") y flecha adelante. Las flechas no se ocultan: se
 * deshabilitan en el extremo para que se vea que existen y que no hay más.
 *
 * El rango es una región aria-live: al cambiar de semana el lector de
 * pantalla anuncia la nueva sin que haya que buscarla. Las flechas son
 * decorativas; el nombre del botón es el texto oculto.
 */
export const WeekSelector = ({
  canGoToNextWeek,
  canGoToPreviousWeek,
  onNextWeek,
  onPreviousWeek,
  rangeLabel,
  weekLabel,
}: WeekSelectorProps): React.JSX.Element => (
  <div className="flex items-center justify-between gap-3">
    <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={!canGoToPreviousWeek} onClick={onPreviousWeek}>
      <span aria-hidden="true">{MEAL_PLANNER_TEXT.PREVIOUS_ARROW_MARK}</span>
      <span className="sr-only">{MEAL_PLANNER_TEXT.PREVIOUS_WEEK_ARROW}</span>
    </Button>

    <div aria-live="polite" className="flex flex-col items-center">
      <p className="font-display text-xl font-semibold text-tacha-text">{rangeLabel}</p>
      <p className="font-body text-sm text-tacha-textsec">{weekLabel}</p>
    </div>

    <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={!canGoToNextWeek} onClick={onNextWeek}>
      <span aria-hidden="true">{MEAL_PLANNER_TEXT.NEXT_ARROW_MARK}</span>
      <span className="sr-only">{MEAL_PLANNER_TEXT.NEXT_WEEK_ARROW}</span>
    </Button>
  </div>
);
