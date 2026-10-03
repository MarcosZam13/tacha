import type { NullableUndefined } from "@/types/nullable.types";

export const LOGIN_FIELD = {
  EMAIL: "email",
  PASSWORD: "password",
} as const;

export type LoginFieldType = (typeof LOGIN_FIELD)[keyof typeof LOGIN_FIELD];

export const LOGIN_LABEL = {
  EMAIL: "Correo electrónico",
  NO_ACCOUNT: "¿No tenés cuenta?",
  PASSWORD: "Contraseña",
  REGISTER_LINK: "Registrate",
  SUBMIT: "Iniciar sesión",
  SUBMITTING: "Ingresando...",
  TITLE: "Iniciar sesión",
} as const;

export const LOGIN_ERROR_MESSAGE = {
  CAPTCHA_FAILED: "No pudimos validar el reCAPTCHA. Intentá de nuevo.",
  CAPTCHA_REQUIRED: "Confirmá que no sos un robot.",
  EMAIL_INVALID: "Ingresá un correo válido.",
  EMAIL_NOT_CONFIRMED: "Confirmá tu correo antes de iniciar sesión.",
  EMAIL_REQUIRED: "El correo es obligatorio.",
  INVALID_CREDENTIALS: "Correo o contraseña incorrectos.",
  PASSWORD_REQUIRED: "La contraseña es obligatoria.",
  RATE_LIMITED: "Demasiados intentos. Esperá un momento e intentá de nuevo.",
  RECAPTCHA_LOAD_FAILED: "No pudimos cargar el reCAPTCHA. Recargá la página.",
  UNEXPECTED: "No pudimos iniciar sesión. Intentá de nuevo en unos minutos.",
} as const;

export const LOGIN_SUBMIT_STATUS = {
  ERROR: "error",
  IDLE: "idle",
  SUBMITTING: "submitting",
  SUCCESS: "success",
} as const;

export type LoginSubmitStatusType =
  (typeof LOGIN_SUBMIT_STATUS)[keyof typeof LOGIN_SUBMIT_STATUS];

// Lo que devuelve el servicio; el ViewModel lo traduce a mensaje con el mapa de abajo.
export const LOGIN_RESULT = {
  CAPTCHA_FAILED: "captcha-failed",
  EMAIL_NOT_CONFIRMED: "email-not-confirmed",
  ERROR: "error",
  INVALID_CREDENTIALS: "invalid-credentials",
  RATE_LIMITED: "rate-limited",
  SUCCESS: "success",
} as const;

export type LoginResultType = (typeof LOGIN_RESULT)[keyof typeof LOGIN_RESULT];

export const LOGIN_RESULT_MESSAGE: Record<LoginResultType, NullableUndefined<string>> = {
  [LOGIN_RESULT.CAPTCHA_FAILED]: LOGIN_ERROR_MESSAGE.CAPTCHA_FAILED,
  [LOGIN_RESULT.EMAIL_NOT_CONFIRMED]: LOGIN_ERROR_MESSAGE.EMAIL_NOT_CONFIRMED,
  [LOGIN_RESULT.ERROR]: LOGIN_ERROR_MESSAGE.UNEXPECTED,
  [LOGIN_RESULT.INVALID_CREDENTIALS]: LOGIN_ERROR_MESSAGE.INVALID_CREDENTIALS,
  [LOGIN_RESULT.RATE_LIMITED]: LOGIN_ERROR_MESSAGE.RATE_LIMITED,
  [LOGIN_RESULT.SUCCESS]: undefined,
};

// Orden visual del formulario; el tipo decide el teclado y si se oculta el texto.
export const LOGIN_FORM_FIELDS = [
  { field: LOGIN_FIELD.EMAIL, label: LOGIN_LABEL.EMAIL, type: "email" },
  { field: LOGIN_FIELD.PASSWORD, label: LOGIN_LABEL.PASSWORD, type: "password" },
] as const;

export const LOGIN_ROUTE = {
  HOME: "/",
  REGISTER: "/registro",
} as const;

export const LOGIN_FUNCTION = {
  NAME: "login-with-recaptcha",
} as const;

// Códigos que devuelve la Edge Function en el campo `code` de sus errores.
export const LOGIN_API_CODE = {
  CAPTCHA_FAILED: "captcha_failed",
  EMAIL_NOT_CONFIRMED: "email_not_confirmed",
  INVALID_CREDENTIALS: "invalid_credentials",
  RATE_LIMITED: "rate_limited",
} as const;

export const LOGIN_API_CODE_RESULT: Partial<Record<string, LoginResultType>> = {
  [LOGIN_API_CODE.CAPTCHA_FAILED]: LOGIN_RESULT.CAPTCHA_FAILED,
  [LOGIN_API_CODE.EMAIL_NOT_CONFIRMED]: LOGIN_RESULT.EMAIL_NOT_CONFIRMED,
  [LOGIN_API_CODE.INVALID_CREDENTIALS]: LOGIN_RESULT.INVALID_CREDENTIALS,
  [LOGIN_API_CODE.RATE_LIMITED]: LOGIN_RESULT.RATE_LIMITED,
};

// Es pública por diseño (va al navegador). Next solo la inyecta si se lee escrita así, completa.
export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

export const RECAPTCHA = {
  SCRIPT_ID: "google-recaptcha-script",
  SCRIPT_URL: "https://www.google.com/recaptcha/api.js?render=explicit",
} as const;
