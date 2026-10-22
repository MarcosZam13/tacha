import { Button, Spinner, StatCard } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { FINANCE_TEXT, SPENDING_STATUS } from "../constants/finance.constants";
import type { SpendingTotalProps } from "./models/SpendingTotalProps.interface";

/**
 * El gasto del periodo elegido (SPEC §6 y §8): el total destacado con sus
 * fechas y dos StatCard, "Compras" y "Sin total". Las compras sin total se
 * muestran aparte, nunca como ₡0 sumado (D3). Solo presentación: el
 * ViewModel ya trae los textos armados.
 */
export const SpendingTotal = ({
  closedCount,
  errorMessage,
  label,
  onRetry,
  rangeText,
  status,
  totalText,
  withoutTotalCount,
}: SpendingTotalProps): React.JSX.Element => {
  if (status === SPENDING_STATUS.LOADING) return <Spinner label={label} />;

  if (status === SPENDING_STATUS.FAILED) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="font-body text-sm text-red-600">
          {errorMessage}
        </p>
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onRetry}>
          {FINANCE_TEXT.RETRY}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="font-body text-sm font-medium text-tacha-textsec">{label}</p>
        <p className="font-display text-4xl font-semibold text-tacha-text">{totalText}</p>
        {rangeText ? <p className="font-body text-sm text-tacha-textsec">{rangeText}</p> : null}
      </div>
      {status === SPENDING_STATUS.EMPTY ? (
        <p className="font-body text-sm text-tacha-textsec">{FINANCE_TEXT.SPENDING_EMPTY}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label={FINANCE_TEXT.PURCHASES} value={String(closedCount)} />
        <StatCard label={FINANCE_TEXT.WITHOUT_TOTAL} value={String(withoutTotalCount)} />
      </div>
    </div>
  );
};
