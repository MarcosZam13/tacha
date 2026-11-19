import { POSTGRES_ERROR_CODE } from "@/constants";
import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import { LIST_SETTINGS_DB, SET_ASSIGNEE_ENABLED_RESULT } from "../constants/list-settings.constants";
import type { SetAssigneeEnabledResultType } from "../constants/list-settings.constants";
import type { SettableList } from "../models/SettableList.interface";
import { toSettableLists } from "../utils/toSettableLists";

/**
 * Las listas que se pueden configurar hoy (la general y las sublistas por fecha) de quien llama, con su ajuste
 * "Encargado". La RLS deja pasar las suyas y las de su familia. Lanza si falla la lectura: el ViewModel muestra
 * el error con "Reintentar".
 */
export const getSettableLists = async (): Promise<SettableList[]> => {
  await ensureSession();

  const { data: rows, error } = await getSupabaseClient()
    .from(LIST_SETTINGS_DB.TABLE.LISTS)
    .select(LIST_SETTINGS_DB.SELECT)
    .in("type", Object.values(LIST_SETTINGS_DB.LIST_TYPE));
  if (error) throw error;

  return toSettableLists(rows);
};

/**
 * Enciende o apaga el "Encargado" de una lista. Devuelve un resultado, no lanza. La base comprueba que la lista
 * es de quien llama o de su familia; el error se reconoce por su código (P0002: la lista ya no existe o no es
 * suya), nunca por el texto.
 */
export const setAssigneeEnabled = async (listId: string, isEnabled: boolean): Promise<SetAssigneeEnabledResultType> => {
  try {
    const { error } = await getSupabaseClient().rpc(LIST_SETTINGS_DB.RPC.SET_ASSIGNEE_ENABLED, {
      enabled: isEnabled,
      target_list_id: listId,
    });
    if (!error) return SET_ASSIGNEE_ENABLED_RESULT.SAVED;

    return error.code === POSTGRES_ERROR_CODE.NO_DATA_FOUND
      ? SET_ASSIGNEE_ENABLED_RESULT.NOT_FOUND
      : SET_ASSIGNEE_ENABLED_RESULT.ERROR;
  } catch {
    return SET_ASSIGNEE_ENABLED_RESULT.ERROR;
  }
};
