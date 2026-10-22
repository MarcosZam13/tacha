import type { SpendingPeriodType } from "../../constants/finance.constants";

/** Una opción del selector Día / Semana / Mes. */
export interface SpendingPeriodOption {
  isSelected: boolean;
  label: string;
  onSelect: () => void;
  period: SpendingPeriodType;
}

export interface SpendingPeriodSelectorProps {
  options: SpendingPeriodOption[];
}
