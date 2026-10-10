import { getWeekdayIndex } from "./getWeekdayIndex";

/**
 * El lunes de la semana de `date`, a medianoche en hora local. Un domingo
 * pertenece a la semana que empezó el lunes anterior. Resta días con
 * new Date(año, mes, día - n) y no milisegundos: así un cambio de mes, de año
 * o de hora de verano no desfasa el resultado.
 */
export const getWeekStart = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() - getWeekdayIndex(date));
