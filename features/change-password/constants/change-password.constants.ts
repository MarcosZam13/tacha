import { PASSWORD_UPDATE_RESULT, PASSWORD_UPDATE_RESULT_MESSAGE } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";

export const CHANGE_PASSWORD_TEXT = {
  BACK_TO_PROFILE: "Volver al perfil",
  CURRENT_PASSWORD_LABEL: "Contraseña actual",
  SUCCESS: "Contraseña actualizada.",
  TITLE: "Cambiar contraseña",
} as const;

export const CHANGE_PASSWORD_FIELD = {
  CURRENT_PASSWORD: "currentPassword",
} as const;

export type ChangePasswordCurrentFieldType =
  (typeof CHANGE_PASSWORD_FIELD)[keyof typeof CHANGE_PASSWORD_FIELD];

export const CHANGE_PASSWORD_ERROR_MESSAGE = {
  CURRENT_PASSWORD_REQUIRED: "Ingresá tu contraseña actual.",
  TOO_MANY_ATTEMPTS: "Hiciste demasiados intentos. Esperá unos minutos y probá de nuevo.",
  WRONG_CURRENT_PASSWORD: "La contraseña actual no es correcta.",
} as const;

export const CHANGE_PASSWORD_STATUS = {
  IDLE: "idle",
  SAVED: "saved",
  SAVING: "saving",
} as const;

export type ChangePasswordStatusType =
  (typeof CHANGE_PASSWORD_STATUS)[keyof typeof CHANGE_PASSWORD_STATUS];

// Lo que devuelve el servicio: los resultados de actualizar la contraseña más los dos que solo existen
// al verificar la actual.
export const CHANGE_PASSWORD_RESULT = {
  ...PASSWORD_UPDATE_RESULT,
  TOO_MANY_ATTEMPTS: "too-many-attempts",
  WRONG_CURRENT_PASSWORD: "wrong-current-password",
} as const;

export type ChangePasswordResultType =
  (typeof CHANGE_PASSWORD_RESULT)[keyof typeof CHANGE_PASSWORD_RESULT];

// Qué se muestra por resultado. `wrong-current-password` va bajo su campo; el resto, como mensaje general.
export const CHANGE_PASSWORD_RESULT_MESSAGE: Record<
  ChangePasswordResultType,
  NullableUndefined<string>
> = {
  ...PASSWORD_UPDATE_RESULT_MESSAGE,
  [CHANGE_PASSWORD_RESULT.TOO_MANY_ATTEMPTS]: CHANGE_PASSWORD_ERROR_MESSAGE.TOO_MANY_ATTEMPTS,
  [CHANGE_PASSWORD_RESULT.WRONG_CURRENT_PASSWORD]:
    CHANGE_PASSWORD_ERROR_MESSAGE.WRONG_CURRENT_PASSWORD,
};

// Códigos y estado de Supabase Auth al verificar la contraseña actual.
export const SUPABASE_SIGN_IN_ERROR = {
  INVALID_CREDENTIALS_CODE: "invalid_credentials",
  RATE_LIMIT_CODE: "over_request_rate_limit",
  RATE_LIMIT_STATUS: 429,
} as const;
