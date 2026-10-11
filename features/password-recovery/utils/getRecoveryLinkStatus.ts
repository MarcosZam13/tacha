import {
  RECOVERY_LINK_STATUS,
  RECOVERY_LINK_TYPE,
  RECOVERY_URL_PARAM,
} from "../constants/password-recovery.constants";
import type { RecoveryLinkStatusType } from "../constants/password-recovery.constants";

/**
 * Qué trae el fragmento (#) de la URL al abrir la vista de actualización de contraseña:
 * - `error`: Supabase rechazó el enlace (vencido o ya usado) y lo dice con `error`, `error_code`...
 * - `recovery`: un enlace de recuperación (`access_token` con `type=recovery`); todavía falta que
 *   Supabase lo confirme, esto solo dice que parece uno.
 * - `none`: nada de lo anterior (se abrió a mano, o ya se usó y Supabase borró el fragmento).
 *
 * El error manda sobre el token. Un enlace de otro tipo (registro, magic link) con token no es de
 * recuperación: no puede habilitar el cambio de contraseña, así que es `none`.
 */
export const getRecoveryLinkStatus = (fragment: string): RecoveryLinkStatusType => {
  const params = new URLSearchParams(fragment.replace(/^#/, ""));

  const hasError =
    params.has(RECOVERY_URL_PARAM.ERROR) ||
    params.has(RECOVERY_URL_PARAM.ERROR_CODE) ||
    params.has(RECOVERY_URL_PARAM.ERROR_DESCRIPTION);
  const isRecoveryToken =
    Boolean(params.get(RECOVERY_URL_PARAM.ACCESS_TOKEN)) &&
    params.get(RECOVERY_URL_PARAM.TYPE) === RECOVERY_LINK_TYPE;

  return hasError
    ? RECOVERY_LINK_STATUS.ERROR
    : isRecoveryToken
      ? RECOVERY_LINK_STATUS.RECOVERY
      : RECOVERY_LINK_STATUS.NONE;
};
