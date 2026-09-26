import type { NullableUndefined } from "@/types/nullable.types";

export const REGISTER_RESULT = {
  EMAIL_EXISTS: "email-exists",
  ERROR: "error",
  SUCCESS: "success",
} as const;

export type RegisterResultType = (typeof REGISTER_RESULT)[keyof typeof REGISTER_RESULT];

// Código de error que devuelve Supabase Auth cuando el correo ya está registrado.
export const SUPABASE_AUTH_ERROR_CODE = {
  USER_ALREADY_EXISTS: "user_already_exists",
} as const;

export const REGISTRO_FIELD = {
  CONFIRM_PASSWORD: "confirmPassword",
  EMAIL: "email",
  NAME: "name",
  PASSWORD: "password",
} as const;

export type RegistroFieldType = (typeof REGISTRO_FIELD)[keyof typeof REGISTRO_FIELD];

export const REGISTRO_LABEL = {
  CONFIRM_PASSWORD: "Repetir contraseña",
  EMAIL: "Correo electrónico",
  NAME: "Nombre",
  PASSWORD: "Contraseña",
  SUBMIT: "Registrarme",
  SUBMITTING: "Creando cuenta...",
  SUCCESS: "¡Cuenta creada!",
  TITLE: "Crear cuenta",
} as const;

export const REGISTRO_ERROR_MESSAGE = {
  EMAIL_ALREADY_EXISTS: "Ya existe una cuenta con este correo.",
  EMAIL_INVALID: "Ingresá un correo válido.",
  EMAIL_REQUIRED: "El correo es obligatorio.",
  NAME_REQUIRED: "El nombre es obligatorio.",
  PASSWORD_REQUIRED: "La contraseña es obligatoria.",
  PASSWORD_TOO_SHORT: "La contraseña debe tener al menos 8 caracteres.",
  REPEAT_PASSWORD_REQUIRED: "Repetí tu contraseña.",
  UNEXPECTED: "No pudimos crear tu cuenta. Intentá de nuevo en unos minutos.",
} as const;

export const REGISTRO_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const REGISTRO_PASSWORD_MIN_LENGTH = 8;

export const REGISTRO_SUBMIT_STATUS = {
  ERROR: "error",
  IDLE: "idle",
  SUBMITTING: "submitting",
  SUCCESS: "success",
} as const;

export type RegistroSubmitStatusType =
  (typeof REGISTRO_SUBMIT_STATUS)[keyof typeof REGISTRO_SUBMIT_STATUS];

  export const REGISTRO_RESULT_MESSAGE: Record<RegisterResultType, NullableUndefined<string>> = {
  [REGISTER_RESULT.EMAIL_EXISTS]: REGISTRO_ERROR_MESSAGE.EMAIL_ALREADY_EXISTS,
  [REGISTER_RESULT.ERROR]: REGISTRO_ERROR_MESSAGE.UNEXPECTED,
  [REGISTER_RESULT.SUCCESS]: undefined,
};

