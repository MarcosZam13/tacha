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
