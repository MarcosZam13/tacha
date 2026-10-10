import { COOK_OPTIONS, MEAL_SLOT_FORM, MEAL_SLOT_TEXT } from "../constants/meal-planner.constants";
import type { MealSlotCookFieldProps } from "./models/MealSlotCookFieldProps.type";

/**
 * Quién cocina: "Yo" o "Sin cocinero". Hoy no hay otros cocineros que ofrecer
 * (la lista de miembros del household es HU-35); el selector ya sale de una
 * sola lista de opciones para sumarlos sin cambiar esta pantalla.
 */
export const MealSlotCookField = ({ cookChoice, isSaving, onCookChange }: MealSlotCookFieldProps): React.JSX.Element => (
  <fieldset disabled={isSaving} className="flex flex-col gap-2">
    <legend className="mb-1 font-body text-sm font-semibold text-tacha-text">{MEAL_SLOT_TEXT.COOK_LABEL}</legend>
    <div className="flex flex-wrap gap-4 font-body text-sm text-tacha-text">
      {COOK_OPTIONS.map((option) => (
        <label key={option.value} className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={MEAL_SLOT_FORM.COOK_FIELD_NAME}
            value={option.value}
            checked={cookChoice === option.value}
            onChange={() => onCookChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  </fieldset>
);
