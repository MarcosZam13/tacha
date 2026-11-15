import { FINANCE_TEXT } from "../constants/finance.constants";
import type { PeriodAdjustmentRowProps } from "./models/PeriodAdjustmentRowProps.interface";

/**
 * Un ajuste manual del Historial (SCRUM-91, D16): fecha, "Ajuste manual", el
 * nivel en que se escribió y el monto con signo. Sin lápiz: se cambia editando
 * el total del periodo. No es una compra y no cambia ninguna (D10). "Ajuste
 * manual" y el signo se dicen en texto, no solo con color (SPEC §9).
 */
export const PeriodAdjustmentRow = ({
  amountText,
  dateText,
  scopeText,
}: PeriodAdjustmentRowProps): React.JSX.Element => (
  <li className="flex items-center justify-between gap-4 bg-tacha-bg px-4 py-3 font-body">
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="text-sm font-medium text-tacha-text">{dateText}</p>
      <p className="text-sm text-tacha-textsec">{FINANCE_TEXT.ADJUSTMENT}</p>
      <p className="text-xs text-tacha-textsec">{scopeText}</p>
    </div>
    <p className="shrink-0 text-sm font-semibold text-tacha-text">{amountText}</p>
  </li>
);
