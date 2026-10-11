import type { NullableRef } from "@/types/nullable.types";
import type { WeekDay } from "../models/meal-planner.interfaces";
import type { WeekRange } from "../models/week-list-addition.interfaces";

/** Lunes y domingo de la semana a la vista; null mientras no hay días (no se conoce "hoy"). */
export const getWeekRange = (days: WeekDay[]): NullableRef<WeekRange> => {
  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  return firstDay && lastDay ? { fromDateKey: firstDay.dateKey, toDateKey: lastDay.dateKey } : null;
};
