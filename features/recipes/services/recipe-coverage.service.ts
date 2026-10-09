import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import {
  POSTGRES_ERROR_CODE,
  RECIPE_COVERAGE_REALTIME,
  RECIPES_DB,
} from "../constants/recipes.constants";
import type { CoverageIngredient, CoverageRow, GetRecipeCoveragePayload } from "../models/recipe-coverage.interfaces";
import { toCoverageIngredients } from "../utils/toCoverageIngredients";

// Cada suscripción lleva un número propio en el nombre del canal. Con el mismo
// nombre supabase-js devuelve el canal que ya existe, y agregarle un listener
// después de suscribirlo falla (pasa en desarrollo, cuando React corre el efecto dos veces).
let channelCounter = 0;

/**
 * Pide a la base qué ingredientes de la receta están cubiertos y cuáles
 * faltan, con una sola llamada a get_recipe_coverage (reglas 29 a 31 de la
 * SPEC). Solo lee: no escribe nada.
 * Devuelve null si la receta no se encontró (se borró en otra pestaña o es
 * ajena): la RPC responde P0002 en los dos casos.
 */
export const getRecipeCoverage = async (
  payload: GetRecipeCoveragePayload,
): Promise<NullableRef<CoverageIngredient[]>> => {
  await ensureSession();

  const { data: coverageRows, error } = await getSupabaseClient().rpc(RECIPES_DB.RPC.GET_RECIPE_COVERAGE, {
    target_recipe_id: payload.recipeId,
  });
  if (error?.code === POSTGRES_ERROR_CODE.NO_DATA_FOUND) return null;
  if (error) throw error;

  // La RPC devuelve jsonb: la base no le da tipo, lo fija el contrato de la función (017).
  return toCoverageIngredients(coverageRows as unknown as CoverageRow[]);
};

/**
 * Avisa con `onChange` cada vez que cambia algo en list_items del usuario
 * (tachar, destachar, agregar, quitar, cambiar cantidad). Realtime aplica la
 * RLS de list_items a insert y update; el contenido del evento no se usa: es
 * solo la señal para volver a llamar a getRecipeCoverage (regla 32).
 * Devuelve la función que cancela la suscripción.
 */
export const subscribeToListChanges = async (onChange: () => void): Promise<() => void> => {
  // Realtime necesita la sesión para saber de quién son los cambios.
  await ensureSession();

  const client = getSupabaseClient();
  channelCounter += 1;
  const channel = client
    .channel(`${RECIPE_COVERAGE_REALTIME.CHANNEL_PREFIX}${channelCounter}`)
    .on(
      RECIPE_COVERAGE_REALTIME.LISTEN_TYPE,
      {
        event: RECIPE_COVERAGE_REALTIME.EVENT,
        schema: RECIPE_COVERAGE_REALTIME.SCHEMA,
        table: RECIPE_COVERAGE_REALTIME.TABLE,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
};
