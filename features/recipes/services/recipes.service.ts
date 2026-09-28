import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import { POSTGRES_ERROR_CODE, RECIPES_DB } from "../constants/recipes.constants";
import type { RecipeEditorValues } from "../models/RecipeEditorValues.interface";
import type { RecipeSummary } from "../models/RecipeSummary.interface";
import type { SaveRecipePayload } from "../models/SaveRecipePayload.interface";
import type { SaveRecipeResponse } from "../models/SaveRecipeResponse.interface";
import { toRecipeEditorValues } from "../utils/toRecipeEditorValues";
import { toRecipeSummary } from "../utils/toRecipeSummary";

/**
 * Trae las recetas que el usuario puede ver, más nuevas primero, con sus
 * ingredientes (el adapter los ordena por `position`).
 *
 * No filtra por dueño a propósito: eso lo decide RLS en la base. Hoy la
 * política devuelve solo las recetas propias; cuando exista households se
 * suma la de miembros y esta consulta devuelve también las compartidas sin
 * cambiar nada acá.
 */
export const getRecipeSummaries = async (): Promise<RecipeSummary[]> => {
  // Sin sesión la petición iría como anon, que no tiene permisos sobre recipes.
  await ensureSession();

  const { data: recipeRows, error } = await getSupabaseClient()
    .from(RECIPES_DB.TABLE.RECIPES)
    .select(RECIPES_DB.CATALOG_SELECT)
    .order(RECIPES_DB.COLUMN.CREATED_AT, { ascending: false });
  if (error) throw error;

  return recipeRows.map(toRecipeSummary);
};

/**
 * Trae una receta para editarla, ya convertida a valores del formulario.
 * Devuelve null si no se encontró: no existe, es de otro usuario (RLS no la
 * devuelve) o el id de la URL no es un uuid. Las tres dan el mismo resultado
 * para no revelar si una receta ajena existe.
 */
export const getRecipeForEditing = async (recipeId: string): Promise<NullableRef<RecipeEditorValues>> => {
  await ensureSession();

  const { data: recipeRow, error } = await getSupabaseClient()
    .from(RECIPES_DB.TABLE.RECIPES)
    .select(RECIPES_DB.EDITOR_SELECT)
    .eq(RECIPES_DB.COLUMN.ID, recipeId)
    .maybeSingle();
  if (error?.code === POSTGRES_ERROR_CODE.INVALID_TEXT_REPRESENTATION) return null;
  if (error) throw error;

  return recipeRow ? toRecipeEditorValues(recipeRow) : null;
};

/**
 * Crea o edita una receta con todos sus ingredientes en una sola llamada a
 * save_recipe, que lo hace en una transacción: o se guarda todo o nada.
 */
export const saveRecipe = async (payload: SaveRecipePayload): Promise<SaveRecipeResponse> => {
  await ensureSession();

  const { data: savedRecipeId, error } = await getSupabaseClient().rpc(RECIPES_DB.RPC.SAVE_RECIPE, {
    // Así lo espera la función en la base; el orden define `position`.
    ingredient_list: payload.ingredients.map((ingredient) => ({
      product_catalog_id: ingredient.productId,
      quantity_unit: ingredient.quantityUnit,
      quantity_value: ingredient.quantityValue,
    })),
    recipe_base_servings: payload.baseServings,
    recipe_name: payload.name,
    // Sin id la función crea una receta nueva.
    target_recipe_id: payload.recipeId,
  });
  if (error) throw error;

  return { recipeId: savedRecipeId };
};
