import { DATE_KEY } from "../constants/meal-planner.constants";

const padPart = (value: number): string => String(value).padStart(DATE_KEY.PAD_LENGTH, DATE_KEY.PAD_CHARACTER);

/**
 * El día de `date` en hora local como "2026-10-12". Se arma con los getters
 * locales y no con toISOString(): ese devuelve UTC, y en Costa Rica (UTC-6)
 * después de las 6 p. m. ya diría el día siguiente.
 */
export const toLocalDateKey = (date: Date): string =>
  [String(date.getFullYear()), padPart(date.getMonth() + 1), padPart(date.getDate())].join(DATE_KEY.SEPARATOR);
