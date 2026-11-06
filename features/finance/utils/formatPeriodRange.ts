import type { NullableRef } from "@/types/nullable.types";
import { PERIOD_RANGE_FORMAT, SPENDING_PERIOD } from "../constants/finance.constants";
import type { SpendingPeriodType } from "../constants/finance.constants";
import type { PeriodBounds } from "../models/PeriodBounds.interface";

// Un formateador por zona, creado una sola vez: armar un Intl.DateTimeFormat en
// cada llamada es lo caro. La clave vacía es la zona del navegador. Se arma el
// texto con las partes (formatToParts) y no con format(), porque format()
// agrega una coma después del día de la semana ("domingo, 18 de octubre") que
// el texto de SPEC regla 9 no lleva.
const BROWSER_TIME_ZONE_KEY = "";
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

// Con zona guardada, las fechas son las de esa zona y no las del navegador
// (SCRUM-91, regla 58). null = la del navegador.
const getDateFormatter = (timeZone: NullableRef<string>): Intl.DateTimeFormat => {
  const key = timeZone ?? BROWSER_TIME_ZONE_KEY;
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(PERIOD_RANGE_FORMAT.LOCALE, {
      day: "numeric",
      month: "long",
      timeZone: timeZone ?? undefined,
      weekday: "long",
      year: "numeric",
    });
    dateFormatters.set(key, formatter);
  }
  return formatter;
};

interface DateParts {
  day: string;
  month: string;
  weekday: string;
  year: string;
}

const toDateParts = (date: Date, timeZone: NullableRef<string>): DateParts => {
  const parts = getDateFormatter(timeZone).formatToParts(date);
  const valueOf = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  return { day: valueOf("day"), month: valueOf("month"), weekday: valueOf("weekday"), year: valueOf("year") };
};

const capitalize = (text: string): string => text.charAt(0).toLocaleUpperCase(PERIOD_RANGE_FORMAT.LOCALE) + text.slice(1);

const { DATE_CONNECTOR, RANGE_CONNECTOR } = PERIOD_RANGE_FORMAT;

// "domingo 18 de octubre", con el año solo si se pide.
const toDayText = (parts: DateParts, withYear: boolean): string =>
  `${parts.weekday} ${parts.day}${DATE_CONNECTOR}${parts.month}${withYear ? `${DATE_CONNECTOR}${parts.year}` : ""}`;

/** Un día con su día de la semana, sin el año: "Domingo 18 de octubre". */
export const formatDay = (date: Date, timeZone: NullableRef<string> = null): string =>
  capitalize(toDayText(toDateParts(date, timeZone), false));

/**
 * Las fechas de un periodo, para ver qué se está sumando (SPEC regla 9):
 * - día: "Domingo 18 de octubre";
 * - semana: "Lunes 12 a domingo 18 de octubre"; si cruza de mes, "Lunes 29 de
 *   septiembre a domingo 5 de octubre"; si cruza de año, con los dos años;
 * - mes: "Octubre de 2026".
 * El último día es el anterior a `end`, que no se incluye. `timeZone` es la zona
 * guardada; null = la del navegador.
 */
export const formatPeriodRange = (
  period: SpendingPeriodType,
  bounds: PeriodBounds,
  timeZone: NullableRef<string> = null,
): string => {
  const first = toDateParts(bounds.start, timeZone);

  if (period === SPENDING_PERIOD.DAY) return formatDay(bounds.start, timeZone);
  if (period === SPENDING_PERIOD.MONTH) return capitalize(`${first.month}${DATE_CONNECTOR}${first.year}`);

  // SPENDING_PERIOD.WEEK: el único que queda en la unión. El último instante
  // antes de `end` cae en el último día en cualquier zona, aunque ese día dure
  // 23 o 25 horas.
  const lastDay = new Date(bounds.end.getTime() - 1);
  const last = toDateParts(lastDay, timeZone);
  const crossesYear = first.year !== last.year;
  const firstText =
    first.month === last.month && !crossesYear ? `${first.weekday} ${first.day}` : toDayText(first, crossesYear);

  return capitalize(`${firstText}${RANGE_CONNECTOR}${toDayText(last, crossesYear)}`);
};
