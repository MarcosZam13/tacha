import { PERIOD_RANGE_FORMAT, SPENDING_PERIOD } from "../constants/finance.constants";
import type { SpendingPeriodType } from "../constants/finance.constants";
import type { PeriodBounds } from "../models/PeriodBounds.interface";

// Se crea una vez. Se arma el texto con las partes (formatToParts) y no con
// format(), porque format() agrega una coma después del día de la semana
// ("domingo, 18 de octubre") que el texto de SPEC regla 9 no lleva.
const dateFormatter = new Intl.DateTimeFormat(PERIOD_RANGE_FORMAT.LOCALE, {
  day: "numeric",
  month: "long",
  weekday: "long",
  year: "numeric",
});

interface DateParts {
  day: string;
  month: string;
  weekday: string;
  year: string;
}

const toDateParts = (date: Date): DateParts => {
  const parts = dateFormatter.formatToParts(date);
  const valueOf = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  return { day: valueOf("day"), month: valueOf("month"), weekday: valueOf("weekday"), year: valueOf("year") };
};

const capitalize = (text: string): string => text.charAt(0).toLocaleUpperCase(PERIOD_RANGE_FORMAT.LOCALE) + text.slice(1);

const { DATE_CONNECTOR, RANGE_CONNECTOR } = PERIOD_RANGE_FORMAT;

// "domingo 18 de octubre", con el año solo si se pide.
const toDayText = (parts: DateParts, withYear: boolean): string =>
  `${parts.weekday} ${parts.day}${DATE_CONNECTOR}${parts.month}${withYear ? `${DATE_CONNECTOR}${parts.year}` : ""}`;

/**
 * Las fechas de un periodo, para ver qué se está sumando (SPEC regla 9):
 * - día: "Domingo 18 de octubre";
 * - semana: "Lunes 12 a domingo 18 de octubre"; si cruza de mes, "Lunes 29 de
 *   septiembre a domingo 5 de octubre"; si cruza de año, con los dos años;
 * - mes: "Octubre de 2026".
 * El último día es el anterior a `end`, que no se incluye.
 */
export const formatPeriodRange = (period: SpendingPeriodType, bounds: PeriodBounds): string => {
  const first = toDateParts(bounds.start);

  if (period === SPENDING_PERIOD.DAY) return capitalize(toDayText(first, false));
  if (period === SPENDING_PERIOD.MONTH) return capitalize(`${first.month}${DATE_CONNECTOR}${first.year}`);

  // SPENDING_PERIOD.WEEK: el único que queda en la unión.
  const lastDay = new Date(bounds.end.getFullYear(), bounds.end.getMonth(), bounds.end.getDate() - 1);
  const last = toDateParts(lastDay);
  const crossesYear = first.year !== last.year;
  const firstText =
    first.month === last.month && !crossesYear ? `${first.weekday} ${first.day}` : toDayText(first, crossesYear);

  return capitalize(`${firstText}${RANGE_CONNECTOR}${toDayText(last, crossesYear)}`);
};
