import { CALENDAR_WEEK, SPENDING_PERIOD } from "../constants/finance.constants";
import type { SpendingPeriodType } from "../constants/finance.constants";
import type { PeriodBounds } from "../models/PeriodBounds.interface";

/**
 * El periodo en curso que contiene a `now`, en hora local (SPEC regla 8):
 * hoy, la semana de lunes a lunes o el mes del día 1 al día 1 siguiente.
 *
 * Se arma con new Date(año, mes, día), que normaliza los desbordes
 * (new Date(2026, 11, 32) es el 1 de enero de 2027): así los cruces de mes y
 * de año salen sin casos especiales, y se suman días de calendario, no
 * milisegundos, para no depender de horarios de verano.
 */
export const getPeriodBounds = (period: SpendingPeriodType, now: Date): PeriodBounds => {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  if (period === SPENDING_PERIOD.DAY) {
    return { end: new Date(year, month, day + 1), start: new Date(year, month, day) };
  }

  if (period === SPENDING_PERIOD.WEEK) {
    const daysSinceMonday = (now.getDay() + CALENDAR_WEEK.DAYS_FROM_SUNDAY_TO_MONDAY) % CALENDAR_WEEK.DAYS_PER_WEEK;
    const mondayDay = day - daysSinceMonday;
    return {
      end: new Date(year, month, mondayDay + CALENDAR_WEEK.DAYS_PER_WEEK),
      start: new Date(year, month, mondayDay),
    };
  }

  // SPENDING_PERIOD.MONTH: el único que queda en la unión.
  return { end: new Date(year, month + 1, 1), start: new Date(year, month, 1) };
};
