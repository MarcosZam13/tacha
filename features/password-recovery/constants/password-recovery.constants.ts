// --- Pedir el enlace de recuperación (SCRUM-51) ---

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

// --- Vista de actualización de contraseña (SCRUM-52) ---

export const RESET_PASSWORD_LABEL = {
  CHECKING: "Verificando el enlace",
  DONE_MESSAGE:
    "Tu contraseña se actualizó. Te llevamos al inicio de sesión para que entres con la nueva.",
  DONE_TITLE: "Contraseña actualizada",
  FORM_TITLE: "Nueva contraseña",
  GO_TO_LOGIN: "Iniciar sesión",
  INVALID_MESSAGE: "El enlace para restablecer tu contraseña no es válido o ya venció.",
  INVALID_TITLE: "El enlace no es válido",
  REQUEST_NEW_LINK: "Pedir un enlace nuevo",
} as const;

// `verifying` mientras Supabase confirma el enlace; `invalid` agrupa vencido, usado e inexistente (la
// pantalla no los distingue); `done` es tras guardar y cerrar las sesiones, antes de ir al login.
export const RESET_PASSWORD_STATUS = {
  DONE: "done",
  INVALID: "invalid",
  READY: "ready",
  SAVING: "saving",
  VERIFYING: "verifying",
} as const;

export type ResetPasswordStatusType =
  (typeof RESET_PASSWORD_STATUS)[keyof typeof RESET_PASSWORD_STATUS];

// Error propio de la vista de actualización (los del guardado de la contraseña son de NEW_PASSWORD_ERROR_MESSAGE).
export const RESET_PASSWORD_ERROR_MESSAGE = {
  SESSIONS_NOT_CLOSED:
    "No pudimos cerrar tus otras sesiones, así que no cambiamos tu contraseña. Intentá de nuevo.",
} as const;

// Cuánto se espera a que Supabase confirme un enlace que ya procesó (INITIAL_SESSION con el fragmento borrado)
// antes de darlo por no válido. PASSWORD_RECOVERY llega un instante después; si no llega, se falla cerrado.
export const RECOVERY_CONFIRMATION_GRACE_MS = 3_000;

// Cuánto se muestra la confirmación antes de ir al login solo. El botón "Iniciar sesión" va sin esperar:
// una redirección solo con temporizador no deja leer a quien necesita más tiempo.
export const RESET_PASSWORD_REDIRECT_DELAY_MS = 3_000;

// Parámetros que Supabase deja en el fragmento (#) de la URL del enlace (flujo implícito).
export const RECOVERY_URL_PARAM = {
  ACCESS_TOKEN: "access_token",
  ERROR: "error",
  ERROR_CODE: "error_code",
  ERROR_DESCRIPTION: "error_description",
  TYPE: "type",
} as const;

// Valor de `type` de un enlace de recuperación de contraseña (otros tipos: signup, magiclink...).
export const RECOVERY_LINK_TYPE = "recovery";

// Qué trae la URL al cargar la vista: un enlace de recuperación, un error de Supabase (vencido o usado),
// o nada (se abrió a mano).
export const RECOVERY_LINK_STATUS = {
  ERROR: "error",
  NONE: "none",
  RECOVERY: "recovery",
} as const;

export type RecoveryLinkStatusType =
  (typeof RECOVERY_LINK_STATUS)[keyof typeof RECOVERY_LINK_STATUS];

// Eventos de sesión de Supabase que importan acá. `INITIAL_SESSION` llega primero y con la sesión que
// hubiera (también una vieja); `PASSWORD_RECOVERY` solo llega si Supabase aceptó el enlace.
export const RECOVERY_AUTH_EVENT = {
  INITIAL_SESSION: "INITIAL_SESSION",
  PASSWORD_RECOVERY: "PASSWORD_RECOVERY",
} as const;
