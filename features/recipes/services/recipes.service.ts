import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import { RECIPES_DB } from "../constants/recipes.constants";
import type { RecipeSummary } from "../models/RecipeSummary.interface";
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
