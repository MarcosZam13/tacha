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

// Alcance del cierre de sesión de Supabase: `local` borra solo la sesión de este navegador; `others` revoca
// todas las demás sesiones de la cuenta y deja esta (otros dispositivos incluidos).
export const SIGN_OUT_SCOPE = {
  LOCAL: "local",
  OTHERS: "others",
} as const;

export type SignOutScopeType = (typeof SIGN_OUT_SCOPE)[keyof typeof SIGN_OUT_SCOPE];
