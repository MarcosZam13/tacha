import { expect, test } from "@playwright/test";
import {
  COLD_START_TEST_TIMEOUT_MS,
  FINANCE_HISTORY_PATH,
  FINANCE_PATH,
  LOGIN_PATH,
  TIME_ZONE,
  fixClock,
  getClosedAtFilters,
  getExactText,
  getFinanceTab,
  getFinanceTabs,
  getPeriodButton,
  getPeriodGroup,
  getPriceDisclaimer,
  getPurchaseList,
  getPurchaseRows,
  getSelect,
  getStatusRegion,
  getTotalSection,
  getVisibleAppNav,
  hasHorizontalOverflow,
  signInAsAnonymousUser,
  signInAsRegisteredUser,
  stubFinanceSupabase,
  warmUpRoutes,
} from "./finance.helpers";
import type { HistoryRow } from "./finance.helpers";

// Escenarios: features/finance/specs/E2E.md. Validan la INTERFAZ con una sesión
// y respuestas de Supabase simuladas; no la autenticación real, ni la consulta
// real a stores, ni la seguridad de la base (eso son las pruebas manuales).
// Comprobar que no hay desborde lateral no reemplaza mirar la pantalla.
// Los textos se escriben acá a propósito (oráculo independiente del código, playwright-e2e).
const HISTORY_SELECT = "id,closed_at,total_amount,stores(display_name)";
const HISTORY_ORDER = "closed_at.desc,id.asc";
const WEEK_FILTERS = ["gte.2026-10-12T06:00:00.000Z", "lt.2026-10-19T06:00:00.000Z"];
const NO_ACCOUNT_MESSAGE = "Inicia sesión con tu cuenta para ver tus finanzas.";
const EMPTY_MESSAGE = "Todavía no tienes compras cerradas en este periodo.";
const LOAD_ERROR_MESSAGE = "No se pudo cargar tu gasto. Intenta de nuevo.";

const buildRow = (overrides: Partial<HistoryRow>): HistoryRow => ({
  closed_at: "2026-10-18T16:00:00+00:00",
  id: "00000000-0000-4000-8000-000000000010",
  stores: { display_name: "MaxiPali" },
  total_amount: 10000,
  ...overrides,
});

test.use({ timezoneId: TIME_ZONE });

test.describe("Finanzas: Historial", () => {
  test.describe.configure({ timeout: COLD_START_TEST_TIMEOUT_MS });

  test.beforeAll(async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext({ baseURL });
    await warmUpRoutes(request);
    await request.dispose();
  });

  test.beforeEach(async ({ page }) => {
    await fixClock(page);
  });

  test("E2E-FIN-05 — Ver el historial y filtrarlo por periodo", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page);
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_PATH);

    await getFinanceTab(page, "Historial").click();

    await expect(page).toHaveURL(FINANCE_HISTORY_PATH);
    await expect(getFinanceTab(page, "Historial")).toHaveAttribute("aria-current", "page");
    await expect(getFinanceTab(page, "Dashboard")).not.toHaveAttribute("aria-current");
    await expect(getVisibleAppNav(page).getByRole("link", { name: "Finanzas" })).toHaveAttribute("aria-current", "page");
    await expect(getPeriodButton(page, "Semana")).toHaveAttribute("aria-pressed", "true");

    // Semana: la lista y el total, en el orden de la tabla de E2E.md.
    await expect(page.getByText("Gastado esta semana", { exact: true })).toBeVisible();
    await expect(getExactText(page, "₡15 000")).toBeVisible();
    await expect(getPurchaseRows(page)).toHaveCount(3);
    await expect(getPurchaseRows(page).nth(0)).toHaveText(/Domingo 18 de octubre.*MaxiPali.*₡10\s000/u);
    await expect(getPurchaseRows(page).nth(1)).toHaveText(/Miércoles 14 de octubre.*Walmart.*Sin total/u);
    await expect(getPurchaseRows(page).nth(2)).toHaveText(/Lunes 12 de octubre.*MasXMenos.*₡5\s000/u);
    await expect(getTotalSection(page).getByText("Compras", { exact: true }).locator("..")).toContainText("2");
    await expect(getTotalSection(page).getByText("Sin total", { exact: true }).locator("..")).toContainText("1");
    await expect(getPriceDisclaimer(page)).toHaveCount(1);

    // La petición: conteo exacto, límites y orden, sin filtrar por dueño.
    const weekRequest = recorder.historyRequests[0];
    expect(getSelect(weekRequest)).toBe(HISTORY_SELECT);
    expect(getClosedAtFilters(weekRequest)).toEqual(WEEK_FILTERS);
    expect(new URL(weekRequest.url()).searchParams.get("order")).toBe(HISTORY_ORDER);
    expect((await weekRequest.allHeaders()).prefer).toContain("count=exact");
    expect(weekRequest.url()).not.toContain("owner_id");

    // Día.
    await getPeriodButton(page, "Día").click();
    await expect(page.getByText("Gastado hoy", { exact: true })).toBeVisible();
    await expect(getPurchaseRows(page)).toHaveCount(1);
    await expect(getTotalSection(page)).toContainText(/₡10\s000/u);
    await expect(getStatusRegion(page)).toHaveText(/^Gastado hoy: ₡10\s000$/u);

    // Mes, sin navegar.
    await getPeriodButton(page, "Mes").click();
    await expect(page.getByText("Gastado este mes", { exact: true })).toBeVisible();
    await expect(getPurchaseRows(page)).toHaveCount(4);
    await expect(getExactText(page, "₡35 000")).toBeVisible();
    await expect(getStatusRegion(page)).toHaveText(/^Gastado este mes: ₡35\s000$/u);
    await expect(page).toHaveURL(FINANCE_HISTORY_PATH);
    await expect(getPriceDisclaimer(page)).toHaveCount(1);
    expect(await hasHorizontalOverflow(page)).toBe(false);

    // D9: cada tab arranca en Semana.
    await getFinanceTab(page, "Dashboard").click();
    await expect(page).toHaveURL(FINANCE_PATH);
    await expect(getPeriodButton(page, "Semana")).toHaveAttribute("aria-pressed", "true");
    await getFinanceTab(page, "Historial").click();
    await expect(page).toHaveURL(FINANCE_HISTORY_PATH);
    await expect(getPeriodButton(page, "Semana")).toHaveAttribute("aria-pressed", "true");
    await expect(getPurchaseRows(page)).toHaveCount(3);
  });

  test("E2E-FIN-06 — «Sin total», total de ₡0 y supermercado no disponible", async ({ page }) => {
    await stubFinanceSupabase(page, {
      historyRows: [
        buildRow({ id: "00000000-0000-4000-8000-000000000011", total_amount: null }),
        buildRow({
          closed_at: "2026-10-14T16:00:00+00:00",
          id: "00000000-0000-4000-8000-000000000012",
          stores: null,
          total_amount: 0,
        }),
      ],
    });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_HISTORY_PATH);

    await expect(getPurchaseRows(page)).toHaveCount(2);
    const withoutTotalRow = getPurchaseRows(page).nth(0);
    await expect(withoutTotalRow).toContainText("Sin total");
    await expect(withoutTotalRow).not.toContainText("₡0");
    const zeroRow = getPurchaseRows(page).nth(1);
    await expect(zeroRow).toContainText("₡0");
    await expect(zeroRow).toContainText("Supermercado no disponible");
    await expect(zeroRow).toContainText("Miércoles 14 de octubre");

    await expect(getTotalSection(page).getByText("₡0", { exact: true })).toBeVisible();
    await expect(getTotalSection(page).getByText("Compras", { exact: true }).locator("..")).toContainText("1");
    await expect(getTotalSection(page).getByText("Sin total", { exact: true }).locator("..")).toContainText("1");
    await expect(page.getByText(EMPTY_MESSAGE, { exact: true })).toHaveCount(0);
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test("E2E-FIN-07 — Carga, con el aviso de precios", async ({ page }) => {
    let releaseHistory: () => void = () => undefined;
    const historyGate = new Promise<void>((resolve) => {
      releaseHistory = resolve;
    });
    await stubFinanceSupabase(page, { historyGate });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_HISTORY_PATH);

    await expect(getPeriodGroup(page)).toBeVisible();
    await expect(getTotalSection(page)).toHaveCount(0);
    await expect(page.getByRole("status", { name: "Gastado esta semana" })).toBeVisible();
    await expect(getPriceDisclaimer(page)).toHaveCount(1);
    await expect(getPurchaseList(page)).toHaveCount(0);
    expect(await hasHorizontalOverflow(page)).toBe(false);

    releaseHistory();

    await expect(getPurchaseRows(page)).toHaveCount(3);
    await expect(getPriceDisclaimer(page)).toHaveCount(1);
  });

  test("E2E-FIN-07 — Vacío, con el aviso de precios", async ({ page }) => {
    await stubFinanceSupabase(page, { historyRows: [] });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_HISTORY_PATH);

    await expect(page.getByText(EMPTY_MESSAGE, { exact: true })).toBeVisible();
    await expect(getTotalSection(page).getByText("₡0", { exact: true })).toBeVisible();
    await expect(getPurchaseList(page)).toHaveCount(0);
    await expect(getPriceDisclaimer(page)).toHaveCount(1);
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test("E2E-FIN-07 — Error y reintento, con el aviso de precios", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page, { failHistoryTimes: 1 });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_HISTORY_PATH);

    await expect(page.getByText(LOAD_ERROR_MESSAGE, { exact: true })).toBeVisible();
    await expect(getPurchaseList(page)).toHaveCount(0);
    await expect(getPriceDisclaimer(page)).toHaveCount(1);

    await page.getByRole("button", { name: "Reintentar" }).click();

    await expect(getExactText(page, "₡15 000")).toBeVisible();
    await expect(getPurchaseRows(page)).toHaveCount(3);
    await expect(page.getByText(LOAD_ERROR_MESSAGE, { exact: true })).toHaveCount(0);
    expect(getClosedAtFilters(recorder.historyRequests.at(-1)!)).toEqual(WEEK_FILTERS);
  });

  test("E2E-FIN-08 — Sin sesión no se ve ni se pide nada", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page);
    await page.goto(FINANCE_HISTORY_PATH);

    await expect(page.getByText(NO_ACCOUNT_MESSAGE, { exact: true })).toBeVisible();
    await expect(getFinanceTabs(page)).toHaveCount(0);
    await expect(getPeriodGroup(page)).toHaveCount(0);
    await expect(getPurchaseList(page)).toHaveCount(0);
    expect(recorder.historyRequests).toHaveLength(0);
    expect(recorder.spendingRequests).toHaveLength(0);
    expect(recorder.periodFinanceRequests).toHaveLength(0);

    await page.getByRole("link", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(LOGIN_PATH);
  });

  test("E2E-FIN-08 — Con sesión anónima no se ve ni se pide nada", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page);
    await signInAsAnonymousUser(page);
    await page.goto(FINANCE_HISTORY_PATH);

    await expect(page.getByText(NO_ACCOUNT_MESSAGE, { exact: true })).toBeVisible();
    await expect(getFinanceTabs(page)).toHaveCount(0);
    await expect(getPeriodGroup(page)).toHaveCount(0);
    await expect(getPurchaseList(page)).toHaveCount(0);
    expect(recorder.historyRequests).toHaveLength(0);
    expect(recorder.spendingRequests).toHaveLength(0);
    expect(recorder.periodFinanceRequests).toHaveLength(0);
  });
});
