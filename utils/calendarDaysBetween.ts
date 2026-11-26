import { startOfLocalDay } from "./startOfLocalDay";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Días del calendario local de `from` a `to` (negativo si `to` es antes).
 * Cuenta días y no bloques de 24 h: de ayer a las 11 p. m. a hoy a las 8 a. m.
 * es 1. Math.round absorbe el día de 23 o 25 h de un cambio de horario. Lo usan
 * "Lo compraste hace N días" (SCRUM-102) y "Te quedan N días" (SCRUM-105).
 */
export const calendarDaysBetween = (from: Date, to: Date): number =>
  Math.round((Date.parse(startOfLocalDay(to)) - Date.parse(startOfLocalDay(from))) / MS_PER_DAY);
