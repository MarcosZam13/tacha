import { PLAN_SCOPE_FORM, PLAN_SCOPE_OPTIONS, PLAN_SCOPE_TEXT } from "../constants/meal-planner.constants";
import type { PlanScopeSelectorProps } from "./models/PlanScopeSelectorProps.type";

/**
 * "Mi plan" o "Plan de la familia". Sin familia no dibuja el selector, solo el
 * aviso si la acaba de perder. Solo presentación.
 */
export const PlanScopeSelector = ({
  canChoose,
  isDisabled,
  notice,
  onScopeChange,
  scope,
}: PlanScopeSelectorProps): React.JSX.Element => (
  <>
    {canChoose ? (
      <fieldset disabled={isDisabled} className="min-w-0">
        <legend className="sr-only">{PLAN_SCOPE_TEXT.LEGEND}</legend>
        <div className="flex flex-wrap gap-4 font-body text-sm text-tacha-text">
          {PLAN_SCOPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-tacha-badge border border-tacha-border px-3 py-2 has-[:checked]:border-tacha-teal has-[:checked]:font-semibold"
            >
              <input
                type="radio"
                name={PLAN_SCOPE_FORM.FIELD_NAME}
                value={option.value}
                checked={scope === option.value}
                onChange={() => onScopeChange(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    ) : null}
    {notice ? (
      <p role="alert" className="font-body text-sm text-tacha-terracotta">
        {notice}
      </p>
    ) : null}
  </>
);
