import type { NullableUndefined } from "@/types/nullable.types";
import { PASSWORD_MIN_LENGTH } from "./password.constants";

// Formulario de nueva contraseña (nueva + repetir): lo usan el cambio tras un login con contraseña débil
// y la vista de actualización de la recuperación de contraseña.

export const NEW_PASSWORD_FIELD = {
  CONFIRM_PASSWORD: "confirmPassword",
  NEW_PASSWORD: "newPassword",
} as const;

export type NewPasswordFieldType = (typeof NEW_PASSWORD_FIELD)[keyof typeof NEW_PASSWORD_FIELD];

export const NEW_PASSWORD_LABEL = {
  CONFIRM_PASSWORD: "Repetir nueva contraseña",
  NEW_PASSWORD: "Nueva contraseña",
  SAVE: "Guardar contraseña",
  SAVING: "Guardando...",
} as const;

// PASSWORD_REQUIRED, PASSWORD_TOO_SHORT, PASSWORD_TOO_WEAK y CONFIRM_REQUIRED no se muestran: el medidor
// lista los requisitos y el botón de guardar queda deshabilitado. La validación pura los usa para decir qué falla.
export const NEW_PASSWORD_ERROR_MESSAGE = {
  CONFIRM_REQUIRED: "Repetí la nueva contraseña.",
  PASSWORDS_MISMATCH: "Las contraseñas no coinciden.",
  PASSWORD_REQUIRED: "La nueva contraseña es obligatoria.",
  PASSWORD_TOO_SHORT: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  PASSWORD_TOO_WEAK: "Elegí una contraseña más segura.",
  REJECTED: "La contraseña no cumple los requisitos de seguridad.",
  SAME_PASSWORD: "La nueva contraseña debe ser distinta de la actual.",
  UNEXPECTED: "No pudimos actualizar tu contraseña. Intentá de nuevo en unos minutos.",
} as const;

// Lo que devuelve el servicio de cambio de contraseña.
export const PASSWORD_UPDATE_RESULT = {
  ERROR: "error",
  REJECTED: "rejected",
  SAME_PASSWORD: "same-password",
  SUCCESS: "success",
} as const;

export type PasswordUpdateResultType =
  (typeof PASSWORD_UPDATE_RESULT)[keyof typeof PASSWORD_UPDATE_RESULT];

export const PASSWORD_UPDATE_RESULT_MESSAGE: Record<
  PasswordUpdateResultType,
  NullableUndefined<string>
> = {
  [PASSWORD_UPDATE_RESULT.ERROR]: NEW_PASSWORD_ERROR_MESSAGE.UNEXPECTED,
  [PASSWORD_UPDATE_RESULT.REJECTED]: NEW_PASSWORD_ERROR_MESSAGE.REJECTED,
  [PASSWORD_UPDATE_RESULT.SAME_PASSWORD]: NEW_PASSWORD_ERROR_MESSAGE.SAME_PASSWORD,
  [PASSWORD_UPDATE_RESULT.SUCCESS]: undefined,
};

// Códigos de error de Supabase Auth al actualizar la contraseña.
export const SUPABASE_PASSWORD_ERROR_CODE = {
  SAME_PASSWORD: "same_password",
  WEAK_PASSWORD: "weak_password",
} as const;

export const PASSWORD_ERROR_CODE_RESULT: Partial<Record<string, PasswordUpdateResultType>> = {
  [SUPABASE_PASSWORD_ERROR_CODE.SAME_PASSWORD]: PASSWORD_UPDATE_RESULT.SAME_PASSWORD,
  [SUPABASE_PASSWORD_ERROR_CODE.WEAK_PASSWORD]: PASSWORD_UPDATE_RESULT.REJECTED,
};
