import { POSTGRES_ERROR_CODE } from "@/constants";
import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import { PLAN_SCOPE, WEEK_LIST_DB, WEEK_LIST_DESTINATION } from "../constants/meal-planner.constants";
import type {
  AddWeekToListPayload,
  AddWeekToListResponse,
  AddWeekToListRow,
} from "../models/week-list-addition.interfaces";
import { toAddWeekToListResponse } from "../utils/toAddWeekToListResponse";

/**
 * Agrega a la lista elegida los ingredientes de las comidas planeadas de una
 * semana, con una sola llamada a add_plan_week_to_list: la base multiplica las
 * cantidades por el ×N de cada espacio, aplica las mismas reglas que agregar una
 * receta y lo hace todo o nada. Sin target_list_id es la lista general.
 *
 * No manda ids de usuario ni de recetas: el plan (el propio o el de su
 * familia) y las recetas los resuelve la base. Devuelve null si la sublista ya no
 * está disponible; cualquier otro error (también el P0002 de una receta, que no
 * trae el hint) se lanza.
 */
export const addWeekToList = async ({
  destination,
  fromDateKey,
  scope,
  toDateKey,
}: AddWeekToListPayload): Promise<NullableRef<AddWeekToListResponse>> => {
  // Sin sesión la petición iría como anon, que no tiene permiso para ejecutar la RPC.
  await ensureSession();

  const { data, error } = await getSupabaseClient().rpc(WEEK_LIST_DB.RPC.ADD_PLAN_WEEK_TO_LIST, {
    from_household: scope === PLAN_SCOPE.FAMILY,
    week_from: fromDateKey,
    week_to: toDateKey,
    ...(destination.kind === WEEK_LIST_DESTINATION.DATE_LIST ? { target_list_id: destination.id } : {}),
  });
  if (
    error?.code === POSTGRES_ERROR_CODE.NO_DATA_FOUND &&
    error.hint === WEEK_LIST_DB.HINT_DATE_LIST_UNAVAILABLE
  ) {
    return null;
  }
  if (error) throw error;

  // La RPC devuelve jsonb (Json en los tipos): su forma la fija la migración 062.
  return toAddWeekToListResponse(data as unknown as AddWeekToListRow);
};
