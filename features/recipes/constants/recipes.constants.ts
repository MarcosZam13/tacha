// Constantes propias de recetas. Viven dentro de la feature porque ninguna
// otra las usa todavía; se promueven a constants/ con el segundo consumidor.

// Cuántos ingredientes se muestran en la tarjeta antes del "+N más".
export const RECIPE_CATALOG = {
  MAIN_INGREDIENTS_LIMIT: 3,
} as const;

// Estados de la pantalla (models/RecipeCatalogState.type.ts).
export const RECIPE_CATALOG_STATUS = {
  ERROR: "error",
  LOADING: "loading",
  READY: "ready",
} as const;

export const RECIPES_DB = {
  // Embebe ingredientes → producto madre en una sola petición (PostgREST).
  // Los nombres de columnas no llevan constante propia: el genérico Database
  // de types/database.types.ts los valida al compilar.
  CATALOG_SELECT:
    "id, name, base_servings, image_url, recipe_ingredients(position, product_catalog(name))",
  TABLE: {
    RECIPES: "recipes",
    RECIPE_INGREDIENTS: "recipe_ingredients",
  },
} as const;

// Sub-tabs de la sección "Recetas" (DESIGN.md §3.1). El planificador es SCRUM-99.
export const RECIPES_TAB = {
  PLANNER: "planner",
  RECIPES: "recipes",
} as const;

export type RecipesTabType = (typeof RECIPES_TAB)[keyof typeof RECIPES_TAB];

// Orden en que se dibujan los tabs. isAvailable = false: se ve, pero todavía
// no navega (cuando exista el planificador pasa a true y gana su ruta).
export const RECIPES_TABS = [
  { id: RECIPES_TAB.RECIPES, isAvailable: true, label: "Recetas" },
  { id: RECIPES_TAB.PLANNER, isAvailable: false, label: "Planificador semanal" },
] as const satisfies ReadonlyArray<{ id: RecipesTabType; isAvailable: boolean; label: string }>;

export const RECIPE_TEXT = {
  COMING_SOON: "Próximamente",
  EMPTY_CATALOG: "Todavía no tienes recetas.",
  INGREDIENTS_LABEL: "Ingredientes",
  LOAD_ERROR: "No se pudieron cargar tus recetas. Intenta de nuevo.",
  MORE_INGREDIENTS: "más",
  SERVINGS_PLURAL: "porciones",
  SERVINGS_SINGULAR: "porción",
  TABS_LABEL: "Secciones de recetas",
  TITLE: "Recetas",
} as const;
