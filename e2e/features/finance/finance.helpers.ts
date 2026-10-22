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
  for (const path of [PUBLIC_ORIGIN_PATH, LIST_PATH, FINANCE_PATH, LOGIN_PATH]) {
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

const SERVER_ERROR = { code: "XX000", message: "simulated failure" };
const OK_STATUS = 200;
const NO_CONTENT_STATUS = 204;
const SERVER_ERROR_STATUS = 500;

export interface FinanceStubOptions {
  /** Cuántas veces seguidas falla la consulta de compras antes de responder bien. */
  failSpendingTimes?: number;
  /** Si la lectura de presupuestos falla siempre. */
  failBudgets?: boolean;
  /** Si guardar un presupuesto falla siempre. */
  failSave?: boolean;
}

/** Lo que la pantalla le pidió a Supabase, para comprobarlo en el test. */
export interface FinanceStubRecorder {
  budgetRequests: Request[];
  rpcRequests: Request[];
  spendingRequests: Request[];
}

/**
 * Responde desde el test todas las llamadas a Supabase. Va antes de abrir la
 * página. Los presupuestos guardados con la RPC se recuerdan para la
 * siguiente lectura (así se puede recargar y verlos).
 */
export const stubFinanceSupabase = async (
  page: Page,
  options: FinanceStubOptions = {},
): Promise<FinanceStubRecorder> => {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const recorder: FinanceStubRecorder = { budgetRequests: [], rpcRequests: [], spendingRequests: [] };
  const savedBudgets = new Map<string, number>();
  let spendingFailuresLeft = options.failSpendingTimes ?? 0;

  await page.route(`${supabaseUrl}/**`, (route) => {
    const request = route.request();
    const { pathname, searchParams } = new URL(request.url());

    if (pathname.endsWith("/rest/v1/purchase_sessions")) {
      recorder.spendingRequests.push(request);
      if (spendingFailuresLeft > 0) {
        spendingFailuresLeft -= 1;
        return route.fulfill({ json: SERVER_ERROR, status: SERVER_ERROR_STATUS });
      }
      const periodStart = searchParams.getAll("closed_at").find((filter) => filter.startsWith("gte."))?.slice(4) ?? "";
      return route.fulfill({ json: PURCHASES_BY_PERIOD_START[periodStart] ?? [], status: OK_STATUS });
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

/** La navegación del shell que se ve en este ancho (sidebar en desktop, tabs en mobile). */
export const getVisibleAppNav = (page: Page): Locator =>
  page.getByRole("navigation", { name: APP_NAV_NAME }).filter({ visible: true });

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
