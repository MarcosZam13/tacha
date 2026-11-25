import { DATE_LIST_STATUS, DATE_LIST_TYPE } from "@/constants";
import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import { WEEK_LIST_DB } from "../constants/meal-planner.constants";
import type { DateListOption } from "../models/week-list-addition.interfaces";
import { toDateListOption } from "../utils/toDateListOption";

/**
 * Las sublistas a las que se puede agregar la semana: pendientes y de hoy en
 * adelante, de la más próxima a la más lejana (SPEC regla 40). Cuáles ve quien
 * llama lo decide la RLS (las suyas y las de su familia).
 */
export const getDateListOptions = async (todayKey: string): Promise<DateListOption[]> => {
  await ensureSession();

  const { data, error } = await getSupabaseClient()
    .from(WEEK_LIST_DB.TABLE_LISTS)
    .select(WEEK_LIST_DB.OPTION_SELECT)
    .eq(WEEK_LIST_DB.COLUMN.TYPE, DATE_LIST_TYPE)
    .eq(WEEK_LIST_DB.COLUMN.STATUS, DATE_LIST_STATUS.ACTIVE)
    .gte(WEEK_LIST_DB.COLUMN.EVENT_DATE, todayKey)
    .order(WEEK_LIST_DB.COLUMN.EVENT_DATE)
    .order(WEEK_LIST_DB.COLUMN.CREATED_AT);
  if (error) throw error;

  return data.map((row) => toDateListOption(row, todayKey));
};
