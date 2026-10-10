import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import { WEEK_LIST_DB } from "../constants/meal-planner.constants";
import type {
  AddWeekToListPayload,
  AddWeekToListResponse,
  AddWeekToListRow,
} from "../models/week-list-addition.interfaces";
import { toAddWeekToListResponse } from "../utils/toAddWeekToListResponse";

/**
 * Agrega a la lista general los ingredientes de las comidas planeadas de una
 * semana, con una sola llamada a add_week_to_general_list: la base multiplica
 * las cantidades por el ×N de cada espacio, aplica las mismas reglas que agregar
 * una receta y lo hace todo o nada.
 *
 * No manda ids de usuario ni de recetas: el plan y las recetas son los del
 * propio usuario y los resuelve la base (RLS). Cualquier error se lanza.
 */
export const addWeekToList = async (payload: AddWeekToListPayload): Promise<AddWeekToListResponse> => {
  // Sin sesión la petición iría como anon, que no tiene permiso para ejecutar la RPC.
  await ensureSession();

  const { data, error } = await getSupabaseClient().rpc(WEEK_LIST_DB.RPC.ADD_WEEK_TO_GENERAL_LIST, {
    week_from: payload.fromDateKey,
    week_to: payload.toDateKey,
  });
  if (error) throw error;

  // La RPC devuelve jsonb (Json en los tipos): su forma la fija la migración 022.
  return toAddWeekToListResponse(data as unknown as AddWeekToListRow);
};
