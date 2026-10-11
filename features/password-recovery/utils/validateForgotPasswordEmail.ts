import { EMAIL_PATTERN } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";
import { normalizeEmail } from "@/utils/email.utils";
import { FORGOT_PASSWORD_ERROR_MESSAGE } from "../constants/password-recovery.constants";

/**
 * Mensaje de error del correo, o nada si es válido. Se valida el correo ya normalizado (sin espacios
 * ni mayúsculas), que es el que se envía. Solo mira el formato: nunca si el correo tiene cuenta.
 */
export const validateForgotPasswordEmail = (email: string): NullableUndefined<string> => {
  const normalizedEmail = normalizeEmail(email);

  return normalizedEmail.length === 0
    ? FORGOT_PASSWORD_ERROR_MESSAGE.EMAIL_REQUIRED
    : !EMAIL_PATTERN.test(normalizedEmail)
      ? FORGOT_PASSWORD_ERROR_MESSAGE.EMAIL_INVALID
      : undefined;
};
