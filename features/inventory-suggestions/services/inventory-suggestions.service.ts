import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import { INVENTORY_SUGGESTIONS_DB } from "../constants/inventory-suggestions.constants";
import type { InventorySuggestion } from "../models/InventorySuggestion.interface";
import { toInventorySuggestions } from "../utils/toInventorySuggestions";

/**
 * Lo que probablemente ya se acabó en la lista general (la de la familia o la
 * personal). La base hace todo el cálculo (SPEC §5); acá solo se adapta.
 */
export const getInventorySuggestions = async (): Promise<InventorySuggestion[]> => {
  await ensureSession();

  const { data: suggestionRows, error } = await getSupabaseClient().rpc(
    INVENTORY_SUGGESTIONS_DB.RPC.GET_INVENTORY_SUGGESTIONS,
  );
  if (error) throw error;

  return toInventorySuggestions(suggestionRows);
};
