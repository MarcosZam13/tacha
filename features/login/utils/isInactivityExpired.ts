import { INACTIVITY } from "../constants/login.constants";

/**
 * ¿Pasó el límite sin actividad? Compara marcas de tiempo (en ms) en vez de confiar en un
 * temporizador: uno en una pestaña oculta se retrasa, y la marca la comparten todas las pestañas.
 * Justo en el límite ya cuenta como vencido. Una marca futura (reloj corrido) nunca vence.
 */
export const isInactivityExpired = (
  now: number,
  lastActivity: number,
  limitMinutes: number,
): boolean => now - lastActivity >= limitMinutes * INACTIVITY.MS_PER_MINUTE;
