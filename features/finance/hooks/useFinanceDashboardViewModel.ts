import { useState } from "react";
import { APP_ROUTE } from "@/constants";
import type { NullableRef } from "@/types/nullable.types";
import {
  BUDGET_INPUT_LABEL,
  BUDGET_LABEL,
  BUDGET_STATUS,
  DEFAULT_SPENDING_PERIOD,
  FINANCE_TEXT,
  NO_BUDGET_LABEL,
  PENDING_SECTION_ID,
  SPENDING_PERIOD_LABEL,
  SPENDING_PERIOD_ORDER,
  SPENDING_STATUS,
  SPENT_LABEL,
  TOTAL_SAVE_ERROR,
  TOTAL_SAVE_ERROR_MESSAGE,
} from "../constants/finance.constants";
import type { PendingTotalReminderProps } from "../components/models/PendingTotalReminderProps.interface";
import type { SpendingBudgetProps } from "../components/models/SpendingBudgetProps.interface";
import type { SpendingPeriodOption } from "../components/models/SpendingPeriodSelectorProps.interface";
import type { SpendingTotalProps } from "../components/models/SpendingTotalProps.interface";
import type { FinanceAccessStatusType, SpendingPeriodType } from "../constants/finance.constants";
import type { PeriodSpending } from "../models/PeriodSpending.interface";
import { formatColones } from "../utils/formatColones";
import { formatPeriodRange } from "../utils/formatPeriodRange";
import { toPendingTotalReminder } from "../utils/toPendingTotalReminder";
import { useFinanceAccess } from "./useFinanceAccess";
import { usePendingPurchases } from "./usePendingPurchases";
import { usePeriodPurchases } from "./usePeriodPurchases";
import { useSpendingBudgets } from "./useSpendingBudgets";

interface UseFinanceDashboardViewModelReturn {
  accessStatus: FinanceAccessStatusType;
  budget: SpendingBudgetProps;
  /** El recordatorio de compras sin total, con el enlace a la sección del Historial (SCRUM-92, D26). */
  pendingReminder: PendingTotalReminderProps;
  periodOptions: SpendingPeriodOption[];
  spending: SpendingTotalProps;
  /** Lo que anuncia la zona role="status" (SPEC §9): el total nuevo o "Presupuesto guardado". */
  statusMessage: NullableRef<string>;
}

// "No incluye 1 compra sin total" / "No incluye 3 compras sin total".
const toNotIncludedText = (withoutTotalCount: number): NullableRef<string> => {
  if (withoutTotalCount === 0) return null;
  const noun = withoutTotalCount === 1 ? FINANCE_TEXT.WITHOUT_TOTAL_SINGULAR : FINANCE_TEXT.WITHOUT_TOTAL_PLURAL;
  return `${FINANCE_TEXT.NOT_INCLUDED_PREFIX}${withoutTotalCount} ${noun}`;
};

// SPEC regla 18. Se compara con el total redondeado, que es el que se ve: así
// nunca aparece "Te pasaste por ₡0".
const toDifferenceText = (budgetAmount: number, spending: PeriodSpending): string => {
  const difference = budgetAmount - Math.round(spending.total);
  return difference >= 0
    ? `${FINANCE_TEXT.REMAINING_PREFIX}${formatColones(difference)}`
    : `${FINANCE_TEXT.OVER_BUDGET_PREFIX}${formatColones(-difference)}`;
};

/**
 * Facade del dashboard de Finanzas (SCRUM-69). Decide el acceso (D6: sin
 * cuenta registrada no se pide ningún dato), guarda el periodo elegido (D2,
 * arranca en Semana), compone usePeriodPurchases, useSpendingBudgets y el
 * recordatorio de compras sin total (SCRUM-92), y le entrega a la pantalla
 * exactamente lo que dibuja.
 *
 * Lee el periodo con la misma lectura que el Historial (SCRUM-72, regla 107):
 * el total y el desglose por supermercado salen de las mismas compras. No usa
 * `applySavedPurchase` ni `applySavedPeriodTotal`: el Dashboard no edita (D11).
 */
export const useFinanceDashboardViewModel = (): UseFinanceDashboardViewModelReturn => {
  const { accessStatus, isRegistered, retryIfRegistered } = useFinanceAccess();
  const [period, setPeriod] = useState<SpendingPeriodType>(DEFAULT_SPENDING_PERIOD);

  const periodPurchases = usePeriodPurchases(period, isRegistered);
  const spendingBudgets = useSpendingBudgets(period, isRegistered);
  // El mismo recordatorio que el Historial; acá no se edita ni se listan las compras (D11).
  const pendingPurchases = usePendingPurchases(isRegistered);

  const { spending } = periodPurchases;
  const hasSpending = spending !== null;
  const totalText = spending ? formatColones(spending.total) : null;
  const budgetAmount = spendingBudgets.amount;

  // Con TZ002 no hay totales: el mensaje dice por qué, sin caer a otra zona (regla 60).
  // La zona se confirma desde el Historial.
  const getSpendingErrorMessage = (): NullableRef<string> => {
    if (periodPurchases.status !== SPENDING_STATUS.FAILED) return null;
    return periodPurchases.needsTimeZoneConfirmation
      ? TOTAL_SAVE_ERROR_MESSAGE[TOTAL_SAVE_ERROR.TIME_ZONE_UNRECOGNIZED]
      : FINANCE_TEXT.SPENDING_LOAD_ERROR;
  };

  return {
    accessStatus,
    budget: {
      actionLabel: budgetAmount === null ? FINANCE_TEXT.DEFINE_BUDGET : FINANCE_TEXT.EDIT_BUDGET,
      amountText: budgetAmount === null ? null : formatColones(budgetAmount),
      differenceText: budgetAmount !== null && spending ? toDifferenceText(budgetAmount, spending) : null,
      errorMessage:
        spendingBudgets.status === BUDGET_STATUS.LOAD_FAILED
          ? FINANCE_TEXT.BUDGET_LOAD_ERROR
          : spendingBudgets.editErrorMessage,
      inputLabel: BUDGET_INPUT_LABEL[period],
      label: BUDGET_LABEL[period],
      noBudgetText: NO_BUDGET_LABEL[period],
      notIncludedText: budgetAmount !== null && spending ? toNotIncludedText(spending.withoutTotalCount) : null,
      onCancel: spendingBudgets.onCancel,
      onEdit: spendingBudgets.onEdit,
      onRetry: () => void retryIfRegistered(spendingBudgets.onRetry),
      onSave: spendingBudgets.onSave,
      onTextChange: spendingBudgets.onTextChange,
      status: spendingBudgets.status,
      text: spendingBudgets.editText,
    },
    pendingReminder: toPendingTotalReminder(
      pendingPurchases.reminderStatus,
      pendingPurchases.overdueCount,
      `${APP_ROUTE.FINANCE_HISTORY}#${PENDING_SECTION_ID}`,
      () => void retryIfRegistered(pendingPurchases.onRetry),
    ),
    periodOptions: SPENDING_PERIOD_ORDER.map((optionPeriod) => ({
      isSelected: optionPeriod === period,
      label: SPENDING_PERIOD_LABEL[optionPeriod],
      onSelect: () => setPeriod(optionPeriod),
      period: optionPeriod,
    })),
    spending: {
      closedCount: spending?.closedCount ?? 0,
      errorMessage: getSpendingErrorMessage(),
      label: SPENT_LABEL[period],
      // Solo con ajustes; "Compras" y "Sin total" no cambian (D16, SPEC §8). El Dashboard no edita (D11).
      noteText: spending && spending.adjustmentCount > 0 ? FINANCE_TEXT.INCLUDES_ADJUSTMENTS : null,
      onRetry: () => void retryIfRegistered(periodPurchases.onRetry),
      rangeText:
        periodPurchases.bounds && hasSpending
          ? formatPeriodRange(period, periodPurchases.bounds, periodPurchases.timeZone)
          : null,
      status: periodPurchases.status,
      totalText,
      withoutTotalCount: spending?.withoutTotalCount ?? 0,
    },
    statusMessage: spendingBudgets.noticeMessage ?? (totalText ? `${SPENT_LABEL[period]}: ${totalText}` : null),
  };
};
