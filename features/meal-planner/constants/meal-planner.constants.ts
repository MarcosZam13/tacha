import { APP_ROUTE, RECIPES_TAB, RECIPES_TAB_LABEL, RECIPES_TABS_TEXT } from "@/constants";

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
  // pantalla lee el nombre accesible del botón (MEAL_SLOT_TEXT).
  EMPTY_SLOT_MARK: "+",
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

// Quién cocina: el propio usuario o nadie. En el plan de la familia, además, el id
// de otro miembro (SCRUM-162). SELF y NONE son valores del cliente, no ids.
export const COOK_CHOICE = {
  NONE: "none",
  SELF: "self",
} as const;

// Qué plan se ve: el propio o el de la familia (SCRUM-162).
export const PLAN_SCOPE = {
  FAMILY: "family",
  PERSONAL: "personal",
} as const;

// Cómo terminó guardar un espacio.
export const SAVE_SLOT_RESULT = {
  COOK_GONE: "cookGone",
  NO_HOUSEHOLD: "noHousehold",
  RECIPE_GONE: "recipeGone",
  SAVED: "saved",
} as const;

// Los miembros que se pueden elegir de cocinero.
export const COOK_OPTIONS_STATUS = {
  ERROR: "error",
  LOADING: "loading",
  READY: "ready",
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
    HOUSEHOLD_ID: "household_id",
    MEAL_TYPE: "meal_type",
    NAME: "name",
  },
  // Hints de la 062: distinguen casos con el mismo código.
  HINT: {
    COOK_NOT_MEMBER: "plan_cook_not_member",
    NO_HOUSEHOLD: "plan_no_household",
  },
  // El máximo que acepta get_household_members_page.
  MEMBERS_PAGE_SIZE: 50,
  // La receta embebida da el nombre y las porciones base en una sola petición.
  PLAN_SELECT: "id, date, meal_type, assigned_cook, servings_multiplier, recipes(id, name, base_servings)",
  RECIPE_OPTIONS_SELECT: "id, name, base_servings",
  RPC: {
    ASSIGN_HOUSEHOLD_MEAL_SLOT: "assign_household_meal_slot",
    ASSIGN_MEAL_SLOT: "assign_meal_slot",
    CLEAR_HOUSEHOLD_MEAL_SLOT: "clear_household_meal_slot",
    GET_HOUSEHOLD_MEAL_PLAN: "get_household_meal_plan",
    GET_HOUSEHOLD_MEMBERS_PAGE: "get_household_members_page",
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

// Rutas y nombres de campo del diálogo de asignar.
export const MEAL_SLOT_FORM = {
  COOK_FIELD_NAME: "meal-slot-cook",
  // La misma ruta que usa features/recipes: sale de constants/routes.constants.ts.
  NEW_RECIPE_PATH: APP_ROUTE.RECIPE_NEW,
  RECIPE_FIELD_NAME: "meal-slot-recipe",
} as const;

export const MEAL_SLOT_TEXT = {
  // Nombre accesible del espacio: "Almuerzo del lunes 12, vacío, asignar" /
  // "Almuerzo del lunes 12: Arroz con leche, cambiar".
  ASSIGNED_ACTION: ", cambiar",
  ASSIGNED_SEPARATOR: ": ",
  ASSIGN_TITLE: "Asignar comida",
  CANCEL: "Cancelar",
  CHANGE_TITLE: "Cambiar comida",
  COOK_GONE: "Esa persona ya no está en tu familia. Elige otro cocinero.",
  COOK_LABEL: "Quién cocina",
  COOKS_LOADING: "Cargando integrantes",
  COOKS_LOAD_ERROR: "No se pudieron cargar los integrantes.",
  COOK_UNNAMED: "Integrante sin nombre",
  COOK_NONE: "Sin cocinero",
  COOK_SELF: "Yo",
  CREATE_RECIPE: "Crear una receta",
  DECREASE_SERVINGS: "Menos porciones",
  EMPTY_ACTION: ", vacío, asignar",
  INCREASE_SERVINGS: "Más porciones",
  NO_FAMILY_RECIPES: "Tu familia todavía no tiene recetas.",
  NO_RECIPES: "Todavía no tienes recetas.",
  OF_DAY: " del ",
  PLAN_LOAD_ERROR: "No se pudo cargar tu plan. Intenta de nuevo.",
  RECIPE_GONE: "Esa receta ya no existe. Elige otra.",
  RECIPE_UNAVAILABLE: "Esa receta ya no está disponible. Elige otra.",
  RECIPE_LABEL: "Receta",
  RECIPES_LOADING: "Cargando recetas",
  RECIPES_LOAD_ERROR: "No se pudieron cargar tus recetas. Intenta de nuevo.",
  REMOVE: "Quitar",
  REMOVE_ERROR: "No se pudo quitar la comida. Intenta de nuevo.",
  RETRY: "Reintentar",
  SAVE: "Guardar",
  SAVE_ERROR: "No se pudo guardar la comida. Intenta de nuevo.",
  SAVING: "Guardando…",
  SERVINGS_LABEL: "Porciones",
  SERVINGS_MINUS_MARK: "−",
  SERVINGS_PLURAL: "porciones",
  SERVINGS_PLUS_MARK: "+",
  SERVINGS_SINGULAR: "porción",
  SERVINGS_SUMMARY_SEPARATOR: " · ",
} as const;

export const PLAN_SCOPE_FORM = {
  FIELD_NAME: "plan-scope",
} as const;

export const PLAN_SCOPE_TEXT = {
  FAMILY: "Plan de la familia",
  HOUSEHOLD_LOST: "Ya no formas parte de una familia. Te mostramos tu plan.",
  LEGEND: "Qué plan ver",
  PERSONAL: "Mi plan",
} as const;

// En el orden en que se dibujan.
export const PLAN_SCOPE_OPTIONS = [
  { label: PLAN_SCOPE_TEXT.PERSONAL, value: PLAN_SCOPE.PERSONAL },
  { label: PLAN_SCOPE_TEXT.FAMILY, value: PLAN_SCOPE.FAMILY },
] as const;

// --- Agregar la semana a la lista (SCRUM-101) ---

// Estados del diálogo de agregar la semana (WeekListState en models/week-list-addition.types.ts).
export const WEEK_LIST_STATUS = {
  ADDING: "adding",
  CLOSED: "closed",
  CONFIRMING: "confirming",
  DONE: "done",
  FAILED: "failed",
} as const;

// Acciones del reducer (utils/week-list-addition.reducer.ts).
export const WEEK_LIST_ACTION = {
  CLOSED: "closed",
  CONFIRMED: "confirmed",
  DESTINATION_CHANGED: "destinationChanged",
  DESTINATION_LOST: "destinationLost",
  FAILED: "failed",
  OPENED: "opened",
  SUCCEEDED: "succeeded",
} as const;

// A qué lista se agrega la semana (SCRUM-160).
export const WEEK_LIST_DESTINATION = {
  DATE_LIST: "dateList",
  GENERAL: "general",
} as const;

// Carga de las sublistas del selector: independiente de la confirmación (SPEC 17.5).
export const DATE_LIST_OPTIONS_STATUS = {
  FAILED: "failed",
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
} as const;

export const WEEK_LIST_DB = {
  COLUMN: {
    CREATED_AT: "created_at",
    EVENT_DATE: "event_date",
    STATUS: "status",
    TYPE: "type",
  },
  // El hint con el que add_week_to_list (058) distingue una sublista que ya no
  // sirve del P0002 de una receta.
  HINT_DATE_LIST_UNAVAILABLE: "date_list_unavailable",
  OPTION_SELECT: "id, name, event_date",
  RPC: {
    ADD_PLAN_WEEK_TO_LIST: "add_plan_week_to_list",
  },
  TABLE_LISTS: "lists",
} as const;

export const WEEK_LIST_FORM = {
  DESTINATION_FIELD_NAME: "week-list-destination",
} as const;

// Dónde se reemplazan los datos en las frases con huecos de WEEK_LIST_TEXT.
export const WEEK_LIST_TOKEN = {
  INGREDIENTS: "{ingredients}",
  LIST: "{list}",
  MEALS: "{meals}",
  RANGE: "{range}",
} as const;

export const WEEK_LIST_TEXT = {
  ADDING: "Agregando…",
  ALREADY_COVERED: "Tu lista ya tenía lo necesario para esta semana.",
  ALREADY_COVERED_DATE_LIST: "{list} ya tenía lo necesario para esta semana.",
  BUTTON: "Agregar semana a la lista",
  CANCEL: MEAL_SLOT_TEXT.CANCEL,
  CONFIRM: "Agregar",
  CONFIRM_MESSAGE: "Vas a agregar a tu lista general los ingredientes de {meals} ({range}).",
  // Con selector la frase no nombra la lista: la nombra la opción elegida.
  CONFIRM_MESSAGE_WITH_OPTIONS: "Vas a agregar los ingredientes de {meals} ({range}).",
  DESTINATION_GENERAL: "Lista general",
  DESTINATION_LABEL: "¿A qué lista?",
  DESTINATION_LOST: "Esa sublista ya no está disponible. Elige otra lista.",
  DIALOG_TITLE: "Agregar semana a la lista",
  ERROR: "No se pudo agregar la semana a tu lista. Intenta de nuevo.",
  INGREDIENT_PLURAL: "ingredientes",
  INGREDIENT_SINGULAR: "ingrediente",
  MEAL_PLURAL: "comidas",
  MEAL_SINGULAR: "comida",
  MISSING_PREFIX: "Te falta comprar:",
  NO_MEALS: "No había comidas planeadas esta semana.",
  // "Paseo a la playa · 28 nov".
  OPTION_SEPARATOR: " · ",
  OPTIONS_ERROR: "No se pudieron cargar tus sublistas. Puedes agregar a la lista general.",
  OPTIONS_LOADING: "Cargando tus sublistas…",
  RETRY: MEAL_SLOT_TEXT.RETRY,
  SKIPPED_PREFIX: "No se pudieron agregar:",
  SUCCESS: "Agregaste {ingredients} de {meals} a tu lista.",
  SUCCESS_DATE_LIST: "Agregaste {ingredients} de {meals} a {list}.",
  // Separa los productos dentro de "Te falta comprar: …" y "No se pudieron agregar: …".
  SUMMARY_SEPARATOR: ", ",
  VIEW_LIST: "Ver lista",
} as const;
