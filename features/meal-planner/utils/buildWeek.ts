import {
  MEAL_TYPE_LABEL,
  MEAL_TYPES,
  WEEK,
  WEEKDAY_LONG_LABEL,
  WEEKDAY_SHORT_LABEL,
} from "../constants/meal-planner.constants";
import type { WeekDay, WeekSlot } from "../models/meal-planner.interfaces";
import { getWeekdayIndex } from "./getWeekdayIndex";
import { toLocalDateKey } from "./toLocalDateKey";

const buildSlots = (): WeekSlot[] => MEAL_TYPES.map((mealType) => ({ label: MEAL_TYPE_LABEL[mealType], mealType }));

/**
 * Los 7 días que empiezan en `weekStart`, con sus textos armados, sus 3
 * espacios y si cada uno es hoy. Función pura: se prueba sin React ni reloj.
 *
 * Suma días con new Date(año, mes, día + n), no milisegundos, por la misma
 * razón que getWeekStart. El nombre del día sale de la propia fecha y no de
 * la posición, así que no depende de que `weekStart` sea de verdad un lunes.
 */
export const buildWeek = (weekStart: Date, today: Date): WeekDay[] => {
  const todayKey = toLocalDateKey(today);

  return Array.from({ length: WEEK.DAYS }, (_, dayOffset) => {
    const day = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + dayOffset);
    const dateKey = toLocalDateKey(day);
    const weekdayIndex = getWeekdayIndex(day);

    return {
      dateKey,
      isToday: dateKey === todayKey,
      longLabel: `${WEEKDAY_LONG_LABEL[weekdayIndex]} ${day.getDate()}`,
      shortLabel: `${WEEKDAY_SHORT_LABEL[weekdayIndex]} ${day.getDate()}`,
      slots: buildSlots(),
    };
  });
};
