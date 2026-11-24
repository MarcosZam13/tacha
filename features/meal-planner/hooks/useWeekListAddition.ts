import { useEffect, useReducer, useRef } from "react";
import { APP_ROUTE } from "@/constants";
import type { NullableRef } from "@/types/nullable.types";
import { toDateListPath } from "@/utils/toDateListPath";
import {
  DATE_LIST_OPTIONS_STATUS,
  WEEK_LIST_ACTION,
  WEEK_LIST_DESTINATION,
  WEEK_LIST_STATUS,
  WEEK_LIST_TEXT,
  WEEK_LIST_TOKEN,
} from "../constants/meal-planner.constants";
import type { UseWeekListAdditionParams, WeekListAdditionViewModel } from "../models/week-list-addition.interfaces";
import { addWeekToList } from "../services/week-list.service";
import { countWeekMeals } from "../utils/countWeekMeals";
import { getWeekRange } from "../utils/getWeekRange";
import { toCountLabel } from "../utils/toCountLabel";
import { toWeekAdditionSummary } from "../utils/toWeekAdditionSummary";
import { CLOSED_WEEK_LIST_STATE, GENERAL_DESTINATION, weekListReducer } from "../utils/week-list-addition.reducer";
import { useDateListOptions } from "./useDateListOptions";

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
  todayKey,
}: UseWeekListAdditionParams): WeekListAdditionViewModel => {
  const [state, dispatch] = useReducer(weekListReducer, CLOSED_WEEK_LIST_STATE);
  const options = useDateListOptions({ todayKey });
  const isRequestInFlightRef = useRef(false);
  // El botón que abrió la confirmación: al cerrarla el foco vuelve ahí (SPEC §16.8).
  const openerRef = useRef<NullableRef<HTMLElement>>(null);
  const wasOpenRef = useRef(false);

  // Las comidas que dijo la confirmación; null con el diálogo cerrado o con el aviso final (done).
  const openMealCount =
    state.status !== WEEK_LIST_STATUS.CLOSED && state.status !== WEEK_LIST_STATUS.DONE ? state.mealCount : null;
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
    options.load();
  };

  const onClose = (): void => {
    // Mientras agrega no se cierra (el reducer lo ignora): las opciones tampoco se tiran.
    if (state.status === WEEK_LIST_STATUS.ADDING) return;

    dispatch({ type: WEEK_LIST_ACTION.CLOSED });
    options.clear();
  };

  const onConfirm = (): void => {
    if (isRequestInFlightRef.current) return;
    if (state.status !== WEEK_LIST_STATUS.CONFIRMING && state.status !== WEEK_LIST_STATUS.FAILED) return;

    // La semana y la lista que se confirmaron, no lo que se vea al responder la base.
    const { destination, range: confirmedRange } = state;
    isRequestInFlightRef.current = true;
    dispatch({ type: WEEK_LIST_ACTION.CONFIRMED });

    void addWeekToList({ ...confirmedRange, destination })
      .then((response) => {
        if (!response) {
          // Se canceló o se completó en otra parte: se vuelve a la general y se piden las que sí sirven.
          dispatch({ type: WEEK_LIST_ACTION.DESTINATION_LOST, errorMessage: WEEK_LIST_TEXT.DESTINATION_LOST });
          options.load();
          return;
        }
        dispatch({ type: WEEK_LIST_ACTION.SUCCEEDED, summaryLines: toWeekAdditionSummary(response, destination) });
        options.clear();
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

  const dateListOptions = options.state.status === DATE_LIST_OPTIONS_STATUS.READY ? options.state.options : [];
  const destination = state.status === WEEK_LIST_STATUS.CLOSED ? GENERAL_DESTINATION : state.destination;
  const confirmText =
    dateListOptions.length > 0 ? WEEK_LIST_TEXT.CONFIRM_MESSAGE_WITH_OPTIONS : WEEK_LIST_TEXT.CONFIRM_MESSAGE;

  return {
    canOpen,
    confirmMessage:
      openMealCount !== null && rangeLabel
        ? confirmText
            .replace(
              WEEK_LIST_TOKEN.MEALS,
              toCountLabel(openMealCount, WEEK_LIST_TEXT.MEAL_SINGULAR, WEEK_LIST_TEXT.MEAL_PLURAL),
            )
            .replace(WEEK_LIST_TOKEN.RANGE, rangeLabel)
        : null,
    dateListOptions,
    destination,
    errorMessage: state.status === WEEK_LIST_STATUS.FAILED ? state.errorMessage : null,
    hasOptionsError: options.state.status === DATE_LIST_OPTIONS_STATUS.FAILED,
    isAdding: state.status === WEEK_LIST_STATUS.ADDING,
    isLoadingOptions: options.state.status === DATE_LIST_OPTIONS_STATUS.LOADING,
    isOpen,
    onClose,
    onConfirm,
    onDestinationChange: (nextDestination) =>
      dispatch({ type: WEEK_LIST_ACTION.DESTINATION_CHANGED, destination: nextDestination }),
    onOpen,
    onOptionsRetry: options.load,
    resultLines,
    resultListHref:
      destination.kind === WEEK_LIST_DESTINATION.DATE_LIST ? toDateListPath(destination.id) : APP_ROUTE.LIST,
  };
};
