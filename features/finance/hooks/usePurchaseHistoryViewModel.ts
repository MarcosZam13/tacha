import { useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import {
  ADJUSTMENT_SCOPE_LABEL,
  DEFAULT_SPENDING_PERIOD,
  EDIT_PERIOD_TOTAL_LABEL,
  HISTORY_ROW_KIND,
  FINANCE_TEXT,
  PERIOD_RANGE_FORMAT,
  PERIOD_TOTAL_INPUT_LABEL,
  SPENDING_PERIOD_LABEL,
  SPENDING_PERIOD_ORDER,
  SPENDING_STATUS,
  SPENT_LABEL,
  TOTAL_EDIT_STATUS,
  TOTAL_EDIT_TARGET,
  TOTAL_SAVE_ERROR,
  TOTAL_SAVE_ERROR_MESSAGE,
} from "../constants/finance.constants";
import type { EditTotalButtonProps } from "../components/models/EditTotalButtonProps.interface";
import type { InlineTotalEditorProps } from "../components/models/InlineTotalEditorProps.interface";
import type { PeriodAdjustmentRowProps } from "../components/models/PeriodAdjustmentRowProps.interface";
import type { PurchaseSessionRowProps } from "../components/models/PurchaseSessionRowProps.interface";
import type { SpendingPeriodOption } from "../components/models/SpendingPeriodSelectorProps.interface";
import type { SpendingTotalProps } from "../components/models/SpendingTotalProps.interface";
import type { TimeZoneConfirmationProps } from "../components/models/TimeZoneConfirmationProps.interface";
import type { FinanceAccessStatusType, HistoryRowKindType, SpendingPeriodType } from "../constants/finance.constants";
import type { PeriodAdjustment } from "../models/PeriodAdjustment.interface";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import { formatColones } from "../utils/formatColones";
import { formatDay, formatPeriodRange } from "../utils/formatPeriodRange";
import { formatSignedColones } from "../utils/formatSignedColones";
import { useFinanceAccess } from "./useFinanceAccess";
import { usePeriodPurchases } from "./usePeriodPurchases";
import { useTotalEdit } from "./useTotalEdit";
import type { TotalEditTarget } from "./useTotalEdit";

/** Una fila de la lista del Historial: una compra o un ajuste manual, en el orden en que se ven. */
export type HistoryListRow =
  | { kind: typeof HISTORY_ROW_KIND.ADJUSTMENT; row: PeriodAdjustmentRowProps }
  | { kind: typeof HISTORY_ROW_KIND.PURCHASE; row: PurchaseSessionRowProps };


interface UsePurchaseHistoryViewModelReturn {
  accessStatus: FinanceAccessStatusType;
  /**
   * Compras y ajustes juntos, de lo más reciente a lo más antiguo (SPEC §8). Vacía
   * mientras carga, sin filas o con error.
   */
  listRows: HistoryListRow[];
  /** El lápiz del total del periodo; null mientras carga o con error (SPEC §6). */
  periodEdit: NullableRef<EditTotalButtonProps>;
  /** El campo del total del periodo, si es el abierto (D21). */
  periodEditor: NullableRef<InlineTotalEditorProps>;
  periodOptions: SpendingPeriodOption[];
  /** Vacía mientras carga, sin compras o con error: en esos estados no hay lista. */
  purchaseRows: PurchaseSessionRowProps[];
  spending: SpendingTotalProps;
  /** Lo que anuncia la zona role="status" (SPEC §9): el total nuevo, o "Total guardado" y el total. */
  statusMessage: NullableRef<string>;
  /** Con TZ002 al leer: confirmar la zona del navegador; null si no hace falta. */
  timeZoneConfirmation: NullableRef<TimeZoneConfirmationProps>;
}

// De lo más reciente a lo más antiguo, como las compras (regla 26). A igual
// instante, primero la compra.
const toListOrder = (instant: string, kind: HistoryRowKindType): [number, number] => [
  -new Date(instant).getTime(),
  kind === HISTORY_ROW_KIND.PURCHASE ? 0 : 1,
];

// D22: el campo abre con el total redondeado que se ve, o vacío si es "Sin total".
const toInitialText = (total: NullableRef<number>): string => (total === null ? "" : String(Math.round(total)));

// "Domingo 18 de octubre" → "domingo 18 de octubre", dentro del nombre del lápiz.
const toLowerFirst = (text: string): string =>
  text.charAt(0).toLocaleLowerCase(PERIOD_RANGE_FORMAT.LOCALE) + text.slice(1);

/**
 * Facade del Historial de Finanzas (SCRUM-90 y SCRUM-91). Decide el acceso (D6),
 * guarda el periodo elegido (arranca en Semana y no se conserva entre tabs, D9),
 * compone la lectura del periodo y la edición de totales, y le entrega a la
 * pantalla exactamente lo que dibuja.
 */
export const usePurchaseHistoryViewModel = (): UsePurchaseHistoryViewModelReturn => {
  const { accessStatus, isRegistered, retryIfRegistered } = useFinanceAccess();
  const [period, setPeriod] = useState<SpendingPeriodType>(DEFAULT_SPENDING_PERIOD);
  const periodPurchases = usePeriodPurchases(period, isRegistered);
  const { bounds, purchases, spending, status, timeZone } = periodPurchases;
  const totalEdit = useTotalEdit({
    onPeriodTotalSaved: periodPurchases.applySavedPeriodTotal,
    onPurchaseSaved: periodPurchases.applySavedPurchase,
    onReadTimeZoneConfirmed: periodPurchases.onRetry,
    period,
  });

  const totalText = spending ? formatColones(spending.total) : null;
  // Mientras se guarda un total, los demás lápices quedan deshabilitados (D21).
  const isSaving = totalEdit.status === TOTAL_EDIT_STATUS.SAVING;
  const { editTarget } = totalEdit;

  const toEditor = (inputLabel: string): InlineTotalEditorProps => ({
    errorMessage: totalEdit.editErrorMessage,
    inputLabel,
    onCancel: totalEdit.onCancel,
    onConfirmTimeZone: totalEdit.onConfirmTimeZone,
    // Antes de guardar se vuelve a leer la sesión: si venció, la pantalla pasa a "sin cuenta" (SPEC §7).
    onSave: () => void retryIfRegistered(totalEdit.onSave),
    onTextChange: totalEdit.onTextChange,
    status: totalEdit.status,
    text: totalEdit.editText,
    timeZoneToConfirm: totalEdit.timeZoneToConfirm,
  });

  const toEditButton = (label: string, target: TotalEditTarget, total: NullableRef<number>): EditTotalButtonProps => ({
    isDisabled: isSaving,
    label,
    onClick: () => totalEdit.onEdit(target, toInitialText(total)),
  });

  // Un total nulo es "Sin total", nunca ₡0; un total de 0 sí es ₡0 (D8). La fecha,
  // en la zona guardada si hay (SCRUM-91, regla 58). Las "Sin total" también tienen lápiz (D12).
  const toPurchaseRow = ({ closedAt, id, storeName, totalAmount }: PeriodPurchase): PurchaseSessionRowProps => {
    const dateText = formatDay(new Date(closedAt), timeZone);
    const storeText = storeName ?? FINANCE_TEXT.STORE_UNAVAILABLE;
    const isEditing = editTarget?.type === TOTAL_EDIT_TARGET.PURCHASE && editTarget.purchaseId === id;

    return {
      amountText: totalAmount === null ? FINANCE_TEXT.WITHOUT_TOTAL : formatColones(totalAmount),
      dateText,
      edit: toEditButton(
        `${FINANCE_TEXT.EDIT_PURCHASE_TOTAL_PREFIX}${toLowerFirst(dateText)}${FINANCE_TEXT.EDIT_PURCHASE_TOTAL_SEPARATOR}${storeText}`,
        { purchaseId: id, type: TOTAL_EDIT_TARGET.PURCHASE },
        totalAmount,
      ),
      editor: isEditing ? toEditor(FINANCE_TEXT.PURCHASE_TOTAL_INPUT_LABEL) : null,
      id,
      storeText,
    };
  };

  // Sin lápiz: un ajuste se cambia editando el total del periodo (D16).
  const toAdjustmentRow = ({ amount, effectiveAt, id, scope }: PeriodAdjustment): PeriodAdjustmentRowProps => ({
    amountText: formatSignedColones(amount),
    dateText: formatDay(new Date(effectiveAt), timeZone),
    id,
    scopeText: ADJUSTMENT_SCOPE_LABEL[scope],
  });

  const toListRows = (): HistoryListRow[] => {
    const purchaseRows = (purchases ?? []).map((purchase) => ({
      order: toListOrder(purchase.closedAt, HISTORY_ROW_KIND.PURCHASE),
      row: { kind: HISTORY_ROW_KIND.PURCHASE, row: toPurchaseRow(purchase) } satisfies HistoryListRow,
    }));
    const adjustmentRows = (periodPurchases.adjustments ?? []).map((adjustment) => ({
      order: toListOrder(adjustment.effectiveAt, HISTORY_ROW_KIND.ADJUSTMENT),
      row: { kind: HISTORY_ROW_KIND.ADJUSTMENT, row: toAdjustmentRow(adjustment) } satisfies HistoryListRow,
    }));

    return [...purchaseRows, ...adjustmentRows]
      .sort((first, second) => first.order[0] - second.order[0] || first.order[1] - second.order[1])
      .map(({ row }) => row);
  };

  // El lápiz del periodo, solo con el periodo cargado: también vacío (D17), nunca cargando ni con error.
  const canEditPeriod = spending !== null && (status === SPENDING_STATUS.READY || status === SPENDING_STATUS.EMPTY);
  const isEditingPeriod = editTarget?.type === TOTAL_EDIT_TARGET.PERIOD && editTarget.period === period;

  const getStatusMessage = (): NullableRef<string> => {
    if (!totalText) return null;
    const spentText = `${SPENT_LABEL[period]}: ${totalText}`;
    return totalEdit.hasSaved ? `${FINANCE_TEXT.TOTAL_SAVED}. ${spentText}` : spentText;
  };

  const getSpendingErrorMessage = (): NullableRef<string> => {
    if (status !== SPENDING_STATUS.FAILED) return null;
    return periodPurchases.needsTimeZoneConfirmation
      ? TOTAL_SAVE_ERROR_MESSAGE[TOTAL_SAVE_ERROR.TIME_ZONE_UNRECOGNIZED]
      : FINANCE_TEXT.SPENDING_LOAD_ERROR;
  };

  return {
    accessStatus,
    listRows: toListRows(),
    periodEdit: canEditPeriod
      ? toEditButton(EDIT_PERIOD_TOTAL_LABEL[period], { period, type: TOTAL_EDIT_TARGET.PERIOD }, spending.total)
      : null,
    periodEditor: canEditPeriod && isEditingPeriod ? toEditor(PERIOD_TOTAL_INPUT_LABEL[period]) : null,
    periodOptions: SPENDING_PERIOD_ORDER.map((optionPeriod) => ({
      isSelected: optionPeriod === period,
      label: SPENDING_PERIOD_LABEL[optionPeriod],
      onSelect: () => setPeriod(optionPeriod),
      period: optionPeriod,
    })),
    purchaseRows: purchases?.map(toPurchaseRow) ?? [],
    spending: {
      closedCount: spending?.closedCount ?? 0,
      errorMessage: getSpendingErrorMessage(),
      label: SPENT_LABEL[period],
      onRetry: () => void retryIfRegistered(periodPurchases.onRetry),
      rangeText: bounds && spending ? formatPeriodRange(period, bounds, timeZone) : null,
      status,
      totalText,
      withoutTotalCount: spending?.withoutTotalCount ?? 0,
    },
    statusMessage: getStatusMessage(),
    timeZoneConfirmation: periodPurchases.needsTimeZoneConfirmation
      ? {
          errorMessage: totalEdit.readTimeZoneConfirmation.errorMessage,
          isSaving: totalEdit.readTimeZoneConfirmation.isSaving,
          onConfirm: () => void retryIfRegistered(totalEdit.onConfirmReadTimeZone),
          timeZone: totalEdit.readTimeZoneConfirmation.timeZone,
        }
      : null,
  };
};
