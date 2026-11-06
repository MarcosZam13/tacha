import type { APIRequestContext, Locator, Page, Request } from "@playwright/test";
import { PUBLIC_ORIGIN_PATH, buildFakeUser, signInAsFakeUser } from "../../support/fake-session";
import { getAuthStorageKey, getRequiredEnv } from "../../support/supabase";

// Cómo preparar y encontrar las cosas de Finanzas. Sin aserciones: eso es del
// test (playwright-e2e, references/standards.md). Escenarios y datos:
// features/finance/specs/E2E.md.
//
// Todo lo de Supabase se responde desde el test: estos escenarios validan la
// interfaz, NO la autenticación real ni la seguridad de la base (E2E.md).

export const FINANCE_PATH = "/finanzas";
export const FINANCE_HISTORY_PATH = "/finanzas/historial";
export const LIST_PATH = "/lista";
export const LOGIN_PATH = "/login";

// Reloj y zona fijos (E2E.md, "Datos y entorno"): domingo 18 de octubre de
// 2026 a las 15:00 en Costa Rica (UTC-6, sin horario de verano).
export const TIME_ZONE = "America/Costa_Rica";
const FIXED_NOW = new Date("2026-10-18T21:00:00Z");

// Con el servidor de desarrollo en frío, compilar las rutas tarda; como en password-recovery.
export const COLD_START_TEST_TIMEOUT_MS = 90_000;

/** Pide las rutas antes de empezar: compiladas, no hay una recarga en medio del test. */
export const warmUpRoutes = async (request: APIRequestContext): Promise<void> => {
  for (const path of [PUBLIC_ORIGIN_PATH, LIST_PATH, FINANCE_PATH, FINANCE_HISTORY_PATH, LOGIN_PATH]) {
    await request.get(path);
  }
};

/** El reloj del navegador queda fijo en FIXED_NOW (los temporizadores siguen corriendo). */
export const fixClock = async (page: Page): Promise<void> => {
  await page.clock.setFixedTime(FIXED_NOW);
};

/** La sesión registrada simulada de e2e/support (is_anonymous: false). */
export const signInAsRegisteredUser = signInAsFakeUser;

// Misma forma que la sesión de fake-session.ts, con is_anonymous: true.
const FAKE_TOKEN_LIFETIME_SECONDS = 24 * 60 * 60;
const MS_PER_SECOND = 1000;

/** Una sesión anónima simulada (como la que crea ensureSession), guardada en el navegador. */
export const signInAsAnonymousUser = async (page: Page): Promise<void> => {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const session = JSON.stringify({
    access_token: "fake-anonymous-access-token",
    expires_at: Math.floor(Date.now() / MS_PER_SECOND) + FAKE_TOKEN_LIFETIME_SECONDS,
    expires_in: FAKE_TOKEN_LIFETIME_SECONDS,
    refresh_token: "fake-anonymous-refresh-token",
    token_type: "bearer",
    user: { ...buildFakeUser(), email: "", is_anonymous: true },
  });

  await page.goto(PUBLIC_ORIGIN_PATH);
  await page.evaluate(([storageKey, value]) => window.localStorage.setItem(storageKey, value), [
    getAuthStorageKey(supabaseUrl),
    session,
  ]);
};

// ----------------------------------------------------------------------------
// Supabase simulado por ruta (E2E.md, tabla de peticiones).
// ----------------------------------------------------------------------------

// Compras simuladas por periodo, según el inicio pedido (closed_at=gte.…).
const PURCHASES_BY_PERIOD_START: Record<string, { total_amount: number | null }[]> = {
  "2026-10-18T06:00:00.000Z": [{ total_amount: 10000 }],
  "2026-10-12T06:00:00.000Z": [{ total_amount: 10000 }, { total_amount: 5000 }, { total_amount: null }],
  "2026-10-01T06:00:00.000Z": [
    { total_amount: 10000 },
    { total_amount: 5000 },
    { total_amount: null },
    { total_amount: 20000 },
  ],
};

/** Una fila del Historial, como la devuelve la consulta de getPeriodPurchases. */
export interface HistoryRow {
  closed_at: string;
  id: string;
  stores: { display_name: string } | null;
  total_amount: number | null;
}

// Compras del Historial por periodo (E2E.md, E2E-FIN-05), de la más reciente a
// la más antigua. Horas en UTC: 16:00Z son las 10:00 en Costa Rica.
const SUNDAY_ROW: HistoryRow = {
  closed_at: "2026-10-18T16:00:00+00:00",
  id: "00000000-0000-4000-8000-000000000001",
  stores: { display_name: "MaxiPali" },
  total_amount: 10000,
};
const WEDNESDAY_ROW: HistoryRow = {
  closed_at: "2026-10-14T16:00:00+00:00",
  id: "00000000-0000-4000-8000-000000000002",
  stores: { display_name: "Walmart" },
  total_amount: null,
};
const MONDAY_ROW: HistoryRow = {
  closed_at: "2026-10-12T16:00:00+00:00",
  id: "00000000-0000-4000-8000-000000000003",
  stores: { display_name: "MasXMenos" },
  total_amount: 5000,
};
const FIFTH_ROW: HistoryRow = {
  closed_at: "2026-10-05T16:00:00+00:00",
  id: "00000000-0000-4000-8000-000000000004",
  stores: { display_name: "MaxiPali" },
  total_amount: 20000,
};
const HISTORY_ROWS_BY_PERIOD_START: Record<string, HistoryRow[]> = {
  "2026-10-18T06:00:00.000Z": [SUNDAY_ROW],
  "2026-10-12T06:00:00.000Z": [SUNDAY_ROW, WEDNESDAY_ROW, MONDAY_ROW],
  "2026-10-01T06:00:00.000Z": [SUNDAY_ROW, WEDNESDAY_ROW, MONDAY_ROW, FIFTH_ROW],
};

// La consulta del Historial se distingue de la del Dashboard por su select.
const HISTORY_SELECT_COLUMN = "stores(display_name)";

// El conteo exacto que pide { count: "exact" } llega en este header, y el
// navegador solo lo deja leer si está expuesto (como hace PostgREST).
const toContentRangeHeaders = (rowCount: number): Record<string, string> => ({
  "access-control-expose-headers": "content-range",
  "content-range": rowCount === 0 ? "*/0" : `0-${rowCount - 1}/${rowCount}`,
});

const SERVER_ERROR = { code: "XX000", message: "simulated failure" };
const OK_STATUS = 200;
const NO_CONTENT_STATUS = 204;
const BAD_REQUEST_STATUS = 400;
const SERVER_ERROR_STATUS = 500;

// ----------------------------------------------------------------------------
// SCRUM-91: la zona guardada, get_period_finance y las RPC de edición (E2E.md,
// "Datos y entorno" de SCRUM-91). Imitan el contrato de la 040; lo real lo cubre
// la prueba SQL.
// ----------------------------------------------------------------------------

/** Un código de la base, como lo devuelve PostgREST (la app solo mira `code`). */
export interface SimulatedRpcError {
  code: string;
  status: number;
}

export const SIMULATED_RPC_ERROR = {
  NEGATIVE_PERIOD: { code: "23514", status: BAD_REQUEST_STATUS },
  SERVER: { code: SERVER_ERROR.code, status: SERVER_ERROR_STATUS },
} as const satisfies Record<string, SimulatedRpcError>;

const TIME_ZONE_MISSING_ERROR: SimulatedRpcError = { code: "TZ001", status: BAD_REQUEST_STATUS };

const SCOPES = ["day", "week", "month"] as const;
type Scope = (typeof SCOPES)[number];

// Los límites de cada periodo en curso en Costa Rica, con el reloj fijo.
const PERIOD_BOUNDS: Record<Scope, { end: string; start: string }> = {
  day: { end: "2026-10-19T06:00:00.000Z", start: "2026-10-18T06:00:00.000Z" },
  month: { end: "2026-11-01T06:00:00.000Z", start: "2026-10-01T06:00:00.000Z" },
  week: { end: "2026-10-19T06:00:00.000Z", start: "2026-10-12T06:00:00.000Z" },
};

interface SimulatedAdjustment {
  amount: number;
  effective_at: string;
  id: string;
  scope: Scope;
}

const isScope = (value: string): value is Scope => (SCOPES as readonly string[]).includes(value);

// Regla 52: un ajuste cuenta en su nivel y en los mayores.
const countsIn = (adjustmentScope: Scope, periodScope: Scope): boolean =>
  SCOPES.indexOf(adjustmentScope) <= SCOPES.indexOf(periodScope);

const sum = (amounts: number[]): number => amounts.reduce((total, amount) => total + amount, 0);

const toRpcError = ({ code, status }: SimulatedRpcError) => ({
  json: { code, details: null, hint: null, message: "simulated" },
  status,
});

export interface FinanceStubOptions {
  /** Los presupuestos guardados al empezar, por periodo. */
  budgets?: Partial<Record<Scope, number>>;
  /** Cuántas veces seguidas falla la consulta de compras antes de responder bien. */
  failSpendingTimes?: number;
  /** Si la lectura de presupuestos falla siempre. */
  failBudgets?: boolean;
  /** Si guardar un presupuesto falla siempre. */
  failSave?: boolean;
  /** Cuántas veces seguidas falla la consulta del Historial antes de responder bien. */
  failHistoryTimes?: number;
  /** Las filas del Historial, en lugar de las de cada periodo. */
  historyRows?: HistoryRow[];
  /** La consulta del Historial no responde hasta que esta promesa termina. */
  historyGate?: Promise<void>;
  /** Errores, uno por llamada, de set_period_total antes de responder bien. */
  periodTotalErrors?: SimulatedRpcError[];
  /** Errores, uno por llamada, de set_purchase_session_total antes de responder bien. */
  purchaseTotalErrors?: SimulatedRpcError[];
  /** La zona guardada al empezar. Sin ella, get_period_finance responde sin zona (regla 59). */
  savedTimeZone?: string;
}

/** Lo que la pantalla le pidió a Supabase, para comprobarlo en el test. */
export interface FinanceStubRecorder {
  budgetRequests: Request[];
  historyRequests: Request[];
  periodFinanceRequests: Request[];
  /** set_purchase_session_total y set_period_total. */
  totalRequests: Request[];
  rpcRequests: Request[];
  spendingRequests: Request[];
  timeZoneRequests: Request[];
}

/**
 * Responde desde el test todas las llamadas a Supabase. Va antes de abrir la
 * página. Los presupuestos, los totales, los ajustes y la zona guardados con
 * las RPC se recuerdan para la siguiente lectura.
 */
export const stubFinanceSupabase = async (
  page: Page,
  options: FinanceStubOptions = {},
): Promise<FinanceStubRecorder> => {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const recorder: FinanceStubRecorder = {
    budgetRequests: [],
    historyRequests: [],
    periodFinanceRequests: [],
    rpcRequests: [],
    spendingRequests: [],
    timeZoneRequests: [],
    totalRequests: [],
  };
  const savedBudgets = new Map<string, number>(Object.entries(options.budgets ?? {}));
  const savedPurchaseTotals = new Map<string, number>();
  let adjustments: SimulatedAdjustment[] = [];
  let savedTimeZone: string | null = options.savedTimeZone ?? null;
  let spendingFailuresLeft = options.failSpendingTimes ?? 0;
  let historyFailuresLeft = options.failHistoryTimes ?? 0;
  const purchaseTotalErrors = [...(options.purchaseTotalErrors ?? [])];
  const periodTotalErrors = [...(options.periodTotalErrors ?? [])];

  // Las compras del periodo, con los totales editados.
  const getPeriodRows = (scope: Scope): HistoryRow[] =>
    (options.historyRows ?? HISTORY_ROWS_BY_PERIOD_START[PERIOD_BOUNDS[scope].start] ?? []).map((row) => ({
      ...row,
      total_amount: savedPurchaseTotals.get(row.id) ?? row.total_amount,
    }));
  const getCountingAdjustments = (scope: Scope): SimulatedAdjustment[] =>
    adjustments.filter((adjustment) => countsIn(adjustment.scope, scope));
  const getPurchasesTotal = (scope: Scope): number =>
    sum(getPeriodRows(scope).flatMap((row) => (row.total_amount === null ? [] : [row.total_amount])));

  const toPeriodFinance = (scope: Scope) => {
    if (savedTimeZone === null) {
      return {
        adjustment_count: 0,
        adjustments: [],
        closed_count: 0,
        period_end: null,
        period_start: null,
        purchases: [],
        time_zone: null,
        total: null,
        without_total_count: 0,
      };
    }
    const rows = getPeriodRows(scope);
    const countingAdjustments = getCountingAdjustments(scope);
    return {
      adjustment_count: countingAdjustments.length,
      adjustments: countingAdjustments,
      closed_count: rows.filter((row) => row.total_amount !== null).length,
      period_end: PERIOD_BOUNDS[scope].end,
      period_start: PERIOD_BOUNDS[scope].start,
      purchases: rows.map((row) => ({
        closed_at: row.closed_at,
        id: row.id,
        store_name: row.stores?.display_name ?? null,
        total_amount: row.total_amount,
      })),
      time_zone: savedTimeZone,
      total: getPurchasesTotal(scope) + sum(countingAdjustments.map((adjustment) => adjustment.amount)),
      without_total_count: rows.filter((row) => row.total_amount === null).length,
    };
  };

  // Regla 50 y 51: la diferencia la calcula la base; uno por periodo; 0 lo quita.
  const savePeriodTotal = (scope: Scope, total: number): SimulatedAdjustment[] => {
    const previous = adjustments.find((adjustment) => adjustment.scope === scope);
    const others = adjustments.filter((adjustment) => adjustment.scope !== scope);
    const difference =
      total - getPurchasesTotal(scope) - sum(others.filter((other) => countsIn(other.scope, scope)).map((other) => other.amount));
    if (difference === 0) {
      adjustments = others;
      return [];
    }
    const saved: SimulatedAdjustment = {
      amount: difference,
      effective_at: previous?.effective_at ?? FIXED_NOW.toISOString(),
      id: previous?.id ?? `00000000-0000-4000-8000-0000000000a${SCOPES.indexOf(scope)}`,
      scope,
    };
    adjustments = [...others, saved];
    return [saved];
  };

  await page.route(`${supabaseUrl}/**`, async (route) => {
    const request = route.request();
    const { pathname, searchParams } = new URL(request.url());

    if (pathname.endsWith("/rest/v1/purchase_sessions") && searchParams.get("select")?.includes(HISTORY_SELECT_COLUMN)) {
      recorder.historyRequests.push(request);
      await options.historyGate;
      if (historyFailuresLeft > 0) {
        historyFailuresLeft -= 1;
        return route.fulfill({ json: SERVER_ERROR, status: SERVER_ERROR_STATUS });
      }
      const periodStart = searchParams.getAll("closed_at").find((filter) => filter.startsWith("gte."))?.slice(4) ?? "";
      const rows = options.historyRows ?? HISTORY_ROWS_BY_PERIOD_START[periodStart] ?? [];
      return route.fulfill({ headers: toContentRangeHeaders(rows.length), json: rows, status: OK_STATUS });
    }

    if (pathname.endsWith("/rest/v1/purchase_sessions")) {
      recorder.spendingRequests.push(request);
      if (spendingFailuresLeft > 0) {
        spendingFailuresLeft -= 1;
        return route.fulfill({ json: SERVER_ERROR, status: SERVER_ERROR_STATUS });
      }
      const periodStart = searchParams.getAll("closed_at").find((filter) => filter.startsWith("gte."))?.slice(4) ?? "";
      const rows = PURCHASES_BY_PERIOD_START[periodStart] ?? [];
      // D19: el gasto también pide el conteo exacto.
      return route.fulfill({ headers: toContentRangeHeaders(rows.length), json: rows, status: OK_STATUS });
    }

    if (pathname.endsWith("/rest/v1/spending_budgets")) {
      recorder.budgetRequests.push(request);
      if (options.failBudgets) return route.fulfill({ json: SERVER_ERROR, status: SERVER_ERROR_STATUS });
      const rows = [...savedBudgets].map(([period, amount]) => ({ amount, period }));
      return route.fulfill({ json: rows, status: OK_STATUS });
    }

    if (pathname.endsWith("/rest/v1/rpc/set_spending_budget")) {
      recorder.rpcRequests.push(request);
      if (options.failSave) return route.fulfill({ json: SERVER_ERROR, status: SERVER_ERROR_STATUS });
      const { budget_amount: amount, budget_period: period } = request.postDataJSON() as {
        budget_amount: number;
        budget_period: string;
      };
      savedBudgets.set(period, amount);
      return route.fulfill({ json: { amount, owner_id: buildFakeUser().id, period }, status: OK_STATUS });
    }

    if (pathname.endsWith("/rest/v1/rpc/get_period_finance")) {
      recorder.periodFinanceRequests.push(request);
      const { target_scope: scope } = request.postDataJSON() as { target_scope: string };
      if (!isScope(scope)) return route.fulfill(toRpcError({ code: "22023", status: BAD_REQUEST_STATUS }));
      return route.fulfill({ json: toPeriodFinance(scope), status: OK_STATUS });
    }

    if (pathname.endsWith("/rest/v1/rpc/set_spending_time_zone")) {
      recorder.timeZoneRequests.push(request);
      const { new_time_zone: timeZone } = request.postDataJSON() as { new_time_zone: string };
      savedTimeZone = timeZone;
      return route.fulfill({ json: { owner_id: buildFakeUser().id, time_zone: timeZone }, status: OK_STATUS });
    }

    if (pathname.endsWith("/rest/v1/rpc/set_purchase_session_total")) {
      recorder.totalRequests.push(request);
      if (savedTimeZone === null) return route.fulfill(toRpcError(TIME_ZONE_MISSING_ERROR));
      const nextError = purchaseTotalErrors.shift();
      if (nextError) return route.fulfill(toRpcError(nextError));
      const { new_total: total, target_session_id: purchaseId } = request.postDataJSON() as {
        new_total: number;
        target_session_id: string;
      };
      const row = Object.values(HISTORY_ROWS_BY_PERIOD_START).flat().find((candidate) => candidate.id === purchaseId);
      if (!row) return route.fulfill(toRpcError({ code: "P0002", status: SERVER_ERROR_STATUS }));
      savedPurchaseTotals.set(purchaseId, total);
      return route.fulfill({
        json: {
          closed_at: row.closed_at,
          household_id: null,
          id: row.id,
          list_id: null,
          owner_id: buildFakeUser().id,
          started_at: row.closed_at,
          store_id: "00000000-0000-4000-8000-0000000000f1",
          total_amount: total,
        },
        status: OK_STATUS,
      });
    }

    if (pathname.endsWith("/rest/v1/rpc/set_period_total")) {
      recorder.totalRequests.push(request);
      if (savedTimeZone === null) return route.fulfill(toRpcError(TIME_ZONE_MISSING_ERROR));
      const nextError = periodTotalErrors.shift();
      if (nextError) return route.fulfill(toRpcError(nextError));
      const { target_scope: scope, target_total: total } = request.postDataJSON() as {
        target_scope: string;
        target_total: number;
      };
      if (!isScope(scope)) return route.fulfill(toRpcError({ code: "22023", status: BAD_REQUEST_STATUS }));
      const saved = savePeriodTotal(scope, total).map((adjustment) => ({ ...adjustment, owner_id: buildFakeUser().id }));
      return route.fulfill({ json: saved, status: OK_STATUS });
    }

    if (pathname.endsWith("/auth/v1/logout")) return route.fulfill({ status: NO_CONTENT_STATUS });

    return route.fulfill({ json: [], status: OK_STATUS });
  });

  return recorder;
};

/** Los filtros de closed_at de una petición de compras: [gte, lt]. */
export const getClosedAtFilters = (request: Request): string[] =>
  new URL(request.url()).searchParams.getAll("closed_at");

/** El select de una petición, ya decodificado. */
export const getSelect = (request: Request): string | null => new URL(request.url()).searchParams.get("select");

// ----------------------------------------------------------------------------
// Localizadores.
// ----------------------------------------------------------------------------

const APP_NAV_NAME = "Secciones de la app";
const FINANCE_TABS_NAME = "Secciones de finanzas";
const PURCHASES_LIST_NAME = "Compras del periodo";
const PRICE_DISCLAIMER_NAME = "Precios estimados";

/** La navegación del shell que se ve en este ancho (sidebar en desktop, tabs en mobile). */
export const getVisibleAppNav = (page: Page): Locator =>
  page.getByRole("navigation", { name: APP_NAV_NAME }).filter({ visible: true });

export const getFinanceTabs = (page: Page): Locator => page.getByRole("navigation", { name: FINANCE_TABS_NAME });

export const getFinanceTab = (page: Page, name: string): Locator => getFinanceTabs(page).getByRole("link", { name });

export const getPurchaseList = (page: Page): Locator => page.getByRole("list", { name: PURCHASES_LIST_NAME });

export const getPurchaseRows = (page: Page): Locator => getPurchaseList(page).getByRole("listitem");

export const getPriceDisclaimer = (page: Page): Locator =>
  page.getByRole("complementary", { name: PRICE_DISCLAIMER_NAME });

/** El lápiz de un total, por su nombre propio (SCRUM-91, SPEC §9). */
export const getEditTotalButton = (page: Page, name: string): Locator => page.getByRole("button", { name, exact: true });

/** Los lápices de total que se ven, de compras y del periodo. */
export const getEditTotalButtons = (page: Page): Locator => page.getByRole("button", { name: /^Editar total/u });

/** El campo abierto de un total, por su etiqueta. */
export const getTotalInput = (page: Page, label: string): Locator => page.getByRole("textbox", { name: label });

/** El bloque del total del periodo, con sus contadores. */
export const getTotalSection = (page: Page): Locator => page.locator("section").filter({ hasText: "Gastado" });

/** true si la página se puede desplazar a los lados en este ancho. */
export const hasHorizontalOverflow = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

export const getPeriodGroup = (page: Page): Locator => page.getByRole("group", { name: "Periodo" });

export const getPeriodButton = (page: Page, label: string): Locator =>
  getPeriodGroup(page).getByRole("button", { name: label });

/** La zona que anuncia el total y "Presupuesto guardado" (la del Spinner no tiene aria-live). */
export const getStatusRegion = (page: Page): Locator => page.locator('[role="status"][aria-live="polite"]');

/**
 * Un texto con montos. Intl separa los miles con un espacio especial, así que
 * cada espacio del texto acepta cualquier espacio.
 */
export const getExactText = (page: Page, text: string): Locator =>
  page.getByText(new RegExp(`^${text.replace(/ /gu, "\\s")}$`, "u"));
