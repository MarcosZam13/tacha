import type { NullableRef } from "@/types/nullable.types";
import { DATE_LIST_NAME, DATE_LIST_TEXT } from "../constants/date-lists.constants";

export interface DateListFormErrors {
  dateError: NullableRef<string>;
  nameError: NullableRef<string>;
}

/**
 * Valida antes de llamar a la base. Las fechas YYYY-MM-DD se comparan como
 * texto porque ese formato ordena igual que el calendario.
 */
export const validateDateListForm = (name: string, eventDate: string, today: string): DateListFormErrors => {
  const trimmedName = name.trim();

  const getNameError = (): NullableRef<string> => {
    if (trimmedName.length === 0) return DATE_LIST_TEXT.NAME_REQUIRED_ERROR;
    if (trimmedName.length > DATE_LIST_NAME.MAX_LENGTH) return DATE_LIST_TEXT.NAME_TOO_LONG_ERROR;
    return null;
  };

  const getDateError = (): NullableRef<string> => {
    if (eventDate.length === 0) return DATE_LIST_TEXT.DATE_REQUIRED_ERROR;
    if (eventDate < today) return DATE_LIST_TEXT.DATE_PAST_ERROR;
    return null;
  };

  return { dateError: getDateError(), nameError: getNameError() };
};
