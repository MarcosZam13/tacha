import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import { COOK_CHOICE, MEAL_PLAN_DB, MEAL_PLAN_ERROR_CODE } from "../constants/meal-planner.constants";
import type {
  ClearMealSlotPayload,
  ClearMealSlotResponse,
  GetMealPlanParams,
  MealPlanEntry,
  MealPlanRow,
  RecipeOption,
  SaveMealSlotPayload,
  SaveMealSlotResponse,
} from "../models/meal-plan.interfaces";
import { toMealPlanEntry } from "../utils/toMealPlanEntry";
import { toRecipeOption } from "../utils/toRecipeOption";

/**
 * Trae el plan de un rango de fechas (las dos semanas de la grilla) con la
 * receta de cada espacio embebida, en una sola petición.
 *
 * No filtra por dueño a propósito: lo decide RLS en la base. Hoy la política
 * devuelve solo el plan propio; cuando exista el household se suma la de
 * miembros y esta consulta devuelve también el plan compartido sin cambiar nada.
 */
export const getMealPlan = async (params: GetMealPlanParams): Promise<MealPlanEntry[]> => {
  // Sin sesión la petición iría como anon, que no tiene permisos sobre meal_plans.
  await ensureSession();

  const { data: planRows, error } = await getSupabaseClient()
    .from(MEAL_PLAN_DB.TABLE.MEAL_PLANS)
    .select(MEAL_PLAN_DB.PLAN_SELECT)
    .gte(MEAL_PLAN_DB.COLUMN.DATE, params.fromDateKey)
    .lte(MEAL_PLAN_DB.COLUMN.DATE, params.toDateKey);
  if (error) throw error;

  // La forma de la fila la fija PLAN_SELECT; el cliente tipado la infiere pero no la valida en ejecución.
  return (planRows as unknown as MealPlanRow[]).map(toMealPlanEntry);
};

/**
 * Asigna una receta a un espacio (o reemplaza la que tenía) con una sola
 * llamada a assign_meal_slot, que lo hace todo o nada.
 *
 * El cocinero se manda como un booleano y no como un id: el id del usuario lo
 * pone la base (security-practices).
 *
 * Devuelve null si la receta no se encontró (se borró en otra pestaña o es
 * ajena): la RPC responde P0002 en los dos casos.
 */
export const saveMealSlot = async (payload: SaveMealSlotPayload): Promise<NullableRef<SaveMealSlotResponse>> => {
  await ensureSession();

  const { data: savedSlotId, error } = await getSupabaseClient().rpc(MEAL_PLAN_DB.RPC.ASSIGN_MEAL_SLOT, {
    cook_is_self: payload.cookChoice === COOK_CHOICE.SELF,
    slot_date: payload.dateKey,
    slot_meal_type: payload.mealType,
    slot_servings_multiplier: payload.servingsMultiplier,
    target_recipe_id: payload.recipeId,
  });
  if (error?.code === MEAL_PLAN_ERROR_CODE.NO_DATA_FOUND) return null;
  if (error) throw error;

  return { slotId: savedSlotId };
};

/**
 * Quita la asignación de un espacio. Un solo delete, así que ya es todo o
 * nada (no hace falta una RPC).
 *
 * Si el espacio ya estaba vacío o no es del usuario, RLS no lo ve: se borran 0
 * filas y no hay error. Se responde igual que un borrado correcto, a propósito:
 * para quien lo pidió el espacio ya está vacío.
 */
export const clearMealSlot = async (payload: ClearMealSlotPayload): Promise<ClearMealSlotResponse> => {
  await ensureSession();

  const { error } = await getSupabaseClient()
    .from(MEAL_PLAN_DB.TABLE.MEAL_PLANS)
    .delete()
    .eq(MEAL_PLAN_DB.COLUMN.DATE, payload.dateKey)
    .eq(MEAL_PLAN_DB.COLUMN.MEAL_TYPE, payload.mealType);
  if (error) throw error;

  return { dateKey: payload.dateKey, mealType: payload.mealType };
};

/**
 * Las recetas que el usuario puede elegir en el diálogo, por orden alfabético.
 * Sin filtro por dueño: lo hace RLS. Pide solo id, nombre y porciones base: no
 * trae los ingredientes que el diálogo no usa.
 */
export const getRecipeOptions = async (): Promise<RecipeOption[]> => {
  await ensureSession();

  const { data: recipeRows, error } = await getSupabaseClient()
    .from(MEAL_PLAN_DB.TABLE.RECIPES)
    .select(MEAL_PLAN_DB.RECIPE_OPTIONS_SELECT)
    .order(MEAL_PLAN_DB.COLUMN.NAME, { ascending: true });
  if (error) throw error;

  return recipeRows.map(toRecipeOption);
};
