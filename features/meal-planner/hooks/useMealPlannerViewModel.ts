import { useState } from "react";
import { MEAL_PLANNER_TEXT, WEEK_OFFSET } from "../constants/meal-planner.constants";
import type { MealPlannerViewModel } from "../models/meal-planner.interfaces";
import type { WeekOffsetType } from "../models/meal-planner.types";
import { buildWeek } from "../utils/buildWeek";
import { formatWeekRange } from "../utils/formatWeekRange";
import { getWeekStartForOffset } from "../utils/getWeekStartForOffset";
import { useToday } from "./useToday";

/**
 * Planificador semanal: guarda qué semana se ve (la actual o la próxima) y
 * le entrega a MealPlanner.tsx la semana ya armada. En estado solo está lo que
 * no se puede calcular (la semana elegida); el resto se deriva de "hoy".
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

  return {
    // Las flechas no se ocultan: se deshabilitan en el extremo (SPEC regla 4).
    canGoToNextWeek: !isNextWeek,
    canGoToPreviousWeek: isNextWeek,
    days: today && weekStart ? buildWeek(weekStart, today) : [],
    isReady: today !== null,
    onNextWeek: () => setWeekOffset(WEEK_OFFSET.NEXT),
    onPreviousWeek: () => setWeekOffset(WEEK_OFFSET.CURRENT),
    rangeLabel: weekStart ? formatWeekRange(weekStart) : null,
    weekLabel: isNextWeek ? MEAL_PLANNER_TEXT.NEXT_WEEK : MEAL_PLANNER_TEXT.THIS_WEEK,
  };
};
