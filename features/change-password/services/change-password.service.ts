import type { AuthError } from "@supabase/supabase-js";
import { PASSWORD_UPDATE_RESULT } from "@/constants";
import { updateUserPassword } from "@/services/password.service";
import { getSupabaseClient } from "@/services/supabase.client";
import {
  CHANGE_PASSWORD_RESULT,
  SUPABASE_SIGN_IN_ERROR,
} from "../constants/change-password.constants";
import type { ChangePasswordResultType } from "../constants/change-password.constants";
import type { ChangePasswordParams } from "../models/ChangePasswordParams.interface";

const isRateLimited = (error: Pick<AuthError, "code" | "status">): boolean =>
  error.status === SUPABASE_SIGN_IN_ERROR.RATE_LIMIT_STATUS ||
  error.code === SUPABASE_SIGN_IN_ERROR.RATE_LIMIT_CODE;

const toVerificationFailure = (error: Pick<AuthError, "code" | "status">): ChangePasswordResultType => {
  if (error.code === SUPABASE_SIGN_IN_ERROR.INVALID_CREDENTIALS_CODE) {
    return CHANGE_PASSWORD_RESULT.WRONG_CURRENT_PASSWORD;
  }

  return isRateLimited(error) ? CHANGE_PASSWORD_RESULT.TOO_MANY_ATTEMPTS : CHANGE_PASSWORD_RESULT.ERROR;
};

/**
 * Cambia la contraseña de la sesión. Devuelve un resultado, no lanza: el que llama decide qué mostrar.
 *
 * Primero verifica la contraseña actual con un inicio de sesión de la misma cuenta, que Supabase revisa en el
 * servidor; solo si es correcta cambia la nueva. Así un navegador con la sesión abierta no basta para
 * quedarse con la cuenta, y no depende de una opción del dashboard (`current_password` de `updateUser` solo
 * se exige si esa opción está activa). El inicio de sesión reemplaza la sesión de este navegador por otra
 * de la misma cuenta: la persona sigue dentro, sin cerrar sesión.
 *
 * Una cuenta anónima no tiene correo, así que no puede verificar nada: devuelve `error`.
 */
export const changePassword = async ({
  currentPassword,
  newPassword,
}: ChangePasswordParams): Promise<ChangePasswordResultType> => {
  try {
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (userError || !email) return CHANGE_PASSWORD_RESULT.ERROR;

    const { error: verificationError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (verificationError) return toVerificationFailure(verificationError);

    return await updateUserPassword(newPassword);
  } catch {
    return PASSWORD_UPDATE_RESULT.ERROR;
  }
};
