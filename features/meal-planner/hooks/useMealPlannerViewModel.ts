import { useState } from "react";
import { MEAL_PLANNER_TEXT, WEEK_OFFSET } from "../constants/meal-planner.constants";
import type { MealPlannerViewModel } from "../models/meal-planner.interfaces";
import type { WeekOffsetType } from "../models/meal-planner.types";
import { buildWeek } from "../utils/buildWeek";
import { formatWeekRange } from "../utils/formatWeekRange";
import { getPlanRange } from "../utils/getPlanRange";
import { getWeekStartForOffset } from "../utils/getWeekStartForOffset";
import { useMealSlotDialog } from "./useMealSlotDialog";
import { useToday } from "./useToday";
import { useWeekListAddition } from "./useWeekListAddition";
import { useWeekMealPlan } from "./useWeekMealPlan";

/**
 * Planificador semanal: guarda qué semana se ve (la actual o la próxima) y
 * le entrega a MealPlanner.tsx la semana ya armada. En estado solo está lo que
 * no se puede calcular (la semana elegida); el resto se deriva de "hoy".
 * El plan guardado (useWeekMealPlan) y el diálogo de asignar (useMealSlotDialog)
 * son hooks propios que este facade compone (SCRUM-100).
 *
 * Mientras no se conoce "hoy" (servidor e hidratación) no arma la grilla: así
 * nunca se dibuja un día resaltado que luego cambie.
 *
 * useState y no useReducer: hay una sola acción posible (cambiar de semana) y
 * la unión de dos valores impide una semana que la historia no permite.
 */
export const useMealPlannerViewModel = (): MealPlannerViewModel => {
  const today = useToday();
  const [weekOffset, setWeekOffset] = useState<WeekOffsetType>(WEEK_OFFSET.CURRENT);

  const weekStart = today ? getWeekStartForOffset(today, weekOffset) : null;
  const isNextWeek = weekOffset === WEEK_OFFSET.NEXT;
  const days = today && weekStart ? buildWeek(weekStart, today) : [];

  // El plan de las dos semanas se pide una vez; el diálogo cambia lo que guarda.
  const plan = useWeekMealPlan({ range: today ? getPlanRange(today) : null });
  const dialog = useMealSlotDialog({
    getDayLongLabel: (dateKey) => days.find((day) => day.dateKey === dateKey)?.longLabel ?? null,
    getEntry: plan.getEntry,
    onRecipeGone: plan.removeRecipeSlots,
    onRemoved: plan.removeEntry,
    onSaved: plan.saveEntry,
  });

  const rangeLabel = weekStart ? formatWeekRange(weekStart) : null;
  // Agregar la semana (SCRUM-101): actúa sobre la semana a la vista y solo con un diálogo abierto a la vez.
  const weekAddition = useWeekListAddition({
    days,
    getEntry: plan.getEntry,
    isBlocked: dialog.isOpen,
    isPlanReady: plan.isPlanReady,
    rangeLabel,
  });

  return {
    // Las flechas no se ocultan: se deshabilitan en el extremo (SPEC regla 4).
    canGoToNextWeek: !isNextWeek,
    canGoToPreviousWeek: isNextWeek,
    days,
    dialog,
    isReady: today !== null,
    onNextWeek: (): void => setWeekOffset(WEEK_OFFSET.NEXT),
    onPreviousWeek: (): void => setWeekOffset(WEEK_OFFSET.CURRENT),
    plan,
    rangeLabel,
    weekAddition,
    weekLabel: isNextWeek ? MEAL_PLANNER_TEXT.NEXT_WEEK : MEAL_PLANNER_TEXT.THIS_WEEK,
  };
};
