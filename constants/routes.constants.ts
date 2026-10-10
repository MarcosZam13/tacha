// Rutas de las pantallas privadas (grupo app/(app)/). Las usan el shell de
// navegación, el redirect del login y la navbar pública.
export const APP_ROUTE = {
  CATALOG: "/catalogo",
  HOUSEHOLD: "/household",
  LIST: "/lista",
  MEAL_PLANNER: "/recetas/planificador",
  RECIPES: "/recetas",
  RECIPE_NEW: "/recetas/nueva",
} as const;

export type AppRouteType = (typeof APP_ROUTE)[keyof typeof APP_ROUTE];

// Rutas públicas de la cuenta: el login, pedir el enlace de recuperación y fijar la nueva
// contraseña. Las usan el enlace del login, el guard de sesión y la feature de recuperación.
export const AUTH_ROUTE = {
  FORGOT_PASSWORD: "/recuperar-contrasena",
  LOGIN: "/login",
  RESET_PASSWORD: "/actualizar-contrasena",
} as const;

export type AuthRouteType = (typeof AUTH_ROUTE)[keyof typeof AUTH_ROUTE];
