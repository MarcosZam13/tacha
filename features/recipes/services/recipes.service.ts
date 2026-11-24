import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import { POSTGRES_ERROR_CODE } from "@/constants";
import { RECIPES_DB } from "../constants/recipes.constants";
import type { RecipeSummary } from "../models/recipe-catalog.interfaces";
import type { DeleteRecipePayload, DeleteRecipeResponse } from "../models/recipe-deletion.interfaces";
import type { RecipeForEditing, SaveRecipePayload, SaveRecipeResponse } from "../models/recipe-editor.interfaces";
import type {
  AddRecipeToListPayload,
  AddRecipeToListResponse,
  AddRecipeToListRow,
} from "../models/recipe-list-addition.interfaces";
import { toAddRecipeToListResponse } from "../utils/toAddRecipeToListResponse";
import { toRecipeEditorValues } from "../utils/toRecipeEditorValues";
import { toRecipeSummary } from "../utils/toRecipeSummary";
import { getRecipePhotoUrls, removeRecipePhotoFile } from "./recipe-photos.service";

/**
 * Trae las recetas que el usuario puede ver, más nuevas primero, con sus
 * ingredientes (el adapter los ordena por `position`).
 *
 * No filtra por dueño a propósito: eso lo decide RLS en la base. Hoy la
 * política devuelve solo las recetas propias; cuando exista households se
 * suma la de miembros y esta consulta devuelve también las compartidas sin
 * cambiar nada acá.
 *
 * Las fotos están en un bucket privado: se piden sus enlaces en una sola
 * petición, y si falla el catálogo se muestra igual.
 */
export const getRecipeSummaries = async (): Promise<RecipeSummary[]> => {
  // Sin sesión la petición iría como anon, que no tiene permisos sobre recipes.
  await ensureSession();

  const { data: recipeRows, error } = await getSupabaseClient()
    .from(RECIPES_DB.TABLE.RECIPES)
    .select(RECIPES_DB.CATALOG_SELECT)
    .order(RECIPES_DB.COLUMN.CREATED_AT, { ascending: false });
  if (error) throw error;

  const urlByPath = await getRecipePhotoUrls(
    recipeRows.flatMap((recipeRow) => (recipeRow.photo_path ? [recipeRow.photo_path] : [])),
  );

  return recipeRows.map((recipeRow) =>
    toRecipeSummary(recipeRow, recipeRow.photo_path ? (urlByPath.get(recipeRow.photo_path) ?? null) : null),
  );
};

/**
 * Trae una receta para editarla, ya convertida a valores del formulario, con su foto.
 * Devuelve null si no se encontró: no existe, es de otro usuario (RLS no la
 * devuelve) o el id de la URL no es un uuid. Las tres dan el mismo resultado
 * para no revelar si una receta ajena existe.
 */
export const getRecipeForEditing = async (recipeId: string): Promise<NullableRef<RecipeForEditing>> => {
  await ensureSession();

  const { data: recipeRow, error } = await getSupabaseClient()
    .from(RECIPES_DB.TABLE.RECIPES)
    .select(RECIPES_DB.EDITOR_SELECT)
    .eq(RECIPES_DB.COLUMN.ID, recipeId)
    .maybeSingle();
  if (error?.code === POSTGRES_ERROR_CODE.INVALID_TEXT_REPRESENTATION) return null;
  if (error) throw error;

  if (!recipeRow) return null;

  const { photo_path: photoPath } = recipeRow;
  const urlByPath = await getRecipePhotoUrls(photoPath ? [photoPath] : []);

  return {
    photo: photoPath ? { url: urlByPath.get(photoPath) ?? null } : null,
    values: toRecipeEditorValues(recipeRow),
  };
};

/**
 * Crea o edita una receta con todos sus ingredientes en una sola llamada a
 * save_recipe, que lo hace en una transacción: o se guarda todo o nada.
 * Devuelve null si la receta a editar ya no existe (por ejemplo, se borró en
 * otra pestaña) o es ajena: save_recipe responde P0002 en los dos casos.
 */
export const saveRecipe = async (payload: SaveRecipePayload): Promise<NullableRef<SaveRecipeResponse>> => {
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
  if (error?.code === POSTGRES_ERROR_CODE.NO_DATA_FOUND) return null;
  if (error) throw error;

  return { recipeId: savedRecipeId };
};

/**
 * Borra una receta; sus ingredientes se borran en cascada en la base. Un
 * solo delete, así que ya es todo o nada (no hace falta una RPC).
 *
 * Si la receta ya no existe o es ajena, RLS no la ve: se borran 0 filas y no
 * hay error. Se responde igual que un borrado correcto, a propósito: para
 * quien la pidió la receta ya no está, y así no se revela si una ajena existe.
 *
 * El delete devuelve la foto de la fila que de verdad se borró; su archivo se
 * borra después y sin esperar (SPEC regla 47).
 */
export const deleteRecipe = async (payload: DeleteRecipePayload): Promise<DeleteRecipeResponse> => {
  await ensureSession();

  const { data: deletedRows, error } = await getSupabaseClient()
    .from(RECIPES_DB.TABLE.RECIPES)
    .delete()
    .eq(RECIPES_DB.COLUMN.ID, payload.recipeId)
    .select(RECIPES_DB.COLUMN.PHOTO_PATH);
  if (error) throw error;

  deletedRows.forEach((deletedRow) => void removeRecipePhotoFile(deletedRow.photo_path));
  return { recipeId: payload.recipeId };
};

/**
 * Agrega los ingredientes de una receta a la lista general con una sola
 * llamada a add_recipe_to_general_list, que hace todo en una transacción: las
 * cantidades, los faltantes y la lista si no existía (reglas 17 a 26 de la SPEC).
 * Devuelve null si la receta no se encontró (se borró en otra pestaña o es
 * ajena): la RPC responde P0002 en los dos casos.
 */
export const addRecipeToList = async (
  payload: AddRecipeToListPayload,
): Promise<NullableRef<AddRecipeToListResponse>> => {
  await ensureSession();

  const { data: addedRecipeRow, error } = await getSupabaseClient().rpc(RECIPES_DB.RPC.ADD_RECIPE_TO_GENERAL_LIST, {
    target_recipe_id: payload.recipeId,
  });
  if (error?.code === POSTGRES_ERROR_CODE.NO_DATA_FOUND) return null;
  if (error) throw error;

  // La RPC devuelve jsonb: la base no le da tipo, lo fija el contrato de la función (013).
  return toAddRecipeToListResponse(addedRecipeRow as unknown as AddRecipeToListRow);
};

/**
 * Cuenta cuántos espacios del plan semanal usan una receta, para avisarlo en el
 * diálogo de eliminar (al borrarla esos espacios quedan vacíos). Solo cuenta:
 * `head` no trae las filas. RLS acota a lo propio, así que no hace falta
 * filtrar por dueño.
 */
export const countRecipeMealPlans = async (recipeId: string): Promise<number> => {
  await ensureSession();

  const { count, error } = await getSupabaseClient()
    .from(RECIPES_DB.TABLE.MEAL_PLANS)
    .select(RECIPES_DB.COLUMN.ID, { count: "exact", head: true })
    .eq(RECIPES_DB.COLUMN.RECIPE_ID, recipeId);
  if (error) throw error;

  return count ?? 0;
};
