import { POSTGRES_ERROR_CODE } from "@/constants";
import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import {
  ASSIGNEE_DB,
  ASSIGNEE_LIST_SOURCE,
  NO_LIST_ASSIGNEES,
  SET_ITEM_ASSIGNEE_RESULT,
} from "../constants/assignee-field.constants";
import type { SetItemAssigneeResultType } from "../constants/assignee-field.constants";
import type { AssigneeCandidate } from "../models/AssigneeCandidate.interface";
import type { ListAssigneeData } from "../models/ListAssigneeData.interface";
import type { ListAssigneeSource } from "../models/ListAssigneeSource.type";
import type { SetItemAssigneePayload } from "../models/SetItemAssigneePayload.interface";

// La lista general que le toca a quien llama: la de su familia si es miembro, si no la personal. La decide la
// base; null si todavía no existe (se crea al añadir el primer producto).
const findGeneralListId = async (): Promise<NullableRef<string>> => {
  const { data: generalListId, error } = await getSupabaseClient().rpc(ASSIGNEE_DB.RPC.FIND_GENERAL_LIST_ID);
  if (error) throw error;

  return generalListId;
};

// Sin fila en list_settings, la lista cuenta como apagada.
const getAssigneeEnabled = async (listId: string): Promise<boolean> => {
  const { data: settings, error } = await getSupabaseClient()
    .from(ASSIGNEE_DB.TABLE.LIST_SETTINGS)
    .select(ASSIGNEE_DB.SELECT.SETTING)
    .eq(ASSIGNEE_DB.COLUMN.LIST_ID, listId)
    .maybeSingle();
  if (error) throw error;

  return settings?.assignee_enabled ?? false;
};

const getAssignments = async (listId: string): Promise<Record<string, string>> => {
  const { data: rows, error } = await getSupabaseClient()
    .from(ASSIGNEE_DB.TABLE.LIST_ITEMS)
    .select(ASSIGNEE_DB.SELECT.ASSIGNMENTS)
    .eq(ASSIGNEE_DB.COLUMN.LIST_ID, listId)
    .not(ASSIGNEE_DB.COLUMN.ASSIGNED_TO, "is", null);
  if (error) throw error;

  return Object.fromEntries(
    rows.flatMap((row) => (row.assigned_to === null ? [] : [[row.id, row.assigned_to] as const])),
  );
};

const getCandidates = async (listId: string): Promise<AssigneeCandidate[]> => {
  const { data: rows, error } = await getSupabaseClient().rpc(ASSIGNEE_DB.RPC.GET_CANDIDATES, {
    target_list_id: listId,
  });
  if (error) throw error;

  return rows.map((row) => ({
    displayName: row.display_name,
    isCurrentUser: row.is_current_user,
    userId: row.user_id,
  }));
};

/**
 * Lo que la pantalla de una lista necesita para el campo "Encargado": si el ajuste está encendido y, solo
 * entonces, quién es encargado de cada producto y quiénes se pueden elegir. Con el ajuste apagado (o sin lista
 * todavía) son tres lecturas menos: el costo de la función se paga solo en las listas que la usan.
 * Lanza si falla una lectura; el ViewModel decide qué hacer (el campo es opcional y no rompe la lista).
 */
export const getListAssigneeData = async (source: ListAssigneeSource): Promise<ListAssigneeData> => {
  await ensureSession();

  const listId = source.kind === ASSIGNEE_LIST_SOURCE.GENERAL ? await findGeneralListId() : source.listId;
  if (!listId) return NO_LIST_ASSIGNEES;
  if (!(await getAssigneeEnabled(listId))) return NO_LIST_ASSIGNEES;

  const [assignments, candidates] = await Promise.all([getAssignments(listId), getCandidates(listId)]);

  return { assignments, candidates, isEnabled: true };
};

const toSetItemAssigneeFailure = (errorCode: string): SetItemAssigneeResultType => {
  if (errorCode === POSTGRES_ERROR_CODE.NO_DATA_FOUND) return SET_ITEM_ASSIGNEE_RESULT.NOT_FOUND;

  return errorCode === POSTGRES_ERROR_CODE.INVALID_PARAMETER_VALUE
    ? SET_ITEM_ASSIGNEE_RESULT.NOT_ALLOWED
    : SET_ITEM_ASSIGNEE_RESULT.ERROR;
};

/**
 * Elige al encargado de un producto, o con `null` lo quita. Devuelve un resultado, no lanza. La base comprueba
 * que el producto es de una lista que quien llama ve y que el encargado tiene acceso a ella; el error se
 * reconoce por su código (P0002: el producto ya no está; 22023: el encargado no tiene acceso), nunca por el texto.
 */
export const setItemAssignee = async ({
  assigneeId,
  itemId,
}: SetItemAssigneePayload): Promise<SetItemAssigneeResultType> => {
  try {
    const { error } = await getSupabaseClient().rpc(ASSIGNEE_DB.RPC.SET_ITEM_ASSIGNEE, {
      // El generador de tipos marca todos los argumentos de una RPC como no nulos, pero esta acepta null para
      // quitar al encargado (PostgREST manda el null de JSON como un uuid nulo).
      new_assignee: assigneeId as string,
      target_item_id: itemId,
    });

    return error ? toSetItemAssigneeFailure(error.code) : SET_ITEM_ASSIGNEE_RESULT.SAVED;
  } catch {
    return SET_ITEM_ASSIGNEE_RESULT.ERROR;
  }
};
