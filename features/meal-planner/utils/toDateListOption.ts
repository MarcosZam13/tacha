import { DATE_KEY, MONTH_SHORT_LABEL, WEEK_LIST_TEXT } from "../constants/meal-planner.constants";
import type { DateListOption, DateListOptionRow } from "../models/week-list-addition.interfaces";

/**
 * "2026-11-28" → "28 nov", con el año solo si no es el de hoy. Se lee por partes:
 * new Date("2026-11-28") es medianoche en UTC, en Costa Rica el día anterior.
 */
const toShortDate = (dateKey: string, todayKey: string): string => {
  const [year, month, day] = dateKey.split(DATE_KEY.SEPARATOR);
  const [currentYear] = todayKey.split(DATE_KEY.SEPARATOR);
  const dayAndMonth = `${Number(day)} ${MONTH_SHORT_LABEL[Number(month) - 1]}`;

  return year === currentYear ? dayAndMonth : `${dayAndMonth} ${year}`;
};

/**
 * Adapter: una fila de lists → opción del selector. name y event_date son
 * nullable en el tipo, pero en una sublista el check de 038 garantiza que están.
 */
export const toDateListOption = (row: DateListOptionRow, todayKey: string): DateListOption => {
  const name = row.name ?? "";

  return {
    id: row.id,
    label: row.event_date
      ? `${name}${WEEK_LIST_TEXT.OPTION_SEPARATOR}${toShortDate(row.event_date, todayKey)}`
      : name,
    name,
  };
};
