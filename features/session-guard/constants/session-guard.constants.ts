// Interruptor del guard. Apagado si la variable falta o no vale "true".
// Next solo reemplaza la variable si se lee escrita completa, así que no se puede abreviar.
export const IS_SESSION_GUARD_ENABLED = process.env.NEXT_PUBLIC_SESSION_GUARD_ENABLED === "true";

export const SESSION_GUARD_ROUTE = {
  ABOUT: "/nosotros",
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/registro",
  REGISTER_VERIFIED: "/registro/verificado",
  TERMS: "/terminos",
} as const;

// Rutas que se ven sin sesión. Todo lo que no esté acá exige sesión (falla cerrado).
// Cada página pública nueva (About, términos, recuperar contraseña...) debe agregarse acá.
export const PUBLIC_ROUTES: readonly string[] = [
  SESSION_GUARD_ROUTE.ABOUT,
  SESSION_GUARD_ROUTE.HOME,
  SESSION_GUARD_ROUTE.LOGIN,
  SESSION_GUARD_ROUTE.REGISTER,
  SESSION_GUARD_ROUTE.REGISTER_VERIFIED,
  SESSION_GUARD_ROUTE.TERMS,
];

export const SESSION_STATUS = {
  AUTHENTICATED: "authenticated",
  CHECKING: "checking",
  UNAUTHENTICATED: "unauthenticated",
} as const;

export type SessionStatusType = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

export const SESSION_GUARD_LABEL = {
  CHECKING: "Verificando tu sesión",
} as const;