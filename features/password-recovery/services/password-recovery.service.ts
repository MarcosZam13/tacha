import type { AuthError } from "@supabase/supabase-js";
import { AUTH_ROUTE } from "@/constants";
import { getSupabaseClient } from "@/services/supabase.client";
import {
  RECOVERY_RATE_LIMIT,
  RECOVERY_REQUEST_RESULT,
  RECOVERY_SERVER_ERROR_MIN_STATUS,
} from "../constants/password-recovery.constants";
import type { RecoveryRequestResultType } from "../constants/password-recovery.constants";

// Errores que pueden depender de que la cuenta exista y que por eso no se muestran: el límite de envíos
// (por cuenta y global, con el mismo código y estado) y los fallos del servidor al mandar el correo, que
// Supabase solo intenta con cuentas reales. Un fallo de red (status 0) y un 4xx que depende de la dirección
// (formato rechazado) no dependen de la cuenta y sí se muestran.
const isAccountDependentFailure = (error: Pick<AuthError, "code" | "status">): boolean =>
  error.status === RECOVERY_RATE_LIMIT.HTTP_STATUS ||
  error.code === RECOVERY_RATE_LIMIT.ERROR_CODE ||
  (error.status ?? 0) >= RECOVERY_SERVER_ERROR_MIN_STATUS;

/**
 * Pide a Supabase el correo con el enlace para restablecer la contraseña.
 * Devuelve un resultado, no lanza: el que llama decide qué mostrar.
 *
 * Seguridad: "sin cuenta" no es un error (Supabase responde igual), y el límite de envíos y los errores
 * del servidor también cuentan como enviado. Con un resultado propio para ellos, pedir dos veces seguidas
 * el mismo correo (o probar una dirección que el SMTP rechaza) revelaría si tiene cuenta.
 * Solo los fallos que no dependen de la cuenta (red, faltan las variables, formato rechazado) son error.
 * Costo: con Supabase o el SMTP caídos la persona ve "enviado" y espera un correo que no llega.
 *
 * `redirectTo` se arma con el origen de la propia página y no con un valor de la URL (sin redirección
 * abierta), y tiene que estar en la lista de Redirect URLs del proyecto de Supabase.
 */
export const requestPasswordReset = async (email: string): Promise<RecoveryRequestResultType> => {
  try {
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${AUTH_ROUTE.RESET_PASSWORD}`,
    });

    return !error || isAccountDependentFailure(error)
      ? RECOVERY_REQUEST_RESULT.SENT
      : RECOVERY_REQUEST_RESULT.ERROR;
  } catch {
    return RECOVERY_REQUEST_RESULT.ERROR;
  }
};
