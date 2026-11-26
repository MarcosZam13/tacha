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

/**
 * La ✕ (SCRUM-104): pospone el producto de esa presentación 7 días en la lista
 * general, para toda la familia. No borra nada del historial (SPEC §16).
 */
export const dismissInventorySuggestion = async (variantId: string): Promise<void> => {
  await ensureSession();

  const { error } = await getSupabaseClient().rpc(INVENTORY_SUGGESTIONS_DB.RPC.DISMISS_INVENTORY_SUGGESTION, {
    target_variant_id: variantId,
  });
  if (error) throw error;
};
