import { POSTGRES_ERROR_CODE } from "@/constants";
import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import { RECIPE_SHARING_HINT, RECIPES_DB, SHARE_RECIPE_RESULT } from "../constants/recipes.constants";
import type { ShareRecipeResult } from "../models/recipe-sharing.types";

/**
 * Comparte una receta personal con la familia de quien llama: la familia la pone la
 * base. No lanza: devuelve qué pasó. Repetirlo con una ya compartida no hace nada.
 */
export const shareRecipe = async (recipeId: string): Promise<ShareRecipeResult> => {
  try {
    const { data: blockedNames, error } = await getSupabaseClient().rpc(RECIPES_DB.RPC.SHARE_RECIPE, {
      target_recipe_id: recipeId,
    });

    if (error?.code === POSTGRES_ERROR_CODE.NO_DATA_FOUND) return { kind: SHARE_RECIPE_RESULT.NOT_FOUND };
    if (error?.hint === RECIPE_SHARING_HINT.NO_HOUSEHOLD) return { kind: SHARE_RECIPE_RESULT.NO_HOUSEHOLD };
    if (error?.hint === RECIPE_SHARING_HINT.HOUSEHOLD_LIMIT) return { kind: SHARE_RECIPE_RESULT.HOUSEHOLD_LIMIT };
    if (error) return { kind: SHARE_RECIPE_RESULT.FAILED };

    return blockedNames.length > 0
      ? { kind: SHARE_RECIPE_RESULT.PERSONAL_PRODUCTS, productNames: blockedNames }
      : { kind: SHARE_RECIPE_RESULT.SHARED };
  } catch {
    return { kind: SHARE_RECIPE_RESULT.FAILED };
  }
};

/**
 * Guarda una copia personal de una receta de la familia, que conserva la suya.
 * Devuelve false si la receta ya no se ve (se borró o dejó la familia).
 */
export const copyRecipe = async (recipeId: string): Promise<boolean> => {
  await ensureSession();

  const { error } = await getSupabaseClient().rpc(RECIPES_DB.RPC.COPY_RECIPE, { target_recipe_id: recipeId });
  if (error?.code === POSTGRES_ERROR_CODE.NO_DATA_FOUND) return false;
  if (error) throw error;

  return true;
};
