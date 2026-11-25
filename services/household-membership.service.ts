import { HOUSEHOLD_MEMBERSHIP_RPC } from "@/constants";
import { ensureSession, getSupabaseClient } from "@/services/supabase.client";

/**
 * Si quien usa la app pertenece a una familia. Una sesión anónima nunca: lo decide
 * la base (060). Promovida desde recetas: el planificador también la usa.
 */
export const isHouseholdMember = async (): Promise<boolean> => {
  await ensureSession();

  const { data: householdId, error } = await getSupabaseClient().rpc(HOUSEHOLD_MEMBERSHIP_RPC.CURRENT_HOUSEHOLD_ID);
  if (error) throw error;

  return Boolean(householdId);
};
