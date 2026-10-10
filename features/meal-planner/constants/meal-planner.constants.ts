import { RECIPES_TAB, RECIPES_TAB_LABEL, RECIPES_TABS_TEXT } from "@/constants";

// Constantes propias del planificador semanal. Viven dentro de la feature
// porque ninguna otra las usa todavía; se promueven a constants/ con el
// segundo consumidor.

// Qué semana se ve: la que contiene a hoy o la siguiente (SPEC regla 2).
// El valor es cuántas semanas hay que sumarle al lunes de la semana actual.
export const WEEK_OFFSET = {
  CURRENT: 0,
  NEXT: 1,
} as const;

// Tipos de comida de un espacio del plan. Son el contrato con
// meal_plans.meal_type (documento-proyecto §6): SCRUM-100 los usa tal cual.
export const MEAL_TYPE = {
  BREAKFAST: "breakfast",
  DINNER: "dinner",
  LUNCH: "lunch",
} as const;

// Orden en que se dibujan los 3 espacios de cada día (SPEC regla 5).
export const MEAL_TYPES = [MEAL_TYPE.BREAKFAST, MEAL_TYPE.LUNCH, MEAL_TYPE.DINNER] as const;

export const MEAL_TYPE_LABEL = {
  [MEAL_TYPE.BREAKFAST]: "Desayuno",
  [MEAL_TYPE.DINNER]: "Cena",
  [MEAL_TYPE.LUNCH]: "Almuerzo",
} as const satisfies Record<(typeof MEAL_TYPE)[keyof typeof MEAL_TYPE], string>;

// La semana va de lunes a domingo (SPEC regla 1). Date.getDay() cuenta desde
// el domingo (0), así que para pasar a "lunes primero" se corre un día.
export const WEEK = {
  DAYS: 7,
} as const;

// Etiquetas indexadas por días desde el lunes: 0 = lunes, 6 = domingo.
// En constantes y no en Intl: servidor y navegador dibujan exactamente lo mismo (SPEC regla 10).
export const WEEKDAY_SHORT_LABEL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

export const WEEKDAY_LONG_LABEL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

// Indexado por Date.getMonth(): 0 = enero.
export const MONTH_SHORT_LABEL = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

// Clave de un día en hora local, "2026-10-12": la forma de un `date` de
// Postgres, que es lo que SCRUM-100 va a comparar contra meal_plans.date.
export const DATE_KEY = {
  PAD_CHARACTER: "0",
  PAD_LENGTH: 2,
  SEPARATOR: "-",
} as const;

export const MEAL_PLANNER_TEXT = {
  // "+ Almuerzo": el espacio vacío. El "+" es decorativo; el lector de
  // pantalla lee "Almuerzo, vacío".
  EMPTY_SLOT_MARK: "+",
  EMPTY_SLOT_SCREEN_READER: ", vacío",
  // Las flechas del selector son decorativas; el nombre del botón es el texto oculto.
  NEXT_ARROW_MARK: "›",
  NEXT_WEEK: "Próxima semana",
  NEXT_WEEK_ARROW: "Semana siguiente",
  PAGE_TITLE: RECIPES_TAB_LABEL[RECIPES_TAB.PLANNER],
  PREVIOUS_ARROW_MARK: "‹",
  PREVIOUS_WEEK_ARROW: "Semana anterior",
  RANGE_SEPARATOR: " – ",
  THIS_WEEK: "Esta semana",
  TITLE: RECIPES_TABS_TEXT.SECTION_TITLE,
} as const;

// --- SCRUM-100: asignar una receta a un espacio ---

// Estados del plan cargado (MealPlanState en models/meal-plan.types.ts).
export const MEAL_PLAN_STATUS = {
  ERROR: "error",
  LOADING: "loading",
  READY: "ready",
} as const;

// Estados del diálogo de asignar (MealSlotDialogState en models/meal-plan.types.ts).
export const MEAL_SLOT_DIALOG_STATUS = {
  CLOSED: "closed",
  EDITING: "editing",
  FAILED: "failed",
  SAVING: "saving",
} as const;

// Acciones del reducer del diálogo (utils/meal-slot-dialog.reducer.ts).
export const MEAL_SLOT_DIALOG_ACTION = {
  CLOSED: "closed",
  COOK_CHANGED: "cookChanged",
  MULTIPLIER_DECREASED: "multiplierDecreased",
  MULTIPLIER_INCREASED: "multiplierIncreased",
  OPENED: "opened",
  RECIPE_CHOSEN: "recipeChosen",
  SAVE_FAILED: "saveFailed",
  SAVE_STARTED: "saveStarted",
  SAVE_SUCCEEDED: "saveSucceeded",
} as const;

// Estados de la lista de recetas del diálogo.
export const RECIPE_OPTIONS_STATUS = {
  ERROR: "error",
  LOADING: "loading",
  READY: "ready",
} as const;

// Quién cocina. Hoy solo el propio usuario o nadie: la lista de miembros del
// household no existe todavía (HU-35). Es un valor del cliente, no un id: el id
// del usuario lo pone la base (RPC assign_meal_slot, parámetro cook_is_self).
export const COOK_CHOICE = {
  NONE: "none",
  SELF: "self",
} as const;

// Multiplicador de porciones (SPEC regla 15): de ×0,5 a ×4 en pasos de 0,5. Los
// check de meal_plans (019_meal_plans.sql) repiten estos límites.
export const SERVINGS_MULTIPLIER = {
  DEFAULT: 1,
  MAX: 4,
  MIN: 0.5,
  STEP: 0.5,
} as const;

// Cómo se escribe un multiplicador: "×2", "×0,5" (coma decimal, como en Costa Rica).
export const MULTIPLIER_FORMAT = {
  DECIMAL_COMMA: ",",
  DECIMAL_POINT: ".",
  PREFIX: "×",
} as const;

// Clave de un espacio dentro del plan: "2026-10-12|lunch".
export const SLOT_KEY = {
  SEPARATOR: "|",
} as const;

// El diálogo de asignar y el plan; los literales de la base (SPEC §12).
export const MEAL_PLAN_DB = {
  // .order(), .gte() y .lte() aceptan cualquier string: estas columnas van como
  // constante para que un typo no compile en silencio.
  COLUMN: {
    DATE: "date",
    MEAL_TYPE: "meal_type",
    NAME: "name",
  },
  // La receta embebida da el nombre y las porciones base en una sola petición.
  PLAN_SELECT: "id, date, meal_type, assigned_cook, servings_multiplier, recipes(id, name, base_servings)",
  RECIPE_OPTIONS_SELECT: "id, name, base_servings",
  RPC: {
    ASSIGN_MEAL_SLOT: "assign_meal_slot",
  },
  TABLE: {
    MEAL_PLANS: "meal_plans",
    RECIPES: "recipes",
  },
} as const;

// Código de Postgres que el servicio traduce a "la receta ya no existe":
// assign_meal_slot responde P0002 si no la encuentra (inexistente, ajena o borrada).
export const MEAL_PLAN_ERROR_CODE = {
  NO_DATA_FOUND: "P0002",
} as const;

export const MEAL_SLOT_TEXT = {
  // Nombre accesible del espacio: "Almuerzo del lunes 12, vacío, asignar" /
  // "Almuerzo del lunes 12: Arroz con leche, cambiar".
  ASSIGNED_ACTION: ", cambiar",
  ASSIGNED_SEPARATOR: ": ",
  ASSIGN_TITLE: "Asignar comida",
  CANCEL: "Cancelar",
  CHANGE_TITLE: "Cambiar comida",
  COOK_LABEL: "Quién cocina",
  COOK_NONE: "Sin cocinero",
  COOK_SELF: "Yo",
  CREATE_RECIPE: "Crear una receta",
  DECREASE_SERVINGS: "Menos porciones",
  EMPTY_ACTION: ", vacío, asignar",
  INCREASE_SERVINGS: "Más porciones",
  NO_RECIPES: "Todavía no tienes recetas.",
  OF_DAY: " del ",
  PLAN_LOAD_ERROR: "No se pudo cargar tu plan. Intenta de nuevo.",
  RECIPE_GONE: "Esa receta ya no existe. Elige otra.",
  RECIPE_LABEL: "Receta",
  RECIPES_LOAD_ERROR: "No se pudieron cargar tus recetas. Intenta de nuevo.",
  REMOVE: "Quitar",
  REMOVE_ERROR: "No se pudo quitar la comida. Intenta de nuevo.",
  RETRY: "Reintentar",
  SAVE: "Guardar",
  SAVE_ERROR: "No se pudo guardar la comida. Intenta de nuevo.",
  SAVING: "Guardando…",
  SERVINGS_LABEL: "Porciones",
  SERVINGS_PLURAL: "porciones",
  SERVINGS_SINGULAR: "porción",
  SERVINGS_SUMMARY_SEPARATOR: " · ",
} as const;
