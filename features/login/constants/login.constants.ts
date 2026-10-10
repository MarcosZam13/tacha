import { PASSWORD_MIN_LENGTH } from "@/constants";
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
  ACCOUNT_BLOCKED: "Tu cuenta está bloqueada. Contactá al equipo de Tacha.",
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
  WEAK_PASSWORD: "weak-password",
} as const;

export type LoginSubmitStatusType =
  (typeof LOGIN_SUBMIT_STATUS)[keyof typeof LOGIN_SUBMIT_STATUS];

// Lo que devuelve el servicio; el ViewModel lo traduce a mensaje con el mapa de abajo.
export const LOGIN_RESULT = {
  ACCOUNT_BLOCKED: "account-blocked",
  CAPTCHA_FAILED: "captcha-failed",
  EMAIL_NOT_CONFIRMED: "email-not-confirmed",
  ERROR: "error",
  INVALID_CREDENTIALS: "invalid-credentials",
  RATE_LIMITED: "rate-limited",
  SUCCESS: "success",
} as const;

export type LoginResultType = (typeof LOGIN_RESULT)[keyof typeof LOGIN_RESULT];

export const LOGIN_RESULT_MESSAGE: Record<LoginResultType, NullableUndefined<string>> = {
  [LOGIN_RESULT.ACCOUNT_BLOCKED]: LOGIN_ERROR_MESSAGE.ACCOUNT_BLOCKED,
  [LOGIN_RESULT.CAPTCHA_FAILED]: LOGIN_ERROR_MESSAGE.CAPTCHA_FAILED,
  [LOGIN_RESULT.EMAIL_NOT_CONFIRMED]: LOGIN_ERROR_MESSAGE.EMAIL_NOT_CONFIRMED,
  [LOGIN_RESULT.ERROR]: LOGIN_ERROR_MESSAGE.UNEXPECTED,
  [LOGIN_RESULT.INVALID_CREDENTIALS]: LOGIN_ERROR_MESSAGE.INVALID_CREDENTIALS,
  [LOGIN_RESULT.RATE_LIMITED]: LOGIN_ERROR_MESSAGE.RATE_LIMITED,
  [LOGIN_RESULT.SUCCESS]: undefined,
};

// Valores del atributo `type` de los inputs del formulario.
export const INPUT_TYPE = {
  EMAIL: "email",
  PASSWORD: "password",
  TEXT: "text",
} as const;

// Texto accesible del botón del ojo; dice la acción que ejecutaría el clic.
export const PASSWORD_TOGGLE_LABEL = {
  HIDE: "Ocultar contraseña",
  SHOW: "Mostrar contraseña",
} as const;

// Orden visual del formulario; el tipo decide el teclado y si se oculta el texto.
export const LOGIN_FORM_FIELDS = [
  { field: LOGIN_FIELD.EMAIL, label: LOGIN_LABEL.EMAIL, type: INPUT_TYPE.EMAIL },
  { field: LOGIN_FIELD.PASSWORD, label: LOGIN_LABEL.PASSWORD, type: INPUT_TYPE.PASSWORD },
] as const;

// A dónde lleva el login exitoso: utils/resolvePostLoginRoute.ts.
export const LOGIN_ROUTE = {
  LOGIN: "/login",
  REGISTER: "/registro",
} as const;

export const LOGIN_FUNCTION = {
  NAME: "login-with-recaptcha",
} as const;

// Códigos que devuelve la Edge Function en el campo `code` de sus errores.
export const LOGIN_API_CODE = {
  ACCOUNT_BLOCKED: "user_banned",
  CAPTCHA_FAILED: "captcha_failed",
  EMAIL_NOT_CONFIRMED: "email_not_confirmed",
  INVALID_CREDENTIALS: "invalid_credentials",
  RATE_LIMITED: "rate_limited",
} as const;

export const LOGIN_API_CODE_RESULT: Partial<Record<string, LoginResultType>> = {
  [LOGIN_API_CODE.ACCOUNT_BLOCKED]: LOGIN_RESULT.ACCOUNT_BLOCKED,
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

// --- Cambio de contraseña tras un login con contraseña débil ---

// Pasos del cambio de contraseña tras un login con contraseña débil.
export const CHANGE_PASSWORD_STEP = {
  DONE: "done",
  FORM: "form",
  NOTICE: "notice",
  SAVING: "saving",
} as const;

export type ChangePasswordStepType =
  (typeof CHANGE_PASSWORD_STEP)[keyof typeof CHANGE_PASSWORD_STEP];

// Valores del atributo `autocomplete` de los campos de contraseña: ayudan a los gestores de contraseñas.
export const AUTOCOMPLETE = {
  CURRENT_PASSWORD: "current-password",
  NEW_PASSWORD: "new-password",
} as const;

export type AutocompleteType = (typeof AUTOCOMPLETE)[keyof typeof AUTOCOMPLETE];

export const CHANGE_PASSWORD_FIELD = {
  CONFIRM_PASSWORD: "confirmPassword",
  NEW_PASSWORD: "newPassword",
} as const;

export type ChangePasswordFieldType =
  (typeof CHANGE_PASSWORD_FIELD)[keyof typeof CHANGE_PASSWORD_FIELD];

export const CHANGE_PASSWORD_LABEL = {
  BACK: "Volver",
  CHANGE: "Cambiar contraseña",
  CONFIRM_PASSWORD: "Repetir nueva contraseña",
  CONTINUE: "Continuar",
  DONE_MESSAGE: "Tu contraseña se actualizó correctamente.",
  DONE_TITLE: "Contraseña actualizada",
  FORM_TITLE: "Nueva contraseña",
  NEW_PASSWORD: "Nueva contraseña",
  NOTICE_MESSAGE:
    "Tu contraseña es fácil de adivinar. Te recomendamos cambiarla por una más segura.",
  NOTICE_TITLE: "Tu contraseña es débil",
  NOT_NOW: "Ahora no",
  SAVE: "Guardar contraseña",
  SAVING: "Guardando...",
} as const;

// PASSWORD_REQUIRED, PASSWORD_TOO_SHORT, PASSWORD_TOO_WEAK y CONFIRM_REQUIRED no se muestran: el medidor
// lista los requisitos y el botón de guardar queda deshabilitado. La validación pura los usa para decir qué falla.
export const CHANGE_PASSWORD_ERROR_MESSAGE = {
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
  [PASSWORD_UPDATE_RESULT.ERROR]: CHANGE_PASSWORD_ERROR_MESSAGE.UNEXPECTED,
  [PASSWORD_UPDATE_RESULT.REJECTED]: CHANGE_PASSWORD_ERROR_MESSAGE.REJECTED,
  [PASSWORD_UPDATE_RESULT.SAME_PASSWORD]: CHANGE_PASSWORD_ERROR_MESSAGE.SAME_PASSWORD,
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

// --- Cierre de sesión por inactividad (SCRUM-50) ---

export const INACTIVITY = {
  DEFAULT_MINUTES: 30,
  // Menos de 1 minuto no tiene sentido y 0 cerraría la sesión al instante.
  MIN_MINUTES: 1,
  // Un día. setTimeout desborda con más de ~24,8 días (2^31 ms) y dispararía al instante en bucle.
  MAX_MINUTES: 1_440,
  MS_PER_MINUTE: 60_000,
  // Como máximo una escritura de la última actividad por este intervalo (scroll dispara decenas por segundo).
  RECORD_THROTTLE_MS: 1_000,
  STORAGE_KEY: "tacha:last-activity",
} as const;

// Next solo reemplaza la variable si se lee escrita completa, así que no se puede abreviar.
// Se guarda cruda: parseInactivityLimit decide si es válida o cae al valor por defecto.
export const INACTIVITY_TIMEOUT_MINUTES_RAW = process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT_MINUTES;

// Eventos que cuentan como actividad. La navegación entre rutas se detecta con usePathname,
// y visibilitychange (volver a la pestaña) tiene su propia comprobación.
export const INACTIVITY_ACTIVITY_EVENTS = ["keydown", "pointerdown", "scroll"] as const;

export const INACTIVITY_VISIBILITY_EVENT = "visibilitychange";

// El motivo no viaja en la URL: con el guard encendido, el guard y el cierre por inactividad
// redirigen a /login a la vez y el último pisaría el parámetro. La bandera vive en sessionStorage
// (por pestaña, sobrevive a una recarga) y el login la consume al mostrar el aviso.
export const INACTIVITY_NOTICE_STORAGE_KEY = "tacha:inactivity-notice";

export const INACTIVITY_NOTICE_FLAG = "1";

export const INACTIVITY_LABEL = {
  NOTICE: "Tu sesión se cerró por inactividad. Iniciá sesión de nuevo.",
} as const;
