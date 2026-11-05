import { EVENT_DATE_FORMAT } from "../constants/date-lists.constants";

/**
 * La fecha local de hoy como YYYY-MM-DD. No usa toISOString: esa es la fecha
 * en UTC, y en la noche de Costa Rica ya sería mañana.
 */
export const toLocalIsoDate = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
};

/**
 * "2026-12-20" → "domingo, 20 de diciembre de 2026". Arma la fecha por partes:
 * new Date("2026-12-20") la lee como medianoche en UTC, que en Costa Rica es
 * el día anterior (SPEC §5, regla 4).
 */
export const formatEventDate = (eventDate: string): string => {
  const parts = EVENT_DATE_FORMAT.PATTERN.exec(eventDate);
  if (!parts) return eventDate;

  const [, year, month, day] = parts;
  const localDate = new Date(Number(year), Number(month) - 1, Number(day));

  return new Intl.DateTimeFormat(EVENT_DATE_FORMAT.LOCALE, { dateStyle: "full" }).format(localDate);
};
