import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { MEAL_SLOT_TEXT } from "../constants/meal-planner.constants";
import type { MealSlotServingsFieldProps } from "./models/MealSlotServingsFieldProps.type";

/**
 * El contador del multiplicador de porciones: "−", el valor ("×2 · 24 porciones")
 * y "+". Los botones se deshabilitan en los extremos (×0,5 y ×4). El valor es
 * aria-live="polite": al subirlo o bajarlo el lector anuncia el resultado. Las
 * marcas "−" y "+" son decorativas; el nombre del botón es el texto oculto.
 */
export const MealSlotServingsField = ({
  canDecreaseServings,
  canIncreaseServings,
  isSaving,
  multiplierLabel,
  onMultiplierDecrease,
  onMultiplierIncrease,
  servingsSummary,
}: MealSlotServingsFieldProps): React.JSX.Element => (
  <fieldset disabled={isSaving} className="flex flex-col gap-2">
    <legend className="mb-1 font-body text-sm font-semibold text-tacha-text">{MEAL_SLOT_TEXT.SERVINGS_LABEL}</legend>
    <div className="flex items-center gap-3">
      <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={!canDecreaseServings || isSaving} onClick={onMultiplierDecrease}>
        <span aria-hidden="true">{MEAL_SLOT_TEXT.SERVINGS_MINUS_MARK}</span>
        <span className="sr-only">{MEAL_SLOT_TEXT.DECREASE_SERVINGS}</span>
      </Button>
      <p aria-live="polite" className="flex-1 text-center font-body text-sm font-semibold text-tacha-text">
        {servingsSummary ?? multiplierLabel}
      </p>
      <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={!canIncreaseServings || isSaving} onClick={onMultiplierIncrease}>
        <span aria-hidden="true">{MEAL_SLOT_TEXT.SERVINGS_PLUS_MARK}</span>
        <span className="sr-only">{MEAL_SLOT_TEXT.INCREASE_SERVINGS}</span>
      </Button>
    </div>
  </fieldset>
);
