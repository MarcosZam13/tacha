import type { DateListItem } from "../models/DateList.interface";

/**
 * Pendientes primero y tachados al final. sort es estable: dentro de cada grupo se
 * conserva el orden de agregado que trae la consulta.
 */
export const sortPendingFirst = (items: DateListItem[]): DateListItem[] =>
  [...items].sort((first, second) => Number(first.isChecked) - Number(second.isChecked));
