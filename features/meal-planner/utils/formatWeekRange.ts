import { MEAL_PLANNER_TEXT, MONTH_SHORT_LABEL, WEEK } from "../constants/meal-planner.constants";

/**
 * El rango de una semana que empieza en `weekStart`: "12 – 18 oct". Si la
 * semana cruza de mes (o de año) se dice el mes en las dos puntas: "28 sep –
 * 4 oct", "29 dic – 4 ene". Una semana de 7 días no puede empezar y terminar
 * en el mismo mes de años distintos, así que comparar el mes alcanza.
 */
export const formatWeekRange = (weekStart: Date): string => {
  const lastDay = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + WEEK.DAYS - 1);
  const endText = `${lastDay.getDate()} ${MONTH_SHORT_LABEL[lastDay.getMonth()]}`;
  const startText =
    weekStart.getMonth() === lastDay.getMonth()
      ? String(weekStart.getDate())
      : `${weekStart.getDate()} ${MONTH_SHORT_LABEL[weekStart.getMonth()]}`;

  return `${startText}${MEAL_PLANNER_TEXT.RANGE_SEPARATOR}${endText}`;
};
