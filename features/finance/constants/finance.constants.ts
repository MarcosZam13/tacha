import { APP_ROUTE, POSTGRES_ERROR_CODE } from "@/constants";

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

// Espejo del check de spending_budgets.amount (027) y de los totales que acepta
// la 040 (assert_valid_spending_total): colones enteros de 0 a 9 999 999 999.
// Se escriben con separadores de miles opcionales (espacio, punto o coma) en
// grupos de 3, las mismas reglas que "Total gastado" del modo compra; están
// repetidas a propósito para no tocar shopping-list (SPEC §15).
export const COLONES_AMOUNT = {
  MAX: 9_999_999_999,
  PATTERN: /^(\d+|\d{1,3}([ .,]\d{3})+)$/,
  // Con /g: solo para .replace (quita todos). No usarlo con .test, que con /g recuerda dónde quedó entre llamadas.
  THOUSANDS_SEPARATOR: /[ .,]/g,
} as const;

// Tablas, columnas y RPC que usa services/finance.service.ts (SPEC §12).
// purchase_sessions es de SCRUM-67 (016, 018) y no se modifica; spending_budgets
// y set_spending_budget son de la migración 027; get_period_finance,
// set_period_total, set_purchase_session_total y set_spending_time_zone, de la 040.
export const FINANCE_DB = {
  COLUMN: {
    CLOSED_AT: "closed_at",
    ID: "id",
  },
  RPC: {
    GET_PERIOD_FINANCE: "get_period_finance",
    SET_PERIOD_TOTAL: "set_period_total",
    SET_PURCHASE_SESSION_TOTAL: "set_purchase_session_total",
    SET_SPENDING_BUDGET: "set_spending_budget",
    SET_SPENDING_TIME_ZONE: "set_spending_time_zone",
  },
  SELECT: {
    BUDGETS: "period, amount",
    PURCHASES: "id, closed_at, total_amount, stores(display_name)",
    SPENDING: "total_amount",
  },
  TABLE: {
    PURCHASE_SESSIONS: "purchase_sessions",
    SPENDING_BUDGETS: "spending_budgets",
  },
} as const;

// Códigos propios de la 040 (SPEC §7, regla 60). Se reconocen por error.code,
// nunca por el texto: TZ001 falta confirmar una zona; TZ002 la guardada ya no
// la reconoce PostgreSQL. Los dos se resuelven confirmando una zona.
export const TIME_ZONE_ERROR_CODE = {
  MISSING: "TZ001",
  UNRECOGNIZED: "TZ002",
} as const;

// Por qué no se pudo guardar un total (SPEC §7). Cada uno tiene su mensaje;
// GENERAL es "No se pudo guardar el total", para cualquier otro error.
export const TOTAL_SAVE_ERROR = {
  GENERAL: "general",
  NEGATIVE_PERIOD: "negativePeriod",
  PURCHASE_UNAVAILABLE: "purchaseUnavailable",
  TIME_ZONE_MISSING: "timeZoneMissing",
  TIME_ZONE_UNRECOGNIZED: "timeZoneUnrecognized",
} as const;

export type TotalSaveErrorType = (typeof TOTAL_SAVE_ERROR)[keyof typeof TOTAL_SAVE_ERROR];

// El código de la base que corresponde a cada motivo (SPEC §7 y §12). Solo por
// error.code, nunca por el texto ni por el estado HTTP; un código que no está
// acá es GENERAL. En estas RPC, 23514 solo llega por la regla 54.
export const TOTAL_SAVE_ERROR_CODE = {
  [POSTGRES_ERROR_CODE.CHECK_VIOLATION]: TOTAL_SAVE_ERROR.NEGATIVE_PERIOD,
  [POSTGRES_ERROR_CODE.NO_DATA_FOUND]: TOTAL_SAVE_ERROR.PURCHASE_UNAVAILABLE,
  [TIME_ZONE_ERROR_CODE.MISSING]: TOTAL_SAVE_ERROR.TIME_ZONE_MISSING,
  [TIME_ZONE_ERROR_CODE.UNRECOGNIZED]: TOTAL_SAVE_ERROR.TIME_ZONE_UNRECOGNIZED,
} as const satisfies Record<string, TotalSaveErrorType>;

// El mensaje de cada motivo (SPEC §7). Los errores de Supabase nunca se muestran crudos.
export const TOTAL_SAVE_ERROR_MESSAGE = {
  [TOTAL_SAVE_ERROR.GENERAL]: "No se pudo guardar el total. Intenta de nuevo.",
  [TOTAL_SAVE_ERROR.NEGATIVE_PERIOD]:
    "Ese monto dejaría un periodo en negativo. Revisa el total del día, la semana y el mes.",
  [TOTAL_SAVE_ERROR.PURCHASE_UNAVAILABLE]: "Esa compra ya no está disponible. Recarga la lista.",
  [TOTAL_SAVE_ERROR.TIME_ZONE_MISSING]: "Confirma tu zona horaria para guardar este total.",
  [TOTAL_SAVE_ERROR.TIME_ZONE_UNRECOGNIZED]:
    "Tu zona horaria guardada ya no es válida. Confirma tu zona para continuar.",
} as const satisfies Record<TotalSaveErrorType, string>;

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

// Edición de un total en el Historial (SCRUM-91, SPEC §6): un solo campo abierto
// a la vez (D21).
export const TOTAL_EDIT_STATUS = {
  EDITING: "editing",
  SAVE_FAILED: "saveFailed",
  SAVING: "saving",
  VIEWING: "viewing",
} as const;

export type TotalEditStatusType = (typeof TOTAL_EDIT_STATUS)[keyof typeof TOTAL_EDIT_STATUS];

// Qué total se edita: el de una compra (CA-01) o el del periodo en curso (CA-02).
export const TOTAL_EDIT_TARGET = {
  PERIOD: "period",
  PURCHASE: "purchase",
} as const;

export type TotalEditTargetType = (typeof TOTAL_EDIT_TARGET)[keyof typeof TOTAL_EDIT_TARGET];

// Qué es cada fila de la lista del Historial: una compra o un ajuste manual (D16).
export const HISTORY_ROW_KIND = {
  ADJUSTMENT: "adjustment",
  PURCHASE: "purchase",
} as const;

export type HistoryRowKindType = (typeof HISTORY_ROW_KIND)[keyof typeof HISTORY_ROW_KIND];

// El signo de un ajuste, en texto y no solo con color (SPEC §9). El menos es el
// signo tipográfico (U+2212), no el guion.
export const AMOUNT_SIGN = {
  MINUS: "−",
  PLUS: "+",
} as const;

// ----------------------------------------------------------------------------
// Textos (SPEC §7 y §8; propuestos, se ajustan en la revisión).
// ----------------------------------------------------------------------------

// El mismo texto para el presupuesto y para un total editado: las mismas reglas (SPEC §7).
const AMOUNT_INVALID_TEXT = "Escribe el monto en colones, solo números (ej. 50000).";

export const FINANCE_TEXT = {
  // La fila de un ajuste en el Historial (D16) y la indicación del Dashboard (SPEC §8).
  ADJUSTMENT: "Ajuste manual",
  BUDGET_INVALID: AMOUNT_INVALID_TEXT,
  BUDGET_LOAD_ERROR: "No se pudo cargar tu presupuesto. Intenta de nuevo.",
  BUDGET_SAVED: "Presupuesto guardado",
  BUDGET_SAVE_ERROR: "No se pudo guardar tu presupuesto. Intenta de nuevo.",
  CANCEL: "Cancelar",
  CONFIRM_TIME_ZONE: "Confirmar",
  DEFINE_BUDGET: "Definir presupuesto",
  EDIT_BUDGET: "Editar presupuesto",
  // "Editar total del domingo 18 de octubre, MaxiPali" (SPEC §9).
  EDIT_PURCHASE_TOTAL_PREFIX: "Editar total del ",
  EDIT_PURCHASE_TOTAL_SEPARATOR: ", ",
  INCLUDES_ADJUSTMENTS: "Incluye ajustes manuales",
  LOGIN: "Iniciar sesión",
  NO_ACCOUNT: "Inicia sesión con tu cuenta para ver tus finanzas.",
  // "No incluye 1 compra sin total" / "No incluye 2 compras sin total".
  NOT_INCLUDED_PREFIX: "No incluye ",
  OVER_BUDGET_PREFIX: "Te pasaste por ",
  PERIOD_GROUP_LABEL: "Periodo",
  PURCHASES: "Compras",
  PURCHASES_LIST_LABEL: "Compras del periodo",
  PURCHASE_TOTAL_INPUT_LABEL: "Total de la compra (₡)",
  REMAINING_PREFIX: "Te quedan ",
  RETRY: "Reintentar",
  SAVE: "Guardar",
  SAVING: "Guardando…",
  SPENDING_EMPTY: "Todavía no tienes compras cerradas en este periodo.",
  SPENDING_LOAD_ERROR: "No se pudo cargar tu gasto. Intenta de nuevo.",
  STORE_UNAVAILABLE: "Supermercado no disponible",
  TABS_NAV_LABEL: "Secciones de finanzas",
  // "Zona horaria: America/Costa_Rica", junto a "Confirmar" (SPEC §8).
  TIME_ZONE_PREFIX: "Zona horaria: ",
  // Confirmar la zona del navegador hizo que un periodo con ajustes quedara en negativo (SPEC §7).
  TIME_ZONE_REJECTED: "No se puede usar esa zona: dejaría un periodo en negativo. Sigues con tu zona actual.",
  TITLE: "Finanzas",
  TOTAL_INVALID: AMOUNT_INVALID_TEXT,
  TOTAL_SAVED: "Total guardado",
  WITHOUT_TOTAL: "Sin total",
  WITHOUT_TOTAL_PLURAL: "compras sin total",
  WITHOUT_TOTAL_SINGULAR: "compra sin total",
} as const;

// Sub-tabs de Finanzas (DESIGN.md §3.1; SPEC regla 31).
export const FINANCE_TAB = {
  DASHBOARD: "dashboard",
  HISTORY: "history",
} as const;

export type FinanceTabType = (typeof FINANCE_TAB)[keyof typeof FINANCE_TAB];

// Orden en que se dibujan los tabs. Cada uno es un link a su pantalla.
export const FINANCE_TABS = [
  { href: APP_ROUTE.FINANCE, id: FINANCE_TAB.DASHBOARD, label: "Dashboard" },
  { href: APP_ROUTE.FINANCE_HISTORY, id: FINANCE_TAB.HISTORY, label: "Historial" },
] as const satisfies ReadonlyArray<{ href: string; id: FinanceTabType; label: string }>;

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

// El campo del total del periodo en curso (SCRUM-91, SPEC §8).
export const PERIOD_TOTAL_INPUT_LABEL = {
  [SPENDING_PERIOD.DAY]: "Total de hoy (₡)",
  [SPENDING_PERIOD.MONTH]: "Total de este mes (₡)",
  [SPENDING_PERIOD.WEEK]: "Total de esta semana (₡)",
} as const satisfies Record<SpendingPeriodType, string>;

// En qué nivel se escribió un ajuste (regla 52): en la semana puede haber
// ajustes del día y de la semana, y en el mes, de los tres.
export const ADJUSTMENT_SCOPE_LABEL = {
  [SPENDING_PERIOD.DAY]: "Total del día",
  [SPENDING_PERIOD.MONTH]: "Total del mes",
  [SPENDING_PERIOD.WEEK]: "Total de la semana",
} as const satisfies Record<SpendingPeriodType, string>;

// El nombre del lápiz del periodo (SPEC §9).
export const EDIT_PERIOD_TOTAL_LABEL = {
  [SPENDING_PERIOD.DAY]: "Editar total de hoy",
  [SPENDING_PERIOD.MONTH]: "Editar total de este mes",
  [SPENDING_PERIOD.WEEK]: "Editar total de esta semana",
} as const satisfies Record<SpendingPeriodType, string>;

// Fechas del periodo ("Lunes 12 a domingo 18 de octubre"), en español de Costa Rica.
export const PERIOD_RANGE_FORMAT = {
  LOCALE: "es-CR",
  // Une el primer y el último día de una semana.
  RANGE_CONNECTOR: " a ",
  // Une el día con el mes y el mes con el año: "18 de octubre de 2026".
  DATE_CONNECTOR: " de ",
} as const;
