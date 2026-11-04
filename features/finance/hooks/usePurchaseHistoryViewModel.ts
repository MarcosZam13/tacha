import { useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import {
  DEFAULT_SPENDING_PERIOD,
  FINANCE_TEXT,
  SPENDING_PERIOD_LABEL,
  SPENDING_PERIOD_ORDER,
  SPENDING_STATUS,
  SPENT_LABEL,
} from "../constants/finance.constants";
import type { PurchaseSessionRowProps } from "../components/models/PurchaseSessionRowProps.interface";
import type { SpendingPeriodOption } from "../components/models/SpendingPeriodSelectorProps.interface";
import type { SpendingTotalProps } from "../components/models/SpendingTotalProps.interface";
import type { FinanceAccessStatusType, SpendingPeriodType } from "../constants/finance.constants";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import { formatColones } from "../utils/formatColones";
import { formatDay, formatPeriodRange } from "../utils/formatPeriodRange";
import { useFinanceAccess } from "./useFinanceAccess";
import { usePeriodPurchases } from "./usePeriodPurchases";

interface UsePurchaseHistoryViewModelReturn {
  accessStatus: FinanceAccessStatusType;
  periodOptions: SpendingPeriodOption[];
  /** Vacía mientras carga, sin compras o con error: en esos estados no hay lista. */
  purchaseRows: PurchaseSessionRowProps[];
  spending: SpendingTotalProps;
  /** Lo que anuncia la zona role="status" (SPEC §9): el total nuevo. */
  statusMessage: NullableRef<string>;
}

// Un total nulo es "Sin total", nunca ₡0; un total de 0 sí es ₡0 (D8).
const toPurchaseRow = ({ closedAt, id, storeName, totalAmount }: PeriodPurchase): PurchaseSessionRowProps => ({
  amountText: totalAmount === null ? FINANCE_TEXT.WITHOUT_TOTAL : formatColones(totalAmount),
  dateText: formatDay(new Date(closedAt)),
  id,
  storeText: storeName ?? FINANCE_TEXT.STORE_UNAVAILABLE,
});

/**
 * Facade del Historial de Finanzas (SCRUM-90). Decide el acceso (D6), guarda el
 * periodo elegido (arranca en Semana y no se conserva entre tabs, D9) y le
 * entrega a la pantalla exactamente lo que dibuja.
 */
export const usePurchaseHistoryViewModel = (): UsePurchaseHistoryViewModelReturn => {
  const { accessStatus, isRegistered, retryIfRegistered } = useFinanceAccess();
  const [period, setPeriod] = useState<SpendingPeriodType>(DEFAULT_SPENDING_PERIOD);
  const { bounds, onRetry, purchases, spending, status } = usePeriodPurchases(period, isRegistered);

  const totalText = spending ? formatColones(spending.total) : null;

  return {
    accessStatus,
    periodOptions: SPENDING_PERIOD_ORDER.map((optionPeriod) => ({
      isSelected: optionPeriod === period,
      label: SPENDING_PERIOD_LABEL[optionPeriod],
      onSelect: () => setPeriod(optionPeriod),
      period: optionPeriod,
    })),
    purchaseRows: purchases?.map(toPurchaseRow) ?? [],
    spending: {
      closedCount: spending?.closedCount ?? 0,
      errorMessage: status === SPENDING_STATUS.FAILED ? FINANCE_TEXT.SPENDING_LOAD_ERROR : null,
      label: SPENT_LABEL[period],
      onRetry: () => void retryIfRegistered(onRetry),
      rangeText: bounds && spending ? formatPeriodRange(period, bounds) : null,
      status,
      totalText,
      withoutTotalCount: spending?.withoutTotalCount ?? 0,
    },
    statusMessage: totalText ? `${SPENT_LABEL[period]}: ${totalText}` : null,
  };
};
