import { WEEK } from "../constants/meal-planner.constants";
import type { WeekOffsetType } from "../models/meal-planner.types";
import { getWeekStart } from "./getWeekStart";

/**
 * El lunes de la semana a la vista: el de la semana de `today` más
 * `weekOffset` semanas (0 = la actual, 1 = la próxima). Suma días con
 * new Date(año, mes, día + n) y no milisegundos, por la misma razón que
 * getWeekStart.
 */
export const getWeekStartForOffset = (today: Date, weekOffset: WeekOffsetType): Date => {
  const currentWeekStart = getWeekStart(today);

  return new Date(
    currentWeekStart.getFullYear(),
    currentWeekStart.getMonth(),
    currentWeekStart.getDate() + weekOffset * WEEK.DAYS,
  );
};
