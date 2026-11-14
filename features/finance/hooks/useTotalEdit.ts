import { useEffect, useRef, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import {
  FINANCE_TEXT,
  TOTAL_EDIT_STATUS,
  TOTAL_EDIT_TARGET,
  TOTAL_SAVE_ERROR,
  TOTAL_SAVE_ERROR_MESSAGE,
} from "../constants/finance.constants";
import type { SpendingPeriodType, TotalEditStatusType, TotalSaveErrorType } from "../constants/finance.constants";
import type { SetPeriodTotalResponse, SetPurchaseTotalResponse } from "../models/TotalMutations.interface";
import { toTotalSaveErrorReason } from "../models/TotalMutations.interface";
import { setPeriodTotal, setPurchaseTotal, setSpendingTimeZone } from "../services/finance.service";
import { parseColonesAmount } from "../utils/parseColonesAmount";

/** Qué total está abierto: el de una compra (CA-01) o el del periodo en curso (CA-02). */
export type TotalEditTarget =
  | { purchaseId: string; type: typeof TOTAL_EDIT_TARGET.PURCHASE }
  | { period: SpendingPeriodType; type: typeof TOTAL_EDIT_TARGET.PERIOD };

/** El campo abierto: qué total, en qué periodo, qué se escribió y cómo va. */
interface TotalEdit {
  errorMessage: NullableRef<string>;
  hasSaveFailed: boolean;
  isSaving: boolean;
  /** El periodo elegido al abrirlo: cambiar de periodo lo descarta (regla 55). */
  period: SpendingPeriodType;
  target: TotalEditTarget;
  text: string;
  /** La zona del navegador que se propone con TZ001 o TZ002; null si no hace falta. */
  timeZoneToConfirm: NullableRef<string>;
}

/** La confirmación de zona pedida por la lectura (TZ002), sin un campo abierto. */
interface ReadTimeZoneConfirmation {
  errorMessage: NullableRef<string>;
  isSaving: boolean;
}

/** Lo que se muestra de esa confirmación, con la zona del navegador que se propone. */
interface ReadTimeZoneConfirmationView extends ReadTimeZoneConfirmation {
  timeZone: string;
}

interface UseTotalEditOptions {
  /** Aplica el total guardado del periodo, sin recargar la pantalla. */
  onPeriodTotalSaved: (period: SpendingPeriodType, saved: SetPeriodTotalResponse, total: number) => void;
  /** Aplica la compra guardada, sin recargar la pantalla. */
  onPurchaseSaved: (saved: SetPurchaseTotalResponse) => void;
  /** La zona quedó confirmada desde el aviso de TZ002: hay que volver a leer. */
  onReadTimeZoneConfirmed: () => void;
  period: SpendingPeriodType;
}

interface UseTotalEditReturn {
  editErrorMessage: NullableRef<string>;
  editText: string;
  /** El total abierto; null si no hay campo abierto. */
  editTarget: NullableRef<TotalEditTarget>;
  /** true justo después de guardar, hasta volver a editar o cambiar de periodo ("Total guardado"). */
  hasSaved: boolean;
  onCancel: () => void;
  /** Con TZ001 o TZ002 al guardar: guarda la zona propuesta y repite el guardado. */
  onConfirmTimeZone: () => void;
  /** Con TZ002 al leer: guarda la zona del navegador y pide volver a leer. */
  onConfirmReadTimeZone: () => void;
  /** Abre el campo con `initialText`; cierra el que hubiera (D21), salvo si está guardando. */
  onEdit: (target: TotalEditTarget, initialText: string) => void;
  onSave: () => void;
  onTextChange: (text: string) => void;
  readTimeZoneConfirmation: ReadTimeZoneConfirmationView;
  status: TotalEditStatusType;
  timeZoneToConfirm: NullableRef<string>;
}

// La zona que se propone confirmar es la del navegador (regla 59). Solo se
// guarda con un toque explícito en "Confirmar".
const getBrowserTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

const needsTimeZone = (reason: TotalSaveErrorType): boolean =>
  reason === TOTAL_SAVE_ERROR.TIME_ZONE_MISSING || reason === TOTAL_SAVE_ERROR.TIME_ZONE_UNRECOGNIZED;

const isSameTarget = (first: TotalEditTarget, second: TotalEditTarget): boolean =>
  first.type === TOTAL_EDIT_TARGET.PURCHASE
    ? second.type === TOTAL_EDIT_TARGET.PURCHASE && first.purchaseId === second.purchaseId
    : second.type === TOTAL_EDIT_TARGET.PERIOD && first.period === second.period;

/**
 * El único campo abierto de un total en el Historial (SCRUM-91, D21): abrir,
 * escribir, validar, guardar y sus errores. No lee datos: los aplica quien lo
 * usa, con los callbacks.
 *
 * - Valida con parseColonesAmount sin llamar a la base (D13, D14, regla 46).
 * - El mensaje sale del motivo del TotalSaveError, nunca del texto de la base (SPEC §7).
 * - Con TZ001 o TZ002 propone la zona del navegador; solo "Confirmar" la guarda
 *   y repite el guardado, sin perder lo escrito (regla 59).
 * - Cambiar de periodo descarta lo escrito, salvo un guardado en curso (regla 55).
 * - Doble clic y pantalla cerrada mientras guarda, como useSpendingBudgets (regla 56).
 */
export const useTotalEdit = ({
  onPeriodTotalSaved,
  onPurchaseSaved,
  onReadTimeZoneConfirmed,
  period,
}: UseTotalEditOptions): UseTotalEditReturn => {
  const [edit, setEdit] = useState<NullableRef<TotalEdit>>(null);
  // De qué periodo es el último total guardado: "Total guardado" solo se anuncia en ese periodo.
  const [savedPeriod, setSavedPeriod] = useState<NullableRef<SpendingPeriodType>>(null);
  const [readTimeZoneConfirmation, setReadTimeZoneConfirmation] = useState<ReadTimeZoneConfirmation>({
    errorMessage: null,
    isSaving: false,
  });
  // Doble clic en "Guardar" o "Confirmar": dos clics en el mismo render ven el mismo estado.
  const isSavingRef = useRef<boolean>(false);
  // Si la pantalla se cierra mientras guarda, la respuesta se ignora.
  const isMountedRef = useRef<boolean>(true);

  // Cambiar de periodo descarta lo escrito, también al volver al anterior. Se
  // ajusta durante el render, como en useSpendingBudgets. Un guardado en curso
  // no se descarta: su respuesta se aplica si la fila o el periodo siguen visibles.
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

  const currentEdit = edit?.period === period ? edit : null;

  const getStatus = (): TotalEditStatusType => {
    if (!currentEdit) return TOTAL_EDIT_STATUS.VIEWING;
    if (currentEdit.isSaving) return TOTAL_EDIT_STATUS.SAVING;
    return currentEdit.hasSaveFailed ? TOTAL_EDIT_STATUS.SAVE_FAILED : TOTAL_EDIT_STATUS.EDITING;
  };

  // Cambia el campo solo si sigue siendo el mismo total: otro pudo abrirse mientras tanto.
  const updateEdit = (target: TotalEditTarget, update: (previous: TotalEdit) => NullableRef<TotalEdit>): void => {
    setEdit((previous) => (previous && isSameTarget(previous.target, target) ? update(previous) : previous));
  };

  const failSave = (target: TotalEditTarget, error: unknown, isConfirmingTimeZone: boolean): void => {
    const reason = toTotalSaveErrorReason(error);
    // Al confirmar la zona, 23514 significa que la zona nueva dejaría un periodo en negativo.
    const errorMessage =
      isConfirmingTimeZone && reason === TOTAL_SAVE_ERROR.NEGATIVE_PERIOD
        ? FINANCE_TEXT.TIME_ZONE_REJECTED
        : TOTAL_SAVE_ERROR_MESSAGE[reason];
    updateEdit(target, (previous) => ({
      ...previous,
      errorMessage,
      hasSaveFailed: true,
      isSaving: false,
      // Rechazada la zona, ya no se propone otra vez; con TZ001 o TZ002, sí.
      timeZoneToConfirm: needsTimeZone(reason) ? getBrowserTimeZone() : null,
    }));
  };

  const saveTotal = async (savingEdit: TotalEdit, total: number): Promise<void> => {
    const { target } = savingEdit;
    try {
      if (target.type === TOTAL_EDIT_TARGET.PURCHASE) {
        const saved = await setPurchaseTotal({ purchaseId: target.purchaseId, total });
        if (!isMountedRef.current) return;
        onPurchaseSaved(saved);
      } else {
        const saved = await setPeriodTotal({ period: target.period, total });
        if (!isMountedRef.current) return;
        onPeriodTotalSaved(target.period, saved, total);
      }
      updateEdit(target, () => null);
      setSavedPeriod(savingEdit.period);
    } catch (error) {
      if (!isMountedRef.current) return;
      failSave(target, error, false);
    } finally {
      isSavingRef.current = false;
    }
  };

  const onEdit = (target: TotalEditTarget, initialText: string): void => {
    // Mientras guarda, los demás lápices quedan deshabilitados (D21).
    if (isSavingRef.current) return;
    setSavedPeriod(null);
    setEdit({
      errorMessage: null,
      hasSaveFailed: false,
      isSaving: false,
      period,
      target,
      text: initialText,
      timeZoneToConfirm: null,
    });
  };

  const onTextChange = (text: string): void => {
    setEdit((previous) => (previous?.period === period && !previous.isSaving ? { ...previous, text } : previous));
  };

  const onCancel = (): void => {
    if (currentEdit?.isSaving) return;
    setEdit(null);
  };

  const onSave = (): void => {
    if (!currentEdit || isSavingRef.current) return;

    const parsed = parseColonesAmount(currentEdit.text);
    if (!parsed.isValid) {
      setEdit({ ...currentEdit, errorMessage: FINANCE_TEXT.TOTAL_INVALID, hasSaveFailed: false });
      return;
    }

    isSavingRef.current = true;
    const savingEdit: TotalEdit = { ...currentEdit, errorMessage: null, hasSaveFailed: false, isSaving: true };
    setEdit(savingEdit);
    void saveTotal(savingEdit, parsed.amount);
  };

  const confirmTimeZoneAndSave = async (savingEdit: TotalEdit, timeZone: string, total: number): Promise<void> => {
    try {
      await setSpendingTimeZone({ timeZone });
    } catch (error) {
      isSavingRef.current = false;
      if (isMountedRef.current) failSave(savingEdit.target, error, true);
      return;
    }
    if (!isMountedRef.current) {
      isSavingRef.current = false;
      return;
    }
    await saveTotal(savingEdit, total);
  };

  const onConfirmTimeZone = (): void => {
    if (!currentEdit?.timeZoneToConfirm || isSavingRef.current) return;

    // Ya pasó la validación al guardar; se repite el mismo total.
    const parsed = parseColonesAmount(currentEdit.text);
    if (!parsed.isValid) return;

    isSavingRef.current = true;
    const savingEdit: TotalEdit = { ...currentEdit, errorMessage: null, hasSaveFailed: false, isSaving: true };
    setEdit(savingEdit);
    void confirmTimeZoneAndSave(savingEdit, currentEdit.timeZoneToConfirm, parsed.amount);
  };

  const confirmReadTimeZone = async (): Promise<void> => {
    try {
      await setSpendingTimeZone({ timeZone: getBrowserTimeZone() });
      if (!isMountedRef.current) return;
      setReadTimeZoneConfirmation({ errorMessage: null, isSaving: false });
      onReadTimeZoneConfirmed();
    } catch (error) {
      if (!isMountedRef.current) return;
      const reason = toTotalSaveErrorReason(error);
      setReadTimeZoneConfirmation({
        errorMessage:
          reason === TOTAL_SAVE_ERROR.NEGATIVE_PERIOD
            ? FINANCE_TEXT.TIME_ZONE_REJECTED
            : TOTAL_SAVE_ERROR_MESSAGE[TOTAL_SAVE_ERROR.GENERAL],
        isSaving: false,
      });
    } finally {
      isSavingRef.current = false;
    }
  };

  const onConfirmReadTimeZone = (): void => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setReadTimeZoneConfirmation({ errorMessage: null, isSaving: true });
    void confirmReadTimeZone();
  };

  return {
    editErrorMessage: currentEdit?.errorMessage ?? null,
    editTarget: currentEdit?.target ?? null,
    editText: currentEdit?.text ?? "",
    hasSaved: savedPeriod === period,
    onCancel,
    onConfirmReadTimeZone,
    onConfirmTimeZone,
    onEdit,
    onSave,
    onTextChange,
    readTimeZoneConfirmation: { ...readTimeZoneConfirmation, timeZone: getBrowserTimeZone() },
    status: getStatus(),
    timeZoneToConfirm: currentEdit?.timeZoneToConfirm ?? null,
  };
};
