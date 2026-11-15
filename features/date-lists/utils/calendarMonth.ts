import { DATE_CALENDAR, EVENT_DATE_FORMAT } from "../constants/date-lists.constants";
import type { DateList } from "../models/DateList.interface";
import { toLocalIsoDate } from "./eventDate";

/** Un mes del calendario. monthIndex va de 0 a 11, como en Date. */
export interface CalendarMonth {
  monthIndex: number;
  year: number;
}

export interface CalendarDay {
  dayNumber: number;
  isCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  isoDate: string;
  lists: DateList[];
}

/** "2026-12-20" → diciembre de 2026. Lee el texto por partes: sin new Date(texto) (SPEC §5, regla 4). */
export const toCalendarMonth = (isoDate: string): CalendarMonth => {
  const parts = EVENT_DATE_FORMAT.PATTERN.exec(isoDate);
  if (!parts) throw new Error(`Fecha inválida: ${isoDate}`);

  return { monthIndex: Number(parts[2]) - 1, year: Number(parts[1]) };
};

/** El mes siguiente (+1) o anterior (-1). Date resuelve el cambio de año. */
export const shiftCalendarMonth = (month: CalendarMonth, offset: number): CalendarMonth => {
  const shifted = new Date(month.year, month.monthIndex + offset, 1);

  return { monthIndex: shifted.getMonth(), year: shifted.getFullYear() };
};

export const formatCalendarMonth = (month: CalendarMonth): string =>
  new Intl.DateTimeFormat(EVENT_DATE_FORMAT.LOCALE, { month: "long", year: "numeric" }).format(
    new Date(month.year, month.monthIndex, 1),
  );

/** Las sublistas de un mes, en el mismo orden en que vienen. */
export const getListsOfMonth = (lists: DateList[], month: CalendarMonth): DateList[] =>
  lists.filter((list) => {
    const listMonth = toCalendarMonth(list.eventDate);

    return listMonth.year === month.year && listMonth.monthIndex === month.monthIndex;
  });

/**
 * Las celdas de la grilla: semanas completas de lunes a domingo, con los días de
 * los meses vecinos que hagan falta para completarlas. Compara fechas como texto:
 * YYYY-MM-DD ordena igual que el tiempo, y así no hay horas ni zona horaria.
 */
export const buildCalendarDays = (month: CalendarMonth, lists: DateList[], todayIso: string): CalendarDay[] => {
  // getDay() cuenta desde el domingo (0). Con lunes primero, el domingo queda de último.
  const firstWeekday = new Date(month.year, month.monthIndex, 1).getDay();
  const leadingDays = (firstWeekday + DATE_CALENDAR.DAYS_IN_WEEK - 1) % DATE_CALENDAR.DAYS_IN_WEEK;
  // El día 0 del mes siguiente es el último de este.
  const daysInMonth = new Date(month.year, month.monthIndex + 1, 0).getDate();
  const trailingDays =
    (DATE_CALENDAR.DAYS_IN_WEEK - ((leadingDays + daysInMonth) % DATE_CALENDAR.DAYS_IN_WEEK)) % DATE_CALENDAR.DAYS_IN_WEEK;

  return Array.from({ length: leadingDays + daysInMonth + trailingDays }, (_, index) => {
    const date = new Date(month.year, month.monthIndex, index - leadingDays + 1);
    const isoDate = toLocalIsoDate(date);

    return {
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month.monthIndex,
      isPast: isoDate < todayIso,
      isToday: isoDate === todayIso,
      isoDate,
      lists: lists.filter((list) => list.eventDate === isoDate),
    };
  });
};
