import { CATALOG_BASE_UNIT } from "@/constants";
import type { CatalogBaseUnitType } from "@/constants";

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
  // Las columnas dentro del select no llevan constante propia: el genérico
  // Database de types/database.types.ts las valida al compilar.
  CATALOG_SELECT:
    "id, name, base_servings, image_url, recipe_ingredients(id, position, product_catalog(name))",
  // .order() y .eq() aceptan cualquier string (no los valida el genérico), así
  // que esas columnas van como constante: un typo compilaría y fallaría en runtime.
  COLUMN: {
    CREATED_AT: "created_at",
    ID: "id",
  },
  EDITOR_SELECT:
    "id, name, base_servings, recipe_ingredients(position, quantity_value, quantity_unit, product_catalog(id, name))",
  RPC: {
    SAVE_RECIPE: "save_recipe",
  },
  TABLE: {
    RECIPES: "recipes",
  },
} as const;

// Códigos de Postgres que el servicio traduce a "no encontrada":
// INVALID_TEXT_REPRESENTATION: el id de la URL no es un uuid.
// NO_DATA_FOUND: save_recipe no encontró la receta a editar (no existe, se
// borró en otra pestaña o es ajena; 007_save_recipe.sql).
export const POSTGRES_ERROR_CODE = {
  INVALID_TEXT_REPRESENTATION: "22P02",
  NO_DATA_FOUND: "P0002",
} as const;

// Espejo de los check de la base (006_create_recipes.sql y 008_harden_recipes.sql):
// la UI avisa antes de mandar, pero la base es la que garantiza.
// QUANTITY_MAX: 100 kg / 100 L / 100 000 unidades; además de ser un tope
// razonable, es lo que hace que la base rechace NaN e Infinity.
export const RECIPE_FORM_LIMIT = {
  NAME_MAX_LENGTH: 120,
  QUANTITY_MAX: 100_000,
  SERVINGS_MAX: 50,
  SERVINGS_MIN: 1,
} as const;

// Cantidad: dígitos con decimales opcionales, ya con la coma pasada a punto
// ("0,5" → "0.5"). Porciones: solo enteros.
export const RECIPE_FORM_PATTERN = {
  QUANTITY: /^\d+(\.\d+)?$/,
  SERVINGS: /^\d+$/,
} as const;

// En Costa Rica los decimales se escriben con coma; Number() solo entiende punto.
export const DECIMAL_SEPARATOR = {
  COMMA: ",",
  POINT: ".",
} as const;

// Cómo se muestra cada unidad en el selector del ingrediente.
export const RECIPE_UNIT_LABEL = {
  [CATALOG_BASE_UNIT.GRAMS]: "g",
  [CATALOG_BASE_UNIT.MILLILITERS]: "ml",
  [CATALOG_BASE_UNIT.UNIT]: "unidades",
} as const satisfies Record<CatalogBaseUnitType, string>;

// Opciones del selector de unidad. ml primero a propósito: es la unidad más
// común en las recetas del catálogo actual (lácteos), así queda arriba.
export const RECIPE_UNIT_OPTIONS = [
  { label: RECIPE_UNIT_LABEL[CATALOG_BASE_UNIT.MILLILITERS], value: CATALOG_BASE_UNIT.MILLILITERS },
  { label: RECIPE_UNIT_LABEL[CATALOG_BASE_UNIT.GRAMS], value: CATALOG_BASE_UNIT.GRAMS },
  { label: RECIPE_UNIT_LABEL[CATALOG_BASE_UNIT.UNIT], value: CATALOG_BASE_UNIT.UNIT },
] as const satisfies ReadonlyArray<{ label: string; value: CatalogBaseUnitType }>;

// Estados del editor (models/RecipeEditorState.interface.ts).
export const RECIPE_EDITOR_STATUS = {
  EDITING: "editing",
  LOADING: "loading",
  LOAD_FAILED: "loadFailed",
  NOT_FOUND: "notFound",
  SAVING: "saving",
} as const;

export type RecipeEditorStatusType = (typeof RECIPE_EDITOR_STATUS)[keyof typeof RECIPE_EDITOR_STATUS];

// Acciones del reducer del editor (utils/recipe-editor.reducer.ts).
export const RECIPE_EDITOR_ACTION = {
  BASE_SERVINGS_CHANGED: "baseServingsChanged",
  INGREDIENT_ADDED: "ingredientAdded",
  INGREDIENT_QUANTITY_CHANGED: "ingredientQuantityChanged",
  INGREDIENT_REMOVED: "ingredientRemoved",
  INGREDIENT_UNIT_CHANGED: "ingredientUnitChanged",
  LOADED: "loaded",
  LOAD_FAILED: "loadFailed",
  NAME_CHANGED: "nameChanged",
  NOT_FOUND: "notFound",
  SAVE_FAILED: "saveFailed",
  SAVE_STARTED: "saveStarted",
  VALIDATION_FAILED: "validationFailed",
} as const;

// Todas las rutas salen de la misma base: si cambia "/recetas", cambian todas.
const RECIPES_BASE_PATH = "/recetas";

export const RECIPE_ROUTE = {
  CATALOG: RECIPES_BASE_PATH,
  EDIT_SEGMENT: "editar",
  NEW: `${RECIPES_BASE_PATH}/nueva`,
} as const;

export const RECIPE_FORM_ERROR = {
  INGREDIENTS_REQUIRED: "Agrega al menos un ingrediente.",
  NAME_REQUIRED: "Escribe el nombre de la receta.",
  NAME_TOO_LONG: `El nombre puede tener hasta ${RECIPE_FORM_LIMIT.NAME_MAX_LENGTH} caracteres.`,
  QUANTITY_INVALID: `Escribe una cantidad mayor que 0 y de hasta ${RECIPE_FORM_LIMIT.QUANTITY_MAX}.`,
  SERVINGS_INVALID: `Las porciones tienen que ser un número entero entre ${RECIPE_FORM_LIMIT.SERVINGS_MIN} y ${RECIPE_FORM_LIMIT.SERVINGS_MAX}.`,
} as const;

export const RECIPE_EDITOR_TEXT = {
  BACK_TO_CATALOG: "← Volver a recetas",
  CANCEL: "Cancelar",
  DUPLICATE_INGREDIENT: "Ese producto ya está en la receta.",
  EDIT_TITLE: "Editar receta",
  INGREDIENTS_HINT: "Busca cada ingrediente en el catálogo y después indica cuánto lleva.",
  LOAD_ERROR: "No se pudo cargar la receta. Intenta de nuevo.",
  NAME_LABEL: "Nombre",
  NAME_PLACEHOLDER: "Ej. Arroz con leche",
  NEW_TITLE: "Nueva receta",
  NOT_FOUND: "No encontramos esa receta.",
  NO_INGREDIENTS: "Todavía no agregaste ingredientes.",
  QUANTITY_LABEL: "Cantidad",
  QUANTITY_PLACEHOLDER: "Ej. 500",
  REMOVE_INGREDIENT: "Quitar",
  SAVE: "Guardar receta",
  SAVE_ERROR: "No se pudo guardar la receta. Intenta de nuevo.",
  SAVING: "Guardando…",
  SERVINGS_LABEL: "Porciones base",
  SERVINGS_PLACEHOLDER: "Ej. 4",
  UNIT_LABEL: "Unidad",
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
  COMING_SOON: "· Próximamente",
  EDIT: "Editar",
  EMPTY_CATALOG: "Todavía no tienes recetas.",
  INGREDIENTS_LABEL: "Ingredientes",
  LOAD_ERROR: "No se pudieron cargar tus recetas. Intenta de nuevo.",
  MORE_INGREDIENTS: "más",
  NEW_RECIPE: "+ Nueva receta",
  SERVINGS_PLURAL: "porciones",
  SERVINGS_SINGULAR: "porción",
  TABS_LABEL: "Secciones de recetas",
  TITLE: "Recetas",
} as const;

// Estados de la eliminación (models/RecipeDeletionState.type.ts).
export const RECIPE_DELETION_STATUS = {
  CONFIRMING: "confirming",
  DELETING: "deleting",
  FAILED: "failed",
  IDLE: "idle",
} as const;

// TRIGGER es el botón de la tarjeta (abre el diálogo); CONFIRM, el del
// diálogo (borra). Hoy dicen lo mismo, pero son dos botones distintos.
export const RECIPE_DELETE_TEXT = {
  CANCEL: "Cancelar",
  CONFIRM: "Eliminar",
  DELETING: "Eliminando…",
  DIALOG_TITLE: "¿Eliminar esta receta?",
  ERROR: "No se pudo eliminar la receta. Intenta de nuevo.",
  IRREVERSIBLE_NOTICE: "Se borra con todos sus ingredientes y no se puede deshacer.",
  TRIGGER: "Eliminar",
} as const;
