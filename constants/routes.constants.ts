// Rutas de las pantallas privadas (grupo app/(app)/). Las usan el shell de
// navegación, el redirect del login y la navbar pública.
export const APP_ROUTE = {
  CATALOG: "/catalogo",
  HOUSEHOLD: "/household",
  LIST: "/lista",
  MEAL_PLANNER: "/recetas/planificador",
  RECIPES: "/recetas",
} as const;

export type AppRouteType = (typeof APP_ROUTE)[keyof typeof APP_ROUTE];
