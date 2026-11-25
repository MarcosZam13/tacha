import { Button, Spinner } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { COOK_OPTIONS_STATUS, MEAL_SLOT_FORM, MEAL_SLOT_TEXT } from "../constants/meal-planner.constants";
import type { MealSlotCookFieldProps } from "./models/MealSlotCookFieldProps.type";

/**
 * Quién cocina: "Yo", otro miembro (en el plan de la familia) o "Sin cocinero". Si
 * los miembros no cargan, las demás opciones siguen sirviendo. Solo presentación.
 */
export const MealSlotCookField = ({
  cookChoice,
  cookOptions,
  cooksStatus,
  isSaving,
  onCookChange,
  onCooksRetry,
}: MealSlotCookFieldProps): React.JSX.Element => (
  <fieldset disabled={isSaving} className="flex min-w-0 flex-col gap-2">
    <legend className="mb-1 font-body text-sm font-semibold text-tacha-text">{MEAL_SLOT_TEXT.COOK_LABEL}</legend>
    <div className="flex max-h-40 flex-wrap gap-4 overflow-y-auto font-body text-sm text-tacha-text">
      {cookOptions.map((option) => (
        <label key={option.value} className="flex min-w-0 cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={MEAL_SLOT_FORM.COOK_FIELD_NAME}
            value={option.value}
            checked={cookChoice === option.value}
            onChange={() => onCookChange(option.value)}
            className="shrink-0"
          />
          <span className="min-w-0 break-words">{option.label}</span>
        </label>
      ))}
    </div>
    {cooksStatus === COOK_OPTIONS_STATUS.LOADING ? <Spinner label={MEAL_SLOT_TEXT.COOKS_LOADING} /> : null}
    {cooksStatus === COOK_OPTIONS_STATUS.ERROR ? (
      <div role="alert" className="flex flex-col items-start gap-2 font-body text-sm text-red-600">
        <p>{MEAL_SLOT_TEXT.COOKS_LOAD_ERROR}</p>
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onCooksRetry}>
          {MEAL_SLOT_TEXT.RETRY}
        </Button>
      </div>
    ) : null}
  </fieldset>
);
