import type { AuthChangeEvent } from "@supabase/supabase-js";
import {
  RECOVERY_AUTH_EVENT,
  RECOVERY_LINK_STATUS,
  RESET_PASSWORD_STATUS,
} from "../constants/password-recovery.constants";
import type {
  RecoveryLinkStatusType,
  ResetPasswordStatusType,
} from "../constants/password-recovery.constants";

/**
 * Qué estado sigue a un evento de sesión de Supabase mientras se verifica el enlace.
 *
 * - `initialLink`: lo que traía la URL al abrir la vista (antes de que Supabase la procesara).
 * - `currentLink`: lo que trae la URL ahora. Supabase borra el fragmento solo cuando acepta el enlace.
 *
 * Reglas:
 * - Si la URL no traía un enlace de recuperación (se abrió a mano, o trae el error de un enlace vencido
 *   o usado), no es válido, aunque haya una sesión iniciada: esa no prueba que hubiera un enlace.
 * - Solo `PASSWORD_RECOVERY` da el enlace por válido: Supabase lo emite únicamente cuando aceptó el enlace.
 *   Un fragmento que ya no está en la URL no basta: quien tenga una sesión vieja podría borrarlo a mano.
 * - `INITIAL_SESSION` llega primero y con la sesión que hubiera (también una vieja). Si el fragmento sigue
 *   en la URL, Supabase lo rechazó (token vencido o falso): no es válido. Si ya se borró, falta esperar a
 *   `PASSWORD_RECOVERY` (quien llama pone un tope de espera).
 * - Cualquier otro evento no cambia nada.
 */
export const resolveLinkVerification = (
  initialLink: RecoveryLinkStatusType,
  event: AuthChangeEvent,
  currentLink: RecoveryLinkStatusType,
): ResetPasswordStatusType =>
  initialLink !== RECOVERY_LINK_STATUS.RECOVERY
    ? RESET_PASSWORD_STATUS.INVALID
    : event === RECOVERY_AUTH_EVENT.PASSWORD_RECOVERY
      ? RESET_PASSWORD_STATUS.READY
      : event === RECOVERY_AUTH_EVENT.INITIAL_SESSION && currentLink !== RECOVERY_LINK_STATUS.NONE
        ? RESET_PASSWORD_STATUS.INVALID
        : RESET_PASSWORD_STATUS.VERIFYING;
