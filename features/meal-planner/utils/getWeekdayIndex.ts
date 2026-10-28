import { WEEK } from "../constants/meal-planner.constants";

/**
 * Días desde el lunes: lunes = 0 … domingo = 6. Date.getDay() cuenta desde el
 * domingo (0), así que se corre un día; el domingo cae al final de su semana.
 */
export const getWeekdayIndex = (date: Date): number => (date.getDay() + WEEK.DAYS - 1) % WEEK.DAYS;
