import { PASSWORD_ERROR_CODE_RESULT, PASSWORD_UPDATE_RESULT } from "@/constants";
import type { PasswordUpdateResultType } from "@/constants";
import { getSupabaseClient } from "@/services/supabase.client";

// Devuelve un resultado, no lanza: el que llama decide qué mostrar.
// Usa la sesión actual (la que acaba de guardar el login o la de recuperación), por eso no pide la contraseña actual.
export const updateUserPassword = async (
  newPassword: string,
): Promise<PasswordUpdateResultType> => {
  const { error } = await getSupabaseClient().auth.updateUser({ password: newPassword });

  return error
    ? ((error.code && PASSWORD_ERROR_CODE_RESULT[error.code]) || PASSWORD_UPDATE_RESULT.ERROR)
    : PASSWORD_UPDATE_RESULT.SUCCESS;
};
