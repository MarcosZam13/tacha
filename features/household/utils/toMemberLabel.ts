import type { NullableRef } from "@/types/nullable.types";
import { HOUSEHOLD_LEAVE_TEXT } from "../constants/household.constants";

/**
 * Cómo se nombra a un integrante en pantalla: su nombre sin espacios de más,
 * o "Miembro sin nombre" si no tiene (o es solo espacios). Nunca el correo.
 * La misma regla para la fila de la lista y para el diálogo de eliminar
 * (SCRUM-61), así los dos nombran igual a la persona.
 */
export const toMemberLabel = (displayName: NullableRef<string>): string =>
  displayName?.trim() || HOUSEHOLD_LEAVE_TEXT.UNNAMED_MEMBER;
