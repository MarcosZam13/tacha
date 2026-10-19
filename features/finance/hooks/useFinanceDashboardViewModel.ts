import { useEffect, useRef, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import {
  BUDGET_INPUT_LABEL,
  BUDGET_LABEL,
  BUDGET_STATUS,
  DEFAULT_SPENDING_PERIOD,
  FINANCE_ACCESS_STATUS,
  FINANCE_TEXT,
  NO_BUDGET_LABEL,
  SPENDING_PERIOD_LABEL,
  SPENDING_PERIOD_ORDER,
  SPENDING_STATUS,
  SPENT_LABEL,
} from "../constants/finance.constants";
import type {
  BudgetStatusType,
  FinanceAccessStatusType,
  SpendingPeriodType,
  SpendingStatusType,
} from "../constants/finance.constants";
import type { PeriodSpending } from "../models/PeriodSpending.interface";
import { hasRegisteredSession } from "../services/finance.service";
import { formatColones } from "../utils/formatColones";
import { formatPeriodRange } from "../utils/formatPeriodRange";
import { usePeriodSpending } from "./usePeriodSpending";
import { useSpendingBudgets } from "./useSpendingBudgets";

/** Una opción del selector Día / Semana / Mes. */
interface FinancePeriodOption {
  isSelected: boolean;
  label: string;
  onSelect: () => void;
  period: SpendingPeriodType;
}

/** El bloque del gasto, con solo lo que dibuja la pantalla. */
interface FinanceSpendingSection {
  closedCount: number;
  errorMessage: NullableRef<string>;
  /** "Gastado esta semana". */
  label: string;
  onRetry: () => void;
  /** "Lunes 12 a domingo 18 de octubre"; null mientras carga o con error. */
  rangeText: NullableRef<string>;
  status: SpendingStatusType;
  /** "₡15 000"; null mientras carga o con error. */
  totalText: NullableRef<string>;
  withoutTotalCount: number;
}

/** El bloque del presupuesto, con solo lo que dibuja la pantalla. */
interface FinanceBudgetSection {
  /** "Editar presupuesto" o "Definir presupuesto". */
  actionLabel: string;
  /** "₡50 000"; null si no hay presupuesto para este periodo. */
  amountText: NullableRef<string>;
  /** "Te quedan ₡35 000" / "Te pasaste por ₡3 000"; null sin presupuesto o sin gasto cargado. */
  differenceText: NullableRef<string>;
  /** Error de carga o del campo abierto. */
  errorMessage: NullableRef<string>;
  inputLabel: string;
  /** "Presupuesto semanal". */
  label: string;
  /** "Sin presupuesto semanal". */
  noBudgetText: string;
  /** "No incluye 2 compras sin total"; null si no hay. */
  notIncludedText: NullableRef<string>;
  onCancel: () => void;
  onEdit: () => void;
  onRetry: () => void;
  onSave: () => void;
  onTextChange: (text: string) => void;
  status: BudgetStatusType;
  text: string;
}

interface UseFinanceDashboardViewModelReturn {
  accessStatus: FinanceAccessStatusType;
  budget: FinanceBudgetSection;
  periodOptions: FinancePeriodOption[];
  spending: FinanceSpendingSection;
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
 * arranca en Semana), compone usePeriodSpending y useSpendingBudgets, y le
 * entrega a la pantalla exactamente lo que dibuja.
 */
export const useFinanceDashboardViewModel = (): UseFinanceDashboardViewModelReturn => {
  // Arranca en "checking": el efecto nunca hace un setState síncrono para empezar.
  const [accessStatus, setAccessStatus] = useState<FinanceAccessStatusType>(FINANCE_ACCESS_STATUS.CHECKING);
  const [period, setPeriod] = useState<SpendingPeriodType>(DEFAULT_SPENDING_PERIOD);
  const isMountedRef = useRef<boolean>(true);

  const isRegistered = accessStatus === FINANCE_ACCESS_STATUS.REGISTERED;
  const periodSpending = usePeriodSpending(period, isRegistered);
  const spendingBudgets = useSpendingBudgets(period, isRegistered);

  useEffect(() => {
    isMountedRef.current = true;
    let isCancelled = false;

    // Si no se puede leer la sesión, se trata como "sin cuenta": nunca se
    // piden datos sin saber que la sesión es registrada.
    hasRegisteredSession()
      .catch(() => false)
      .then((isRegisteredSession) => {
        if (!isCancelled) {
          setAccessStatus(isRegisteredSession ? FINANCE_ACCESS_STATUS.REGISTERED : FINANCE_ACCESS_STATUS.NO_ACCOUNT);
        }
      });

    return () => {
      isCancelled = true;
      isMountedRef.current = false;
    };
  }, []);

  // Antes de reintentar se vuelve a leer la sesión: si venció o ya no es
  // registrada, se pasa a "sin cuenta" en vez de volver a pedir datos (SPEC §7).
  const retryIfRegistered = async (retry: () => void): Promise<void> => {
    const isRegisteredSession = await hasRegisteredSession().catch(() => false);
    if (!isMountedRef.current) return;
    if (!isRegisteredSession) {
      setAccessStatus(FINANCE_ACCESS_STATUS.NO_ACCOUNT);
      return;
    }
    retry();
  };

  const { spending } = periodSpending;
  const hasSpending = spending !== null;
  const totalText = spending ? formatColones(spending.total) : null;
  const budgetAmount = spendingBudgets.amount;

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
    periodOptions: SPENDING_PERIOD_ORDER.map((optionPeriod) => ({
      isSelected: optionPeriod === period,
      label: SPENDING_PERIOD_LABEL[optionPeriod],
      onSelect: () => setPeriod(optionPeriod),
      period: optionPeriod,
    })),
    spending: {
      closedCount: spending?.closedCount ?? 0,
      errorMessage: periodSpending.status === SPENDING_STATUS.FAILED ? FINANCE_TEXT.SPENDING_LOAD_ERROR : null,
      label: SPENT_LABEL[period],
      onRetry: () => void retryIfRegistered(periodSpending.onRetry),
      rangeText: periodSpending.bounds && hasSpending ? formatPeriodRange(period, periodSpending.bounds) : null,
      status: periodSpending.status,
      totalText,
      withoutTotalCount: spending?.withoutTotalCount ?? 0,
    },
    statusMessage: spendingBudgets.noticeMessage ?? (totalText ? `${SPENT_LABEL[period]}: ${totalText}` : null),
  };
};
