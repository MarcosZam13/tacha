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
  PASSWORD_STRENGTH: "Seguridad",
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

// Orden visual del formulario; el tipo decide el teclado y si se oculta el texto.
export const REGISTRO_FORM_FIELDS = [
  { field: REGISTRO_FIELD.NAME, label: REGISTRO_LABEL.NAME, type: "text" },
  { field: REGISTRO_FIELD.EMAIL, label: REGISTRO_LABEL.EMAIL, type: "email" },
  { field: REGISTRO_FIELD.PASSWORD, label: REGISTRO_LABEL.PASSWORD, type: "password" },
  {
    field: REGISTRO_FIELD.CONFIRM_PASSWORD,
    label: REGISTRO_LABEL.CONFIRM_PASSWORD,
    type: "password",
  },
] as const;

export const PASSWORD_RULE = {
  DIGIT: "digit",
  LOWERCASE: "lowercase",
  MIN_LENGTH: "minLength",
  SPECIAL: "special",
  UPPERCASE: "uppercase",
} as const;

export type PasswordRuleType = (typeof PASSWORD_RULE)[keyof typeof PASSWORD_RULE];

// Orden en que se muestran los requisitos que faltan.
export const PASSWORD_RULES = [
  PASSWORD_RULE.MIN_LENGTH,
  PASSWORD_RULE.LOWERCASE,
  PASSWORD_RULE.UPPERCASE,
  PASSWORD_RULE.DIGIT,
  PASSWORD_RULE.SPECIAL,
] as const;

// Con la bandera `u`, \p{Ll} y \p{Lu} reconocen también ñ, á, é, etc.
export const PASSWORD_PATTERN = {
  DIGIT: /\d/,
  LOWERCASE: /\p{Ll}/u,
  SPECIAL: /[^\p{L}\p{N}]/u,
  UPPERCASE: /\p{Lu}/u,
} as const;

export const PASSWORD_REQUIREMENT_MESSAGE: Record<PasswordRuleType, string> = {
  [PASSWORD_RULE.DIGIT]: "Debe incluir al menos un número.",
  [PASSWORD_RULE.LOWERCASE]: "Debe incluir al menos una minúscula.",
  [PASSWORD_RULE.MIN_LENGTH]: `Debe tener al menos ${REGISTRO_PASSWORD_MIN_LENGTH} caracteres.`,
  [PASSWORD_RULE.SPECIAL]: "Debe incluir al menos un carácter especial.",
  [PASSWORD_RULE.UPPERCASE]: "Debe incluir al menos una mayúscula.",
};

export const PASSWORD_STRENGTH_LEVEL = {
  MEDIUM: "medium",
  STRONG: "strong",
  WEAK: "weak",
} as const;

export type PasswordStrengthLevelType =
  (typeof PASSWORD_STRENGTH_LEVEL)[keyof typeof PASSWORD_STRENGTH_LEVEL];

// Cantidad mínima de reglas cumplidas para alcanzar cada nivel; por debajo de MEDIUM_MIN es débil.
export const PASSWORD_STRENGTH_THRESHOLD = {
  MEDIUM_MIN: 3,
  STRONG_MIN: 5,
} as const;

export const PASSWORD_STRENGTH_LABEL: Record<PasswordStrengthLevelType, string> = {
  [PASSWORD_STRENGTH_LEVEL.MEDIUM]: "Media",
  [PASSWORD_STRENGTH_LEVEL.STRONG]: "Fuerte",
  [PASSWORD_STRENGTH_LEVEL.WEAK]: "Débil",
};