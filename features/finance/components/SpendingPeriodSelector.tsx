import { FINANCE_TEXT } from "../constants/finance.constants";
import type { SpendingPeriodSelectorProps } from "./models/SpendingPeriodSelectorProps.interface";

const OPTION_CLASS_NAME = {
  SELECTED: "border-tacha-teal bg-tacha-teal text-white",
  UNSELECTED: "border-tacha-border bg-tacha-surface text-tacha-text hover:border-tacha-teal",
} as const;

/**
 * Día / Semana / Mes como pills (DESIGN.md §7.9 y §7.11; SPEC §8 y §9). Son
 * botones nativos con aria-pressed dentro de un grupo con nombre ("Periodo"):
 * Button de components/ui no expone aria-pressed. Se usan con Tab y Enter o
 * Espacio, y la opción elegida va en teal sólido.
 */
export const SpendingPeriodSelector = ({ options }: SpendingPeriodSelectorProps): React.JSX.Element => (
  <div role="group" aria-label={FINANCE_TEXT.PERIOD_GROUP_LABEL} className="flex flex-wrap gap-2">
    {options.map((option) => (
      <button
        key={option.period}
        type="button"
        aria-pressed={option.isSelected}
        onClick={option.onSelect}
        className={`rounded-full border px-4 py-1.5 font-body text-sm font-semibold transition-colors ${
          option.isSelected ? OPTION_CLASS_NAME.SELECTED : OPTION_CLASS_NAME.UNSELECTED
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);
