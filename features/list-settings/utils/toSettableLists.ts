import type { NullableRef } from "@/types/nullable.types";
import { LIST_SETTINGS_DB, LIST_SETTINGS_TEXT } from "../constants/list-settings.constants";
import type { ListSettingsRow } from "../models/ListSettingsRow.interface";
import type { SettableList } from "../models/SettableList.interface";
import { formatListDate } from "./formatListDate";

// Primero la lista general, luego las sublistas por fecha.
const SORT_RANK = { GENERAL: 0, SUBLIST: 1 } as const;

const toSortRank = (row: ListSettingsRow): number =>
  row.type === LIST_SETTINGS_DB.LIST_TYPE.DATE ? SORT_RANK.SUBLIST : SORT_RANK.GENERAL;

const toLabel = (row: ListSettingsRow): string => {
  if (row.type === LIST_SETTINGS_DB.LIST_TYPE.DATE) {
    const name = row.name ?? "";

    return row.event_date ? `${name} · ${formatListDate(row.event_date)}` : name;
  }
  if (row.household_id !== null) return LIST_SETTINGS_TEXT.GENERAL_LIST_FAMILY;

  return LIST_SETTINGS_TEXT.GENERAL_LIST;
};

const compareRows = (first: ListSettingsRow, second: ListSettingsRow): number => {
  const rankDifference = toSortRank(first) - toSortRank(second);
  if (rankDifference !== 0) return rankDifference;

  // Las sublistas, de la fecha más próxima a la más lejana (YYYY-MM-DD se ordena como texto).
  const firstDate: NullableRef<string> = first.event_date;
  const secondDate: NullableRef<string> = second.event_date;
  if (firstDate !== null && secondDate !== null && firstDate !== secondDate) {
    return firstDate < secondDate ? -1 : 1;
  }

  return (first.name ?? "").localeCompare(second.name ?? "");
};

// Con familia, la lista general que no es de la familia es la personal que se mantuvo al unirse (SCRUM-59, D4):
// su sección en /lista no muestra el campo "Encargado", así que no se ofrece configurarla (SPEC §14).
const isKeptPersonalList = (row: ListSettingsRow, hasFamilyList: boolean): boolean =>
  hasFamilyList && row.type === LIST_SETTINGS_DB.LIST_TYPE.GENERAL && row.household_id === null;

/**
 * Las filas de `lists` → las listas de Configuración, ordenadas y con su nombre armado. Sin fila de ajuste,
 * el "Encargado" cuenta como apagado (SPEC §5, regla 1).
 */
export const toSettableLists = (rows: ListSettingsRow[]): SettableList[] => {
  const hasFamilyList = rows.some((row) => row.household_id !== null);

  return rows
    .filter((row) => !isKeptPersonalList(row, hasFamilyList))
    .sort(compareRows)
    .map((row) => ({
      id: row.id,
      isEnabled: row.list_settings?.assignee_enabled ?? false,
      label: toLabel(row),
    }));
};
