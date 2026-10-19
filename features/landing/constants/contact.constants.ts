import { INPUT_TYPE } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";

export const CONTACT_FIELD = {
  EMAIL: "email",
  MESSAGE: "message",
  NAME: "name",
} as const;

export type ContactFieldType = (typeof CONTACT_FIELD)[keyof typeof CONTACT_FIELD];

// Mismos límites que la Edge Function submit-contact-message y que los check de la
// migración 028: si se cambia uno, se cambian los tres.
export const CONTACT_LIMIT = {
  EMAIL_MAX_LENGTH: 254,
  MESSAGE_MAX_LENGTH: 1_000,
  MESSAGE_MIN_LENGTH: 10,
  NAME_MAX_LENGTH: 100,
  NAME_MIN_LENGTH: 2,
} as const;

export const CONTACT_TEXTAREA = {
  ROWS: 5,
} as const;

export const CONTACT_HEADING_ID = "formulario-contacto-titulo";

export const CONTACT_LABEL = {
  DESCRIPTION:
    "¿Tenés una duda, una idea o encontraste un problema? Escribinos y te respondemos al correo.",
  EMAIL: "Correo electrónico",
  MESSAGE: "Mensaje",
  NAME: "Nombre",
  SEND_ANOTHER: "Enviar otro mensaje",
  SUBMIT: "Enviar mensaje",
  SUBMITTING: "Enviando...",
  SUCCESS: "¡Gracias! Recibimos tu mensaje y te vamos a responder al correo que nos dejaste.",
  TITLE: "Contactanos",
} as const;

export const CONTACT_ERROR_MESSAGE = {
  CAPTCHA_FAILED: "No pudimos validar el reCAPTCHA. Marcalo de nuevo e intentá otra vez.",
  CAPTCHA_REQUIRED: "Confirmá que no sos un robot.",
  EMAIL_INVALID: "Ingresá un correo válido.",
  EMAIL_REQUIRED: "El correo es obligatorio.",
  MESSAGE_REQUIRED: "El mensaje es obligatorio.",
  MESSAGE_TOO_LONG: `El mensaje puede tener como máximo ${CONTACT_LIMIT.MESSAGE_MAX_LENGTH} caracteres.`,
  MESSAGE_TOO_SHORT: `El mensaje debe tener al menos ${CONTACT_LIMIT.MESSAGE_MIN_LENGTH} caracteres.`,
  NAME_REQUIRED: "El nombre es obligatorio.",
  NAME_TOO_LONG: `El nombre puede tener como máximo ${CONTACT_LIMIT.NAME_MAX_LENGTH} caracteres.`,
  NAME_TOO_SHORT: `El nombre debe tener al menos ${CONTACT_LIMIT.NAME_MIN_LENGTH} caracteres.`,
  RATE_LIMITED: "Ya recibimos varios mensajes tuyos. Esperá un rato antes de enviar otro.",
  UNEXPECTED: "No pudimos enviar tu mensaje. Intentá de nuevo en unos minutos.",
} as const;

export const CONTACT_SUBMIT_STATUS = {
  ERROR: "error",
  IDLE: "idle",
  SUBMITTING: "submitting",
  SUCCESS: "success",
} as const;

export type ContactSubmitStatusType =
  (typeof CONTACT_SUBMIT_STATUS)[keyof typeof CONTACT_SUBMIT_STATUS];

// Lo que devuelve el servicio; el ViewModel lo traduce a mensaje con el mapa de abajo.
export const CONTACT_RESULT = {
  CAPTCHA_FAILED: "captcha-failed",
  ERROR: "error",
  RATE_LIMITED: "rate-limited",
  SUCCESS: "success",
} as const;

export type ContactResultType = (typeof CONTACT_RESULT)[keyof typeof CONTACT_RESULT];

export const CONTACT_RESULT_MESSAGE: Record<ContactResultType, NullableUndefined<string>> = {
  [CONTACT_RESULT.CAPTCHA_FAILED]: CONTACT_ERROR_MESSAGE.CAPTCHA_FAILED,
  [CONTACT_RESULT.ERROR]: CONTACT_ERROR_MESSAGE.UNEXPECTED,
  [CONTACT_RESULT.RATE_LIMITED]: CONTACT_ERROR_MESSAGE.RATE_LIMITED,
  [CONTACT_RESULT.SUCCESS]: undefined,
};

export const CONTACT_FUNCTION = {
  NAME: "submit-contact-message",
} as const;

// Códigos que devuelve la Edge Function en el campo `code` de sus errores.
export const CONTACT_API_CODE = {
  CAPTCHA_FAILED: "captcha_failed",
  RATE_LIMITED: "rate_limited",
} as const;

export const CONTACT_API_CODE_RESULT: Partial<Record<string, ContactResultType>> = {
  [CONTACT_API_CODE.CAPTCHA_FAILED]: CONTACT_RESULT.CAPTCHA_FAILED,
  [CONTACT_API_CODE.RATE_LIMITED]: CONTACT_RESULT.RATE_LIMITED,
};

// Desde qué página llega el mensaje (columna `source` de contact_messages). SCRUM-36 agrega ABOUT.
export const CONTACT_SOURCE = {
  LANDING: "landing",
} as const;

export type ContactSourceType = (typeof CONTACT_SOURCE)[keyof typeof CONTACT_SOURCE];

// Orden visual de los campos de una línea; el mensaje va aparte porque es un textarea.
export const CONTACT_INPUT_FIELDS = [
  { field: CONTACT_FIELD.NAME, label: CONTACT_LABEL.NAME, type: INPUT_TYPE.TEXT },
  { field: CONTACT_FIELD.EMAIL, label: CONTACT_LABEL.EMAIL, type: INPUT_TYPE.EMAIL },
] as const;
