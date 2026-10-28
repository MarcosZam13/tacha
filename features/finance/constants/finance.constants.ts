// Tipos de periodo del dashboard de Finanzas (SPEC §5, D2). Los mismos valores
// que acepta spending_budgets.period y set_spending_budget (migración 027).
export const SPENDING_PERIOD = {
  DAY: "day",
  MONTH: "month",
  WEEK: "week",
} as const;

export type SpendingPeriodType = (typeof SPENDING_PERIOD)[keyof typeof SPENDING_PERIOD];

// La pantalla arranca en la semana en curso (D2).
export const DEFAULT_SPENDING_PERIOD: SpendingPeriodType = SPENDING_PERIOD.WEEK;

// Semana de lunes a domingo (D2). Date.getDay() cuenta desde el domingo (0),
// así que (getDay() + DAYS_FROM_SUNDAY_TO_MONDAY) % DAYS_PER_WEEK son los días
// que pasaron desde el lunes.
export const CALENDAR_WEEK = {
  DAYS_FROM_SUNDAY_TO_MONDAY: 6,
  DAYS_PER_WEEK: 7,
} as const;

// Espejo del check de spending_budgets.amount (027): colones enteros de 0 a
// 9 999 999 999. Se escriben con separadores de miles opcionales (espacio,
// punto o coma) en grupos de 3, las mismas reglas que "Total gastado" del modo
// compra; están repetidas a propósito para no tocar shopping-list (SPEC §15).
export const BUDGET_AMOUNT = {
  MAX: 9_999_999_999,
  PATTERN: /^(\d+|\d{1,3}([ .,]\d{3})+)$/,
  // Con /g: solo para .replace (quita todos). No usarlo con .test, que con /g recuerda dónde quedó entre llamadas.
  THOUSANDS_SEPARATOR: /[ .,]/g,
} as const;

// Tablas, columnas y RPC que usa services/finance.service.ts (SPEC §12).
// purchase_sessions es de SCRUM-67 (016, 018) y no se modifica; spending_budgets
// y set_spending_budget son de la migración 027.
export const FINANCE_DB = {
  COLUMN: {
    CLOSED_AT: "closed_at",
  },
  RPC: {
    SET_SPENDING_BUDGET: "set_spending_budget",
  },
  SELECT: {
    BUDGETS: "period, amount",
    SPENDING: "total_amount",
  },
  TABLE: {
    PURCHASE_SESSIONS: "purchase_sessions",
    SPENDING_BUDGETS: "spending_budgets",
  },
} as const;

// Los montos de purchase_sessions.total_amount tienen centavos (numeric(12, 2)):
// se suman en centavos enteros para no arrastrar errores de punto flotante.
export const CENTS_PER_COLON = 100;

// ----------------------------------------------------------------------------
// Estados del dashboard (SPEC §6). Cada uno es una unión: la pantalla está en
// uno solo a la vez.
// ----------------------------------------------------------------------------

// Acceso (D6): sin cuenta registrada no se pide ningún dato.
export const FINANCE_ACCESS_STATUS = {
  CHECKING: "checking",
  NO_ACCOUNT: "noAccount",
  REGISTERED: "registered",
} as const;

export type FinanceAccessStatusType = (typeof FINANCE_ACCESS_STATUS)[keyof typeof FINANCE_ACCESS_STATUS];

// Gasto del periodo elegido.
export const SPENDING_STATUS = {
  EMPTY: "empty",
  FAILED: "failed",
  LOADING: "loading",
  READY: "ready",
} as const;

export type SpendingStatusType = (typeof SPENDING_STATUS)[keyof typeof SPENDING_STATUS];

// Presupuesto del periodo elegido: su carga y su edición.
export const BUDGET_STATUS = {
  EDITING: "editing",
  LOAD_FAILED: "loadFailed",
  LOADING: "loading",
  SAVE_FAILED: "saveFailed",
  SAVING: "saving",
  VIEWING: "viewing",
} as const;

export type BudgetStatusType = (typeof BUDGET_STATUS)[keyof typeof BUDGET_STATUS];

// ----------------------------------------------------------------------------
// Textos (SPEC §7 y §8; propuestos, se ajustan en la revisión).
// ----------------------------------------------------------------------------

export const FINANCE_TEXT = {
  BUDGET_INVALID: "Escribe el monto en colones, solo números (ej. 50000).",
  BUDGET_LOAD_ERROR: "No se pudo cargar tu presupuesto. Intenta de nuevo.",
  BUDGET_SAVED: "Presupuesto guardado",
  BUDGET_SAVE_ERROR: "No se pudo guardar tu presupuesto. Intenta de nuevo.",
  CANCEL: "Cancelar",
  DEFINE_BUDGET: "Definir presupuesto",
  EDIT_BUDGET: "Editar presupuesto",
  LOGIN: "Iniciar sesión",
  NO_ACCOUNT: "Inicia sesión con tu cuenta para ver tus finanzas.",
  // "No incluye 1 compra sin total" / "No incluye 2 compras sin total".
  NOT_INCLUDED_PREFIX: "No incluye ",
  OVER_BUDGET_PREFIX: "Te pasaste por ",
  PERIOD_GROUP_LABEL: "Periodo",
  PURCHASES: "Compras",
  REMAINING_PREFIX: "Te quedan ",
  RETRY: "Reintentar",
  SAVE: "Guardar",
  SAVING: "Guardando…",
  SPENDING_EMPTY: "Todavía no tienes compras cerradas en este periodo.",
  SPENDING_LOAD_ERROR: "No se pudo cargar tu gasto. Intenta de nuevo.",
  TITLE: "Finanzas",
  WITHOUT_TOTAL: "Sin total",
  WITHOUT_TOTAL_PLURAL: "compras sin total",
  WITHOUT_TOTAL_SINGULAR: "compra sin total",
} as const;

// Textos que dependen del tipo de periodo. satisfies obliga a tener los tres.
export const SPENDING_PERIOD_LABEL = {
  [SPENDING_PERIOD.DAY]: "Día",
  [SPENDING_PERIOD.MONTH]: "Mes",
  [SPENDING_PERIOD.WEEK]: "Semana",
} as const satisfies Record<SpendingPeriodType, string>;

// Orden del selector (SPEC §8): Día, Semana, Mes.
export const SPENDING_PERIOD_ORDER = [
  SPENDING_PERIOD.DAY,
  SPENDING_PERIOD.WEEK,
  SPENDING_PERIOD.MONTH,
] as const satisfies readonly SpendingPeriodType[];

export const SPENT_LABEL = {
  [SPENDING_PERIOD.DAY]: "Gastado hoy",
  [SPENDING_PERIOD.MONTH]: "Gastado este mes",
  [SPENDING_PERIOD.WEEK]: "Gastado esta semana",
} as const satisfies Record<SpendingPeriodType, string>;

export const BUDGET_LABEL = {
  [SPENDING_PERIOD.DAY]: "Presupuesto diario",
  [SPENDING_PERIOD.MONTH]: "Presupuesto mensual",
  [SPENDING_PERIOD.WEEK]: "Presupuesto semanal",
} as const satisfies Record<SpendingPeriodType, string>;

export const NO_BUDGET_LABEL = {
  [SPENDING_PERIOD.DAY]: "Sin presupuesto diario",
  [SPENDING_PERIOD.MONTH]: "Sin presupuesto mensual",
  [SPENDING_PERIOD.WEEK]: "Sin presupuesto semanal",
} as const satisfies Record<SpendingPeriodType, string>;

export const BUDGET_INPUT_LABEL = {
  [SPENDING_PERIOD.DAY]: "Presupuesto diario (₡)",
  [SPENDING_PERIOD.MONTH]: "Presupuesto mensual (₡)",
  [SPENDING_PERIOD.WEEK]: "Presupuesto semanal (₡)",
} as const satisfies Record<SpendingPeriodType, string>;

// Fechas del periodo ("Lunes 12 a domingo 18 de octubre"), en español de Costa Rica.
export const PERIOD_RANGE_FORMAT = {
  LOCALE: "es-CR",
  // Une el primer y el último día de una semana.
  RANGE_CONNECTOR: " a ",
  // Une el día con el mes y el mes con el año: "18 de octubre de 2026".
  DATE_CONNECTOR: " de ",
} as const;
