import { useEffect, useRef, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { BUDGET_STATUS, FINANCE_TEXT } from "../constants/finance.constants";
import type { BudgetStatusType, SpendingPeriodType } from "../constants/finance.constants";
import type { SpendingBudgets } from "../models/SpendingBudgets.type";
import { getSpendingBudgets, setSpendingBudget } from "../services/finance.service";
import { parseBudgetAmount } from "../utils/parseBudgetAmount";

/** Los tres presupuestos, o null si la carga falló, con la carga que los pidió. */
interface BudgetsResponse {
  budgets: NullableRef<SpendingBudgets>;
  reloadCount: number;
}

/** El campo abierto: de qué periodo es, qué se escribió y si está guardando o falló. */
interface BudgetEdit {
  errorMessage: NullableRef<string>;
  hasSaveFailed: boolean;
  isSaving: boolean;
  period: SpendingPeriodType;
  text: string;
}

interface UseSpendingBudgetsReturn {
  /** El presupuesto del periodo elegido; null si no hay uno o todavía no cargó. */
  amount: NullableRef<number>;
  /** Error de validación o de guardado del campo abierto. */
  editErrorMessage: NullableRef<string>;
  editText: string;
  /** "Presupuesto guardado" del periodo elegido; se borra al volver a editar o al cambiar de periodo. */
  noticeMessage: NullableRef<string>;
  onCancel: () => void;
  onEdit: () => void;
  onRetry: () => void;
  onSave: () => void;
  onTextChange: (text: string) => void;
  status: BudgetStatusType;
}

/**
 * Los presupuestos diario, semanal y mensual (SPEC D1, reglas 14 a 20). Se
 * piden los tres una sola vez, solo si `isEnabled` (cuenta registrada, D6), y
 * cambiar de periodo no los vuelve a pedir.
 *
 * El campo abierto recuerda de qué periodo es y se descarta al cambiar de
 * periodo (regla 19).
 */
export const useSpendingBudgets = (period: SpendingPeriodType, isEnabled: boolean): UseSpendingBudgetsReturn => {
  // Sube con "Reintentar": vuelve a pedir los tres.
  const [reloadCount, setReloadCount] = useState<number>(0);
  const [response, setResponse] = useState<NullableRef<BudgetsResponse>>(null);
  const [edit, setEdit] = useState<NullableRef<BudgetEdit>>(null);
  // De qué periodo es el último presupuesto guardado: el aviso solo se ve en ese periodo.
  const [savedPeriod, setSavedPeriod] = useState<NullableRef<SpendingPeriodType>>(null);
  // Doble clic en "Guardar": dos clics en el mismo render ven el mismo estado.
  const isSavingRef = useRef<boolean>(false);
  // Si la pantalla se cierra mientras guarda, la respuesta se ignora.
  const isMountedRef = useRef<boolean>(true);

  // Cambiar de periodo descarta lo escrito (regla 19), también al volver al
  // periodo anterior. Se ajusta durante el render comparando con el periodo
  // anterior (patrón de React para reiniciar estado cuando cambia una prop),
  // sin setState en un efecto. Un guardado en curso no se descarta: su
  // respuesta cierra el campo o muestra el error cuando llegue.
  const [renderedPeriod, setRenderedPeriod] = useState<SpendingPeriodType>(period);
  if (renderedPeriod !== period) {
    setRenderedPeriod(period);
    if (edit && !edit.isSaving) setEdit(null);
  }

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isEnabled) return undefined;

    let isCancelled = false;
    getSpendingBudgets()
      .then((budgets) => {
        if (!isCancelled) setResponse({ budgets, reloadCount });
      })
      .catch(() => {
        if (!isCancelled) setResponse({ budgets: null, reloadCount });
      });

    return () => {
      isCancelled = true;
    };
  }, [isEnabled, reloadCount]);

  const currentResponse = isEnabled && response?.reloadCount === reloadCount ? response : null;
  const budgets = currentResponse?.budgets ?? null;
  const amount = budgets?.[period] ?? null;
  // Solo el campo del periodo elegido; el de otro periodo quedó descartado.
  const currentEdit = edit?.period === period ? edit : null;

  const getStatus = (): BudgetStatusType => {
    if (!currentResponse) return BUDGET_STATUS.LOADING;
    if (!budgets) return BUDGET_STATUS.LOAD_FAILED;
    if (!currentEdit) return BUDGET_STATUS.VIEWING;
    if (currentEdit.isSaving) return BUDGET_STATUS.SAVING;
    return currentEdit.hasSaveFailed ? BUDGET_STATUS.SAVE_FAILED : BUDGET_STATUS.EDITING;
  };

  // Regla 20: sin los presupuestos cargados no se edita.
  const onEdit = (): void => {
    if (!budgets) return;
    setSavedPeriod(null);
    setEdit({
      errorMessage: null,
      hasSaveFailed: false,
      isSaving: false,
      period,
      text: amount === null ? "" : String(amount),
    });
  };

  const onTextChange = (text: string): void => {
    setEdit((previous) => (previous?.period === period && !previous.isSaving ? { ...previous, text } : previous));
  };

  const onCancel = (): void => {
    if (currentEdit?.isSaving) return;
    setEdit(null);
  };

  const saveBudget = async (budgetPeriod: SpendingPeriodType, budgetAmount: number): Promise<void> => {
    try {
      const storedAmount = await setSpendingBudget(budgetPeriod, budgetAmount);
      if (!isMountedRef.current) return;
      setResponse((previous) =>
        previous?.budgets ? { ...previous, budgets: { ...previous.budgets, [budgetPeriod]: storedAmount } } : previous,
      );
      setEdit((previous) => (previous?.period === budgetPeriod ? null : previous));
      setSavedPeriod(budgetPeriod);
    } catch {
      if (!isMountedRef.current) return;
      setEdit((previous) =>
        previous?.period === budgetPeriod
          ? { ...previous, errorMessage: FINANCE_TEXT.BUDGET_SAVE_ERROR, hasSaveFailed: true, isSaving: false }
          : previous,
      );
    } finally {
      isSavingRef.current = false;
    }
  };

  const onSave = (): void => {
    if (!currentEdit || isSavingRef.current) return;

    const parsed = parseBudgetAmount(currentEdit.text);
    if (!parsed.isValid) {
      setEdit({ ...currentEdit, errorMessage: FINANCE_TEXT.BUDGET_INVALID, hasSaveFailed: false });
      return;
    }

    isSavingRef.current = true;
    setEdit({ ...currentEdit, errorMessage: null, hasSaveFailed: false, isSaving: true });
    void saveBudget(currentEdit.period, parsed.amount);
  };

  return {
    amount,
    editErrorMessage: currentEdit?.errorMessage ?? null,
    editText: currentEdit?.text ?? "",
    noticeMessage: savedPeriod === period ? FINANCE_TEXT.BUDGET_SAVED : null,
    onCancel,
    onEdit,
    onRetry: () => setReloadCount((count) => count + 1),
    onSave,
    onTextChange,
    status: getStatus(),
  };
};
