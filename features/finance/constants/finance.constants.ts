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
// set_period_total, set_purchase_session_total y set_spending_time_zone, de la 040;
// get_purchased_products y get_product_purchases, de la 049 (SCRUM-93).
export const FINANCE_DB = {
  COLUMN: {
    CLOSED_AT: "closed_at",
    ID: "id",
    TOTAL_AMOUNT: "total_amount",
  },
  RPC: {
    GET_PERIOD_FINANCE: "get_period_finance",
    GET_PRODUCT_PURCHASES: "get_product_purchases",
    GET_PURCHASED_PRODUCTS: "get_purchased_products",
    SET_PERIOD_TOTAL: "set_period_total",
    SET_PURCHASE_SESSION_TOTAL: "set_purchase_session_total",
    SET_SPENDING_BUDGET: "set_spending_budget",
    SET_SPENDING_TIME_ZONE: "set_spending_time_zone",
  },
  SELECT: {
    BUDGETS: "period, amount",
    PURCHASES: "id, closed_at, total_amount, stores(display_name)",
    TIME_ZONE: "time_zone",
  },
  TABLE: {
    PURCHASE_SESSIONS: "purchase_sessions",
    SPENDING_BUDGETS: "spending_budgets",
    // La zona guardada (040): la vista "Productos" la usa para las fechas del detalle (regla 87).
    SPENDING_TIME_ZONES: "spending_time_zones",
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

// Recordatorio de compras sin total (SCRUM-92, D23): cuenta una compra cerrada
// sin total desde que cumple 24 horas. Es una duración, no un límite de
// calendario, así que no depende de la zona horaria.
// El texto del recordatorio usa las mismas horas, así no se contradicen.
const MS_PER_HOUR = 60 * 60 * 1000;
const PENDING_TOTAL_REMINDER_HOURS = 24;
export const PENDING_TOTAL_REMINDER = {
  AFTER_HOURS: PENDING_TOTAL_REMINDER_HOURS,
  AFTER_MS: PENDING_TOTAL_REMINDER_HOURS * MS_PER_HOUR,
} as const;

// Vista "Productos" del Historial (SCRUM-93, SPEC §12, D35 y D44).
// - PAGE_SIZE: el tamaño fijo de cada bloque. No puede pasar de 50, el tope de
//   page_limit en la 049.
// - MAX_OFFSET: el tope de page_offset en la 049. El cliente no pide más allá.
// - SEARCH_MAX_LENGTH: el tope de search_text en la 049 (D44), en caracteres
//   (code points, como char_length). Lo que pase se recorta sin error (§7).
// - SEARCH_WAIT_MS: la espera después de escribir antes de buscar (plan, "Flujo").
export const PRODUCT_HISTORY = {
  MAX_OFFSET: 10_000,
  PAGE_SIZE: 20,
  SEARCH_MAX_LENGTH: 100,
  SEARCH_WAIT_MS: 300,
} as const;

// Cómo se identifica un producto para pedir su detalle (models/ProductPurchaseTarget.type.ts).
export const PRODUCT_TARGET_KIND = {
  BY_NAME: "byName",
  UNAVAILABLE: "unavailable",
} as const;

export type ProductTargetKindType = (typeof PRODUCT_TARGET_KIND)[keyof typeof PRODUCT_TARGET_KIND];

// Vista "Productos" (SCRUM-93, SPEC §6). Cada una es una unión.
// La lista: el primer bloque o una búsqueda nueva.
export const PRODUCT_LIST_STATUS = {
  EMPTY: "empty",
  FAILED: "failed",
  LOADING: "loading",
  NO_MATCHES: "noMatches",
  READY: "ready",
} as const;

export type ProductListStatusType = (typeof PRODUCT_LIST_STATUS)[keyof typeof PRODUCT_LIST_STATUS];

// "Cargar más": si falla, lo ya cargado se conserva.
export const PRODUCT_MORE_STATUS = {
  IDLE: "idle",
  LOADING_MORE: "loadingMore",
  MORE_FAILED: "moreFailed",
} as const;

export type ProductMoreStatusType = (typeof PRODUCT_MORE_STATUS)[keyof typeof PRODUCT_MORE_STATUS];

// El detalle de un producto. EMPTY: ya no tiene apariciones (regla 90), no es un error.
export const PRODUCT_DETAIL_STATUS = {
  EMPTY: "empty",
  FAILED: "failed",
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
} as const;

export type ProductDetailStatusType = (typeof PRODUCT_DETAIL_STATUS)[keyof typeof PRODUCT_DETAIL_STATUS];

// Las dos vistas del sub-tab Historial (D31). Son links: cada una es su pantalla.
export const HISTORY_VIEW = {
  PRODUCTS: "products",
  PURCHASES: "purchases",
} as const;

export type HistoryViewType = (typeof HISTORY_VIEW)[keyof typeof HISTORY_VIEW];

export const HISTORY_VIEWS = [
  { href: APP_ROUTE.FINANCE_HISTORY, id: HISTORY_VIEW.PURCHASES, label: "Compras" },
  { href: APP_ROUTE.FINANCE_HISTORY_PRODUCTS, id: HISTORY_VIEW.PRODUCTS, label: "Productos" },
] as const satisfies ReadonlyArray<{ href: string; id: HistoryViewType; label: string }>;

// Ids del detalle para aria-controls y aria-labelledby (SPEC §9).
export const PRODUCT_DETAIL_ID = "detalle-producto";
export const PRODUCT_DETAIL_TITLE_ID = `${PRODUCT_DETAIL_ID}-titulo`;

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

// El recordatorio de compras sin total (SCRUM-92, SPEC §6). La sección "Compras
// sin total" usa SPENDING_STATUS.
export const PENDING_REMINDER_STATUS = {
  FAILED: "failed",
  LOADING: "loading",
  NONE: "none",
  PENDING: "pending",
} as const;

export type PendingReminderStatusType = (typeof PENDING_REMINDER_STATUS)[keyof typeof PENDING_REMINDER_STATUS];

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

// En qué lista del Historial se tocó el lápiz de una compra (SCRUM-92, regla 68):
// la misma compra puede estar en el periodo y en "Compras sin total", y el campo
// se abre solo en la fila tocada (D21).
export const PURCHASE_LIST = {
  PENDING: "pending",
  PERIOD: "period",
} as const;

export type PurchaseListType = (typeof PURCHASE_LIST)[keyof typeof PURCHASE_LIST];

// El ancla de la sección "Compras sin total", destino del recordatorio (SCRUM-92).
export const PENDING_SECTION_ID = "compras-sin-total";

// El título de "Gasto por supermercado", que da nombre a la sección y a su lista (SCRUM-72, SPEC §9).
export const STORE_SPENDING_TITLE_ID = "gasto-por-supermercado-titulo";

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
  // La línea del desglose por supermercado cuando suma dos o más ajustes (SCRUM-72, D50).
  ADJUSTMENTS: "Ajustes manuales",
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
  // El recordatorio (SCRUM-92, SPEC §8): "Tienes 1 compra sin total desde hace
  // más de 24 horas" / "Tienes 3 compras sin total desde hace más de 24 horas".
  PENDING_REMINDER_LINK_PLURAL: "Completarlas",
  PENDING_REMINDER_LINK_SINGULAR: "Completarla",
  PENDING_REMINDER_LOAD_ERROR: "No se pudo revisar si tienes compras sin total. Intenta de nuevo.",
  PENDING_REMINDER_PLURAL_SUFFIX: ` compras sin total desde hace más de ${PENDING_TOTAL_REMINDER_HOURS} horas`,
  PENDING_REMINDER_PREFIX: "Tienes ",
  PENDING_REMINDER_SINGULAR_SUFFIX: ` compra sin total desde hace más de ${PENDING_TOTAL_REMINDER_HOURS} horas`,
  PENDING_SECTION_TITLE: "Compras sin total",
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
  // El título de la sección del Dashboard (SCRUM-72, SPEC §8).
  STORE_SPENDING_TITLE: "Gasto por supermercado",
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
  // "1 sin total" / "3 sin total" en una fila del desglose por supermercado (SCRUM-72, D47).
  WITHOUT_TOTAL_COUNT_SUFFIX: " sin total",
  WITHOUT_TOTAL_PLURAL: "compras sin total",
  WITHOUT_TOTAL_SINGULAR: "compra sin total",
} as const;

// Textos de la vista "Productos" (SCRUM-93, SPEC §7 a §9; propuestos, se ajustan en la revisión).
export const PRODUCT_HISTORY_TEXT = {
  // La aclaración de la regla 85: texto visible, no un tooltip.
  AMOUNT_NOTE: "Es el total de cada compra completa, no el precio de este producto.",
  DETAIL_EMPTY: "Este producto ya no aparece en tus compras cerradas.",
  DETAIL_LOADING: "Cargando las compras del producto…",
  DETAIL_LOAD_ERROR: "No se pudieron cargar las compras de este producto. Intenta de nuevo.",
  // "Compras con Leche": el nombre de la lista del detalle.
  DETAIL_LIST_PREFIX: "Compras con ",
  LIST_LABEL: "Productos comprados",
  LOAD_MORE: "Cargar más",
  LOADING: "Cargando productos…",
  LOAD_ERROR: "No se pudieron cargar tus productos. Intenta de nuevo.",
  LOADING_MORE: "Cargando…",
  MORE_ERROR: "No se pudieron cargar más productos. Intenta de nuevo.",
  NAME_COUNT_SEPARATOR: ", ",
  NO_MATCHES: "Sin resultados para esa búsqueda.",
  EMPTY: "Todavía no tienes productos en compras cerradas.",
  // "1 producto" / "12 productos", anunciado en role="status" al buscar (SPEC §9).
  RESULTS_PLURAL_SUFFIX: " productos",
  RESULTS_SINGULAR_SUFFIX: " producto",
  SEARCH_LABEL: "Buscar producto",
  // "1 vez" / "4 veces" (regla 89: veces, no compras).
  TIMES_PLURAL_SUFFIX: " veces",
  TIMES_SINGULAR_SUFFIX: " vez",
  // "Total de la compra: ₡15 000" (regla 85).
  TOTAL_PREFIX: "Total de la compra: ",
  UNAVAILABLE: "Producto no disponible",
  VARIANTS_SEPARATOR: ", ",
  // "1 L, 2 L · 2 veces".
  VARIANTS_TIMES_SEPARATOR: " · ",
  VIEW_NAV_LABEL: "Vista del historial",
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
