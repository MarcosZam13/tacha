import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import {
  COOK_CHOICE,
  MEAL_PLAN_DB,
  MEAL_PLAN_ERROR_CODE,
  MEAL_SLOT_TEXT,
  SAVE_SLOT_RESULT,
} from "../constants/meal-planner.constants";
import type {
  ClearMealSlotPayload,
  CookOption,
  GetMealPlanParams,
  HouseholdMealPlanRow,
  MealPlanEntry,
  RecipeOption,
  SaveMealSlotPayload,
} from "../models/meal-plan.interfaces";
import type { CookChoiceType, SaveSlotResult } from "../models/meal-plan.types";
import { isNoHouseholdError } from "../utils/isNoHouseholdError";
import { toHouseholdMealPlanEntry } from "../utils/toHouseholdMealPlanEntry";
import { toRecipeOption } from "../utils/toRecipeOption";

// El plan de la familia va solo por funciones de la base (062), que sacan la
// familia de la membresía: ninguna recibe un household_id.

/** El plan de la familia; null si quien llama ya no tiene. */
export const getHouseholdMealPlan = async (params: GetMealPlanParams): Promise<NullableRef<MealPlanEntry[]>> => {
  await ensureSession();

  const { data: planRows, error } = await getSupabaseClient().rpc(MEAL_PLAN_DB.RPC.GET_HOUSEHOLD_MEAL_PLAN, {
    plan_from: params.fromDateKey,
    plan_to: params.toDateKey,
  });
  if (isNoHouseholdError(error)) return null;
  if (error) throw error;

  // Los tipos generados no marcan como nulas las columnas de una función; sin cocinero lo son.
  return (planRows as HouseholdMealPlanRow[]).map(toHouseholdMealPlanEntry);
};

// El id que se manda como cocinero: el propio sale de la sesión; sin valor, nadie. La base valida que sea miembro.
const toCookUserId = (cookChoice: CookChoiceType, currentUserId: string): string | undefined => {
  if (cookChoice === COOK_CHOICE.NONE) return undefined;
  return cookChoice === COOK_CHOICE.SELF ? currentUserId : cookChoice;
};

/** Asigna o reemplaza un espacio del plan de la familia. */
export const saveHouseholdMealSlot = async (payload: SaveMealSlotPayload): Promise<SaveSlotResult> => {
  const session = await ensureSession();

  const { data: slotId, error } = await getSupabaseClient().rpc(MEAL_PLAN_DB.RPC.ASSIGN_HOUSEHOLD_MEAL_SLOT, {
    cook_user_id: toCookUserId(payload.cookChoice, session.user.id),
    slot_date: payload.dateKey,
    slot_meal_type: payload.mealType,
    slot_servings_multiplier: payload.servingsMultiplier,
    target_recipe_id: payload.recipeId,
  });
  if (isNoHouseholdError(error)) return { kind: SAVE_SLOT_RESULT.NO_HOUSEHOLD };
  if (error?.hint === MEAL_PLAN_DB.HINT.COOK_NOT_MEMBER) return { kind: SAVE_SLOT_RESULT.COOK_GONE };
  if (error?.code === MEAL_PLAN_ERROR_CODE.NO_DATA_FOUND) return { kind: SAVE_SLOT_RESULT.RECIPE_GONE };
  if (error) throw error;

  return { kind: SAVE_SLOT_RESULT.SAVED, slotId };
};

/** Quita un espacio del plan de la familia; false si quien llama ya no tiene. */
export const clearHouseholdMealSlot = async (payload: ClearMealSlotPayload): Promise<boolean> => {
  await ensureSession();

  const { error } = await getSupabaseClient().rpc(MEAL_PLAN_DB.RPC.CLEAR_HOUSEHOLD_MEAL_SLOT, {
    slot_date: payload.dateKey,
    slot_meal_type: payload.mealType,
  });
  if (isNoHouseholdError(error)) return false;
  if (error) throw error;

  return true;
};

/** Las recetas de la familia: RLS ya deja ver solo las de la propia. */
export const getHouseholdRecipeOptions = async (): Promise<RecipeOption[]> => {
  await ensureSession();

  const { data: recipeRows, error } = await getSupabaseClient()
    .from(MEAL_PLAN_DB.TABLE.RECIPES)
    .select(MEAL_PLAN_DB.RECIPE_OPTIONS_SELECT)
    .not(MEAL_PLAN_DB.COLUMN.HOUSEHOLD_ID, "is", null)
    .order(MEAL_PLAN_DB.COLUMN.NAME, { ascending: true });
  if (error) throw error;

  return recipeRows.map(toRecipeOption);
};

/** Los demás miembros de la familia, para elegir cocinero. */
export const getOtherHouseholdCooks = async (): Promise<CookOption[]> => {
  await ensureSession();

  const { data: memberRows, error } = await getSupabaseClient().rpc(MEAL_PLAN_DB.RPC.GET_HOUSEHOLD_MEMBERS_PAGE, {
    page_size: MEAL_PLAN_DB.MEMBERS_PAGE_SIZE,
  });
  if (error) throw error;

  return memberRows
    .filter((memberRow) => !memberRow.is_current_user)
    .map((memberRow) => ({
      label: memberRow.display_name ?? MEAL_SLOT_TEXT.COOK_UNNAMED,
      value: memberRow.user_id,
    }));
};
