import { APP_ROUTE } from "./routes.constants";

// Sub-tabs de la sección "Recetas" (DESIGN.md §3.1). Los usan el catálogo
// (features/recipes) y el planificador (features/meal-planner), por eso viven
// acá y no en una de las dos features.
export const RECIPES_TAB = {
  PLANNER: "planner",
  RECIPES: "recipes",
} as const;

export type RecipesTabType = (typeof RECIPES_TAB)[keyof typeof RECIPES_TAB];

export const RECIPES_TAB_LABEL = {
  [RECIPES_TAB.PLANNER]: "Planificador semanal",
  [RECIPES_TAB.RECIPES]: "Recetas",
} as const satisfies Record<RecipesTabType, string>;

// Orden en que se dibujan los tabs. Cada uno es un link a su pantalla.
export const RECIPES_TABS = [
  { href: APP_ROUTE.RECIPES, id: RECIPES_TAB.RECIPES, label: RECIPES_TAB_LABEL[RECIPES_TAB.RECIPES] },
  { href: APP_ROUTE.MEAL_PLANNER, id: RECIPES_TAB.PLANNER, label: RECIPES_TAB_LABEL[RECIPES_TAB.PLANNER] },
] as const satisfies ReadonlyArray<{ href: string; id: RecipesTabType; label: string }>;

export const RECIPES_TABS_TEXT = {
  NAV_LABEL: "Secciones de recetas",
  // El título de la sección, igual en el catálogo y en el planificador: una sola constante para que no diverjan.
  SECTION_TITLE: "Recetas",
} as const;
