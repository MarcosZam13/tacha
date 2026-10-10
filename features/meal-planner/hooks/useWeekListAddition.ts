import { useEffect, useReducer, useRef } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { WEEK_LIST_ACTION, WEEK_LIST_STATUS, WEEK_LIST_TEXT, WEEK_LIST_TOKEN } from "../constants/meal-planner.constants";
import type { UseWeekListAdditionParams, WeekListAdditionViewModel } from "../models/week-list-addition.interfaces";
import { addWeekToList } from "../services/week-list.service";
import { countWeekMeals } from "../utils/countWeekMeals";
import { getWeekRange } from "../utils/getWeekRange";
import { toCountLabel } from "../utils/toCountLabel";
import { toWeekAdditionSummary } from "../utils/toWeekAdditionSummary";
import { CLOSED_WEEK_LIST_STATE, weekListReducer } from "../utils/week-list-addition.reducer";

/**
 * Agregar la semana a la lista: abrir la confirmación, confirmar, cancelar y el
 * aviso que queda. Las reglas del diálogo viven en el reducer
 * (utils/week-list-addition.reducer.ts); acá van la llamada a la base y lo que
 * se deriva de la semana a la vista (cuántas comidas, si el botón se puede usar).
 *
 * Una sola petición a la vez: un doble clic en "Agregar" no manda dos (SPEC regla
 * 37). Se usa una referencia y no el estado, porque dos clics seguidos llegan
 * antes de que React vuelva a dibujar.
 */
export const useWeekListAddition = ({
  days,
  getEntry,
  isBlocked,
  isPlanReady,
  rangeLabel,
}: UseWeekListAdditionParams): WeekListAdditionViewModel => {
  const [state, dispatch] = useReducer(weekListReducer, CLOSED_WEEK_LIST_STATE);
  const isRequestInFlightRef = useRef(false);
  // El botón que abrió la confirmación: al cerrarla el foco vuelve ahí (SPEC §16.8).
  const openerRef = useRef<NullableRef<HTMLElement>>(null);
  const wasOpenRef = useRef(false);

  // Las comidas que dijo la confirmación; null con el diálogo cerrado o con el aviso final (done).
  const openMealCount =
    state.status === WEEK_LIST_STATUS.CONFIRMING ||
    state.status === WEEK_LIST_STATUS.ADDING ||
    state.status === WEEK_LIST_STATUS.FAILED
      ? state.mealCount
      : null;
  const isOpen = openMealCount !== null;

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) openerRef.current?.focus();
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  // Valores derivados de la semana a la vista: se calculan una vez por render.
  const range = getWeekRange(days);
  const mealCount = countWeekMeals(days, getEntry);
  const canOpen = isPlanReady && range !== null && mealCount > 0 && !isBlocked;

  const onOpen = (): void => {
    if (!canOpen || isOpen || !range) return;

    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dispatch({ type: WEEK_LIST_ACTION.OPENED, range, mealCount });
  };

  const onConfirm = (): void => {
    if (isRequestInFlightRef.current) return;
    if (state.status !== WEEK_LIST_STATUS.CONFIRMING && state.status !== WEEK_LIST_STATUS.FAILED) return;

    // La semana que se confirmó, no la que se vea al responder la base.
    const confirmedRange = state.range;
    isRequestInFlightRef.current = true;
    dispatch({ type: WEEK_LIST_ACTION.CONFIRMED });

    void addWeekToList(confirmedRange)
      .then((response) => {
        dispatch({ type: WEEK_LIST_ACTION.SUCCEEDED, summaryLines: toWeekAdditionSummary(response) });
      })
      .catch(() => {
        // La RPC es todo o nada: si falló, la lista quedó como estaba.
        dispatch({ type: WEEK_LIST_ACTION.FAILED, errorMessage: WEEK_LIST_TEXT.ERROR });
      })
      .finally(() => {
        isRequestInFlightRef.current = false;
      });
  };

  // El aviso solo se ve en la semana que se agregó: al cambiar de semana desaparece, sin efecto ni estado extra.
  const resultLines =
    state.status === WEEK_LIST_STATUS.DONE && state.range.fromDateKey === range?.fromDateKey
      ? state.summaryLines
      : null;

  return {
    canOpen,
    confirmMessage:
      openMealCount !== null && rangeLabel
        ? WEEK_LIST_TEXT.CONFIRM_MESSAGE.replace(
            WEEK_LIST_TOKEN.MEALS,
            toCountLabel(openMealCount, WEEK_LIST_TEXT.MEAL_SINGULAR, WEEK_LIST_TEXT.MEAL_PLURAL),
          ).replace(WEEK_LIST_TOKEN.RANGE, rangeLabel)
        : null,
    errorMessage: state.status === WEEK_LIST_STATUS.FAILED ? state.errorMessage : null,
    isAdding: state.status === WEEK_LIST_STATUS.ADDING,
    isOpen,
    onClose: () => dispatch({ type: WEEK_LIST_ACTION.CLOSED }),
    onConfirm,
    onOpen,
    resultLines,
  };
};
