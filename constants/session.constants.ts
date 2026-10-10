// Estado de la sesión de Supabase visto por la app. Lo usan el session guard
// (SCRUM-49) y la navbar pública (SCRUM-135). "checking" mientras llega el
// primer evento de onAuthStateChange.
export const SESSION_STATUS = {
  AUTHENTICATED: "authenticated",
  CHECKING: "checking",
  UNAUTHENTICATED: "unauthenticated",
} as const;

export type SessionStatusType = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

// Cuánto se espera al servidor al cerrar sesión. Pasado el tope, quien cierra sigue con la
// redirección al login en vez de dejar la pantalla privada abierta con una red colgada.
export const SIGN_OUT_TIMEOUT_MS = 5_000;
