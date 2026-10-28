import { WEEK, WEEK_OFFSET } from "../constants/meal-planner.constants";
import type { GetMealPlanParams } from "../models/meal-plan.interfaces";
import { getWeekStartForOffset } from "./getWeekStartForOffset";
import { toLocalDateKey } from "./toLocalDateKey";

/**
 * El rango del plan que se pide a la base: del lunes de la semana actual al
 * domingo de la próxima, o sea los 14 días que dibujan las dos semanas
 * (SPEC regla 21: se cargan de una vez, las flechas no hacen otra consulta).
 * Suma días con new Date(año, mes, día + n), no milisegundos, como el resto.
 */
export const getPlanRange = (today: Date): GetMealPlanParams => {
  const currentWeekStart = getWeekStartForOffset(today, WEEK_OFFSET.CURRENT);
  const nextWeekStart = getWeekStartForOffset(today, WEEK_OFFSET.NEXT);
  const lastDay = new Date(nextWeekStart.getFullYear(), nextWeekStart.getMonth(), nextWeekStart.getDate() + WEEK.DAYS - 1);

  return { fromDateKey: toLocalDateKey(currentWeekStart), toDateKey: toLocalDateKey(lastDay) };
};
