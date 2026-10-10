import { APP_ROUTE, CATALOG_BASE_UNIT, RECIPES_TABS_TEXT } from "@/constants";
import type { CatalogBaseUnitType } from "@/constants";

// Constantes propias de recetas. Viven dentro de la feature porque ninguna
// otra las usa todavía; se promueven a constants/ con el segundo consumidor.

// Cuántos ingredientes se muestran en la tarjeta antes del "+N más".
export const RECIPE_CATALOG = {
  MAIN_INGREDIENTS_LIMIT: 3,
} as const;

// Estados de la pantalla (RecipeCatalogState en models/recipe-catalog.types.ts).
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
    RECIPE_ID: "recipe_id",
  },
  EDITOR_SELECT:
    "id, name, base_servings, recipe_ingredients(position, quantity_value, quantity_unit, product_catalog(id, name))",
  RPC: {
    ADD_RECIPE_TO_GENERAL_LIST: "add_recipe_to_general_list",
    GET_RECIPE_COVERAGE: "get_recipe_coverage",
    SAVE_RECIPE: "save_recipe",
  },
  TABLE: {
    // meal_plans lo crea SCRUM-100: acá solo se cuenta cuántos espacios del plan usan una receta.
    MEAL_PLANS: "meal_plans",
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

// Espejo de los check de la base (006_create_recipes.sql, 008_harden_recipes.sql
// y save_recipe en 013_add_recipe_to_list.sql): la UI avisa antes de mandar,
// pero la base es la que garantiza.
// QUANTITY_MAX: 100 kg / 100 L / 100 000 unidades; además de ser un tope
// razonable, es lo que hace que la base rechace NaN e Infinity.
// INGREDIENTS_MAX: agregar una receta a la lista recorre todos sus ingredientes.
export const RECIPE_FORM_LIMIT = {
  INGREDIENTS_MAX: 50,
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

// Singular de cada unidad, para cantidades de exactamente 1 ("1 unidad", no "1 unidades").
export const RECIPE_UNIT_SINGULAR_LABEL = {
  [CATALOG_BASE_UNIT.GRAMS]: "g",
  [CATALOG_BASE_UNIT.MILLILITERS]: "ml",
  [CATALOG_BASE_UNIT.UNIT]: "unidad",
} as const satisfies Record<CatalogBaseUnitType, string>;

// Opciones del selector de unidad. ml primero a propósito: es la unidad más
// común en las recetas del catálogo actual (lácteos), así queda arriba.
export const RECIPE_UNIT_OPTIONS = [
  { label: RECIPE_UNIT_LABEL[CATALOG_BASE_UNIT.MILLILITERS], value: CATALOG_BASE_UNIT.MILLILITERS },
  { label: RECIPE_UNIT_LABEL[CATALOG_BASE_UNIT.GRAMS], value: CATALOG_BASE_UNIT.GRAMS },
  { label: RECIPE_UNIT_LABEL[CATALOG_BASE_UNIT.UNIT], value: CATALOG_BASE_UNIT.UNIT },
] as const satisfies ReadonlyArray<{ label: string; value: CatalogBaseUnitType }>;

// Estados del editor (RecipeEditorState en models/recipe-editor.interfaces.ts).
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

// Todas las rutas salen de la misma base (constants/routes.constants.ts).
const RECIPES_BASE_PATH = APP_ROUTE.RECIPES;

export const RECIPE_ROUTE = {
  CATALOG: RECIPES_BASE_PATH,
  EDIT_SEGMENT: "editar",
  NEW: APP_ROUTE.RECIPE_NEW,
  // Lista general, para el link "Ver lista" de SCRUM-97.
  SHOPPING_LIST: APP_ROUTE.LIST,
} as const;

export const RECIPE_FORM_ERROR = {
  INGREDIENTS_REQUIRED: "Agrega al menos un ingrediente.",
  INGREDIENTS_TOO_MANY: `La receta puede tener hasta ${RECIPE_FORM_LIMIT.INGREDIENTS_MAX} ingredientes.`,
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

export const RECIPE_TEXT = {
  EDIT: "Editar",
  EMPTY_CATALOG: "Todavía no tienes recetas.",
  INGREDIENTS_LABEL: "Ingredientes",
  LOAD_ERROR: "No se pudieron cargar tus recetas. Intenta de nuevo.",
  MORE_INGREDIENTS: "más",
  NEW_RECIPE: "+ Nueva receta",
  SERVINGS_PLURAL: "porciones",
  SERVINGS_SINGULAR: "porción",
  TITLE: RECIPES_TABS_TEXT.SECTION_TITLE,
} as const;

// Estados de la eliminación (RecipeDeletionState en models/recipe-deletion.types.ts).
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
  // Aviso cuando la receta está en el plan semanal (SPEC regla 22 de features/meal-planner):
  // "Está en 3 espacios de tu plan; quedarán vacíos." / "Está en 1 espacio de tu plan; quedará vacío."
  MEAL_PLAN_NOTICE_PLURAL_PREFIX: "Está en",
  MEAL_PLAN_NOTICE_PLURAL_SUFFIX: "espacios de tu plan; quedarán vacíos.",
  MEAL_PLAN_NOTICE_SINGULAR: "Está en 1 espacio de tu plan; quedará vacío.",
  TRIGGER: "Eliminar",
} as const;

// Estados de agregar una receta a la lista (RecipeListAdditionState en
// models/recipe-list-addition.types.ts).
export const RECIPE_LIST_ADDITION_STATUS = {
  ADDED: "added",
  ADDING: "adding",
  CONFIRMING_REPEAT: "confirmingRepeat",
  FAILED: "failed",
  IDLE: "idle",
} as const;

export const RECIPE_ADD_TO_LIST_TEXT = {
  ADDING: "Agregando…",
  ALREADY_COVERED: "Tu lista ya tenía lo necesario para esta receta.",
  CANCEL: "Cancelar",
  ERROR: "No se pudo agregar la receta a tu lista. Intenta de nuevo.",
  MISSING_PREFIX: "Te falta comprar:",
  NOT_FOUND: "No encontramos esa receta.",
  REPEAT_CONFIRM: "Agregar otra vez",
  REPEAT_DIALOG_TITLE: "¿Agregar otra vez a tu lista?",
  REPEAT_NOTICE: "Ya agregaste esta receta a tu lista. Si la agregas otra vez, se vuelven a sumar sus ingredientes.",
  SKIPPED_PREFIX: "No se pudieron agregar:",
  // Separa los productos dentro de "Te falta comprar: …" y "No se pudieron agregar: …".
  SUMMARY_SEPARATOR: ", ",
  SUCCESS: "Agregaste la receta a tu lista.",
  TRIGGER: "Agregar receta a lista",
  VIEW_LIST: "Ver lista",
} as const;

// Estados del panel "Ver qué falta" (RecipeCoverageState en
// models/recipe-coverage.types.ts).
export const RECIPE_COVERAGE_STATUS = {
  CLOSED: "closed",
  ERROR: "error",
  LOADING: "loading",
  NOT_FOUND: "notFound",
  READY: "ready",
} as const;

// Estado de cada ingrediente y su motivo, tal como los devuelve
// get_recipe_coverage (017_recipe_coverage.sql, reglas 29 y 30 de la SPEC).
export const RECIPE_COVERAGE_INGREDIENT_STATUS = {
  COVERED: "covered",
  MISSING: "missing",
} as const;

export const RECIPE_COVERAGE_REASON = {
  NOT_CHECKED: "notChecked",
  NOT_IN_LIST: "notInList",
  SHORT: "short",
} as const;

// Realtime sobre list_items (regla 32): solo se usa como señal para volver a
// pedir el estado a la base. EVENT "*" = insert, update y delete.
export const RECIPE_COVERAGE_REALTIME = {
  CHANNEL_PREFIX: "recipe-coverage-",
  EVENT: "*",
  LISTEN_TYPE: "postgres_changes",
  SCHEMA: "public",
  TABLE: "list_items",
} as const;

// Prefijo del id del panel de cada tarjeta (aria-controls del botón).
export const RECIPE_COVERAGE_PANEL_ID_PREFIX = "recipe-coverage-panel-";

export const RECIPE_COVERAGE_TEXT = {
  ALL_COVERED: "Tienes todo para cocinarla",
  CLOSE: "Ocultar qué falta",
  COVERED: "Cubierto",
  ERROR: "No se pudo revisar qué falta. Intenta de nuevo.",
  INGREDIENTS_LABEL: "Ingredientes de la receta",
  LOADING: "Revisando qué falta",
  MISSING: "Falta",
  NOT_FOUND: "No encontramos esa receta.",
  OPEN: "Ver qué falta",
  REASON_NOT_CHECKED: "En tu lista, sin tachar",
  REASON_NOT_IN_LIST: "No está en tu lista",
  REASON_SHORT: "Te falta comprar",
  RETRY: "Reintentar",
  SUMMARY_MISSING_PLURAL: "Te faltan",
  SUMMARY_MISSING_SINGULAR: "Te falta",
  SUMMARY_OF: "de",
  SUMMARY_UNIT: "ingredientes",
} as const;

// Recetas ya agregadas desde este navegador (regla 27 de la SPEC). Con prefijo
// de la app: localStorage es compartido por todo el dominio.
export const RECIPE_ADDED_STORAGE = {
  KEY: "tacha.recipes.addedToList",
} as const;
