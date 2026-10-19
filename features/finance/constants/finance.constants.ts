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

// Los montos de purchase_sessions.total_amount tienen centavos (numeric(12, 2)):
// se suman en centavos enteros para no arrastrar errores de punto flotante.
export const CENTS_PER_COLON = 100;

// Fechas del periodo ("Lunes 12 a domingo 18 de octubre"), en español de Costa Rica.
export const PERIOD_RANGE_FORMAT = {
  LOCALE: "es-CR",
  // Une el primer y el último día de una semana.
  RANGE_CONNECTOR: " a ",
  // Une el día con el mes y el mes con el año: "18 de octubre de 2026".
  DATE_CONNECTOR: " de ",
} as const;
