import { useState } from "react";
import type { DateList } from "../models/DateList.interface";
import {
  buildCalendarDays,
  formatCalendarMonth,
  getListsOfMonth,
  shiftCalendarMonth,
  toCalendarMonth,
} from "../utils/calendarMonth";
import type { CalendarDay, CalendarMonth } from "../utils/calendarMonth";
import { toLocalIsoDate } from "../utils/eventDate";

export interface DateCalendarViewModel {
  days: CalendarDay[];
  listsOfMonth: DateList[];
  monthLabel: string;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  showMonthOf: (isoDate: string) => void;
}

/**
 * El mes visible del calendario. days y listsOfMonth no se guardan en estado:
 * salen de lists y del mes en cada render, así no pueden quedar desactualizados.
 */
export const useDateCalendar = (lists: DateList[]): DateCalendarViewModel => {
  const todayIso = toLocalIsoDate(new Date());
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(() => toCalendarMonth(todayIso));

  return {
    days: buildCalendarDays(visibleMonth, lists, todayIso),
    listsOfMonth: getListsOfMonth(lists, visibleMonth),
    monthLabel: formatCalendarMonth(visibleMonth),
    onNextMonth: () => setVisibleMonth((month) => shiftCalendarMonth(month, 1)),
    onPreviousMonth: () => setVisibleMonth((month) => shiftCalendarMonth(month, -1)),
    showMonthOf: (isoDate) => setVisibleMonth(toCalendarMonth(isoDate)),
  };
};
