import type { NullableRef } from "@/types/nullable.types";
import { HOUSEHOLD_INVITE_TOKEN_PATTERN } from "../constants/household.constants";

/**
 * Saca el token de lo que pegó el usuario: el enlace completo
 * (`<origen>/invitacion/<token>`, con o sin protocolo, barra final, query o
 * fragmento) o solo el código. Devuelve el token en minúsculas, o null si no
 * hay uno con formato de UUID.
 *
 * Solo mejora la experiencia (avisa antes de navegar): no es una validación de
 * seguridad. La base vuelve a comprobar el token al aceptar la invitación.
 */
export const extractInviteToken = (pastedText: string): NullableRef<string> => {
  const trimmedText = pastedText.trim();

  if (HOUSEHOLD_INVITE_TOKEN_PATTERN.CODE.test(trimmedText)) return trimmedText.toLowerCase();

  const linkMatch = HOUSEHOLD_INVITE_TOKEN_PATTERN.LINK.exec(trimmedText);
  return linkMatch?.[1]?.toLowerCase() ?? null;
};
