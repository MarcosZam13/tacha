// --- Pedir el enlace de recuperación (SCRUM-51) ---

// Valor del atributo `type` del campo de correo: el teclado del celular muestra la arroba.
export const FORGOT_PASSWORD_INPUT_TYPE = "email";

export const FORGOT_PASSWORD_LABEL = {
  BACK_TO_LOGIN: "Volver al inicio de sesión",
  DESCRIPTION:
    "Escribí el correo de tu cuenta y te enviaremos un enlace para restablecer tu contraseña.",
  EMAIL: "Correo electrónico",
  SENT_MESSAGE:
    "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisá también la carpeta de spam.",
  SUBMIT: "Enviar enlace",
  SUBMITTING: "Enviando...",
  TITLE: "Recuperar contraseña",
  USE_ANOTHER_EMAIL: "Usar otro correo",
} as const;

export const FORGOT_PASSWORD_ERROR_MESSAGE = {
  EMAIL_INVALID: "Ingresá un correo válido.",
  EMAIL_REQUIRED: "El correo es obligatorio.",
  UNEXPECTED: "No pudimos enviar el correo. Intentá de nuevo en unos minutos.",
} as const;

// `sent` es la confirmación genérica: se llega ahí exista o no la cuenta (y también con el límite de
// envíos de Supabase), para que la pantalla nunca revele si un correo tiene cuenta.
export const FORGOT_PASSWORD_STATUS = {
  ERROR: "error",
  IDLE: "idle",
  SENT: "sent",
  SUBMITTING: "submitting",
} as const;

export type ForgotPasswordStatusType =
  (typeof FORGOT_PASSWORD_STATUS)[keyof typeof FORGOT_PASSWORD_STATUS];

// Lo que devuelve el servicio. No hay un resultado "sin cuenta" ni "límite": no se distinguen.
export const RECOVERY_REQUEST_RESULT = {
  ERROR: "error",
  SENT: "sent",
} as const;

export type RecoveryRequestResultType =
  (typeof RECOVERY_REQUEST_RESULT)[keyof typeof RECOVERY_REQUEST_RESULT];

// Límite de envíos de Supabase Auth: un correo de recuperación por minuto por cuenta y un tope global
// por hora. Los dos responden con el mismo código y estado, y el servicio los trata como enviado.
export const RECOVERY_RATE_LIMIT = {
  ERROR_CODE: "over_email_send_rate_limit",
  HTTP_STATUS: 429,
} as const;

// Un error del servidor (5xx) tampoco se muestra: Supabase solo intenta mandar el correo si la cuenta
// existe, así que un fallo del envío (SMTP caído o que rechaza la dirección) solo pasa con cuentas
// reales, y mostrarlo como error delataría cuáles lo son. Un fallo de red llega con status 0.
export const RECOVERY_SERVER_ERROR_MIN_STATUS = 500;
