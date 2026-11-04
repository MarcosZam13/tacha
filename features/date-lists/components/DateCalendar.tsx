import Link from "next/link";
import {
  DATE_CALENDAR,
  DATE_LIST_STATUS,
  DATE_LIST_STATUS_DOT,
  DATE_LIST_STATUS_LABEL,
  DATE_LIST_STATUS_MARK,
  DATE_LIST_STATUS_STYLE,
  DATE_LIST_TEXT,
} from "../constants/date-lists.constants";
import type { DateCalendarViewModel } from "../hooks/useDateCalendar";
import type { DateList } from "../models/DateList.interface";
import type { CalendarDay } from "../utils/calendarMonth";
import { formatEventDate } from "../utils/eventDate";
import { toDateListPath } from "../utils/toDateListPath";

interface DateCalendarProps {
  calendar: DateCalendarViewModel;
  onCreateOnDay: (isoDate: string) => void;
}

const NAV_BUTTON_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-tacha-badge border border-tacha-border bg-tacha-surface font-body text-tacha-text transition-colors hover:border-tacha-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tacha-teal";

/** Una sublista dentro de la celda. Solo desde sm: en mobile no cabe un nombre, y abajo está la agenda. */
const CalendarChip = ({ list }: { list: DateList }): React.JSX.Element => (
  <Link
    href={toDateListPath(list.id)}
    title={`${list.name}: ${DATE_LIST_STATUS_LABEL[list.status]}`}
    className={`hidden truncate rounded-tacha-badge px-1 py-0.5 font-body text-[11px] leading-tight sm:block ${DATE_LIST_STATUS_STYLE[list.status]}`}
  >
    <span aria-hidden="true">{DATE_LIST_STATUS_MARK[list.status]} </span>
    <span className={list.status === DATE_LIST_STATUS.CANCELLED ? "line-through" : undefined}>{list.name}</span>
    <span className="sr-only"> ({DATE_LIST_STATUS_LABEL[list.status]})</span>
  </Link>
);

/** El punto de mobile. Decorativo: nombre y estado están en la agenda de abajo. */
const CalendarDot = ({ list }: { list: DateList }): React.JSX.Element => (
  <span aria-hidden="true" className={`h-2 w-2 rounded-full sm:hidden ${DATE_LIST_STATUS_DOT[list.status]}`} />
);

const CalendarCell = ({ day, onCreateOnDay }: { day: CalendarDay; onCreateOnDay: (isoDate: string) => void }): React.JSX.Element => {
  if (!day.isCurrentMonth) {
    return <li aria-hidden="true" className="min-h-14 rounded-tacha-badge px-1 py-1 font-body text-xs text-tacha-textsec opacity-50 sm:min-h-24">{day.dayNumber}</li>;
  }

  const visibleLists = day.lists.slice(0, DATE_CALENDAR.MAX_CHIPS_PER_DAY);
  const hiddenCount = day.lists.length - visibleLists.length;
  const number = (
    <>
      <span aria-current={day.isToday ? "date" : undefined} className={day.isToday ? "font-bold text-tacha-teal" : undefined}>
        {day.dayNumber}
      </span>
      {day.lists.length > 0 ? <span className="mt-1 flex flex-wrap gap-0.5">{day.lists.map((list) => <CalendarDot key={list.id} list={list} />)}</span> : null}
    </>
  );

  return (
    <li className={`flex min-h-14 min-w-0 flex-col gap-0.5 rounded-tacha-badge border bg-tacha-surface p-1 sm:min-h-24 ${day.isToday ? "border-2 border-tacha-teal" : "border-tacha-border"}`}>
      {/* Una fecha pasada no se puede crear (SPEC §5, regla 2): el día queda sin botón. */}
      {day.isPast ? (
        <span className="flex flex-col px-1 font-body text-xs text-tacha-textsec">{number}</span>
      ) : (
        <button
          type="button"
          aria-label={`${DATE_LIST_TEXT.CREATE_ON_DAY} ${formatEventDate(day.isoDate)}`}
          onClick={() => onCreateOnDay(day.isoDate)}
          className="flex flex-1 flex-col items-start rounded-tacha-badge px-1 text-left font-body text-xs text-tacha-text transition-colors hover:bg-tacha-chipbg focus-visible:outline-2 focus-visible:outline-tacha-teal"
        >
          {number}
        </button>
      )}
      {visibleLists.map((list) => <CalendarChip key={list.id} list={list} />)}
      {hiddenCount > 0 ? <span className="hidden px-1 font-body text-[11px] text-tacha-textsec sm:block">+{hiddenCount} {DATE_LIST_TEXT.MORE_ON_DAY}</span> : null}
    </li>
  );
};

/** La grilla de un mes con las sublistas en su fecha (SCRUM-76, CA-01 y CA-02). */
export const DateCalendar = ({ calendar, onCreateOnDay }: DateCalendarProps): React.JSX.Element => (
  <section aria-label={DATE_LIST_TEXT.CALENDAR_LABEL} className="flex flex-col gap-3">
    <div className="flex items-center justify-between gap-2">
      <button type="button" aria-label={DATE_LIST_TEXT.PREVIOUS_MONTH} onClick={calendar.onPreviousMonth} className={NAV_BUTTON_CLASS}>
        <span aria-hidden="true">‹</span>
      </button>
      <h2 aria-live="polite" className="font-display text-xl font-semibold text-tacha-text first-letter:uppercase">{calendar.monthLabel}</h2>
      <button type="button" aria-label={DATE_LIST_TEXT.NEXT_MONTH} onClick={calendar.onNextMonth} className={NAV_BUTTON_CLASS}>
        <span aria-hidden="true">›</span>
      </button>
    </div>
    <ol aria-hidden="true" className="grid grid-cols-7 gap-1 text-center font-body text-xs font-semibold text-tacha-textsec">
      {DATE_CALENDAR.WEEKDAYS.map((weekday) => <li key={weekday}>{weekday}</li>)}
    </ol>
    <ol className="grid grid-cols-7 gap-1">
      {calendar.days.map((day) => <CalendarCell key={day.isoDate} day={day} onCreateOnDay={onCreateOnDay} />)}
    </ol>
  </section>
);
