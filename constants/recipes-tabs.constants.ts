import { APP_ROUTE } from "./routes.constants";

// Sub-tabs de la sección "Recetas" (DESIGN.md §3.1). Los usan el catálogo
// (features/recipes) y el planificador (features/meal-planner), por eso viven
// acá y no en una de las dos features.
export const RECIPES_TAB = {
  PLANNER: "planner",
  RECIPES: "recipes",
} as const;

export type RecipesTabType = (typeof RECIPES_TAB)[keyof typeof RECIPES_TAB];

// Orden en que se dibujan los tabs. Cada uno es un link a su pantalla.
export const RECIPES_TABS = [
  { href: APP_ROUTE.RECIPES, id: RECIPES_TAB.RECIPES, label: "Recetas" },
  { href: APP_ROUTE.MEAL_PLANNER, id: RECIPES_TAB.PLANNER, label: "Planificador semanal" },
] as const satisfies ReadonlyArray<{ href: string; id: RecipesTabType; label: string }>;

export const RECIPES_TABS_TEXT = {
  NAV_LABEL: "Secciones de recetas",
} as const;
