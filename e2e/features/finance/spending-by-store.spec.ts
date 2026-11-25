import { expect, test } from "@playwright/test";
import type { Page, Request } from "@playwright/test";
import {
  COLD_START_TEST_TIMEOUT_MS,
  FINANCE_PATH,
  TIME_ZONE,
  fixClock,
  getClosedAtFilters,
  getEditTotalButtons,
  getExactText,
  getPeriodButton,
  getSelect,
  getTotalSection,
  signInAsRegisteredUser,
  stubFinanceSupabase,
  warmUpRoutes,
} from "./finance.helpers";
import type { HistoryRow, SimulatedAdjustment } from "./finance.helpers";

// Escenarios E2E-FIN-24 y 25: features/finance/specs/E2E.md, sección SCRUM-72.
// Validan la INTERFAZ con una sesión y respuestas de Supabase simuladas; no la
// RLS ni get_period_finance real (eso es el QA manual de SPEC §13).
// Los textos se escriben acá a propósito (oráculo independiente del código, playwright-e2e).
const STORE_SPENDING = "Gasto por supermercado";
const WITHOUT_TOTAL = "Sin total";
const ADJUSTMENT = "Ajuste manual";
const ADJUSTMENTS = "Ajustes manuales";
const EMPTY_PERIOD = "Todavía no tienes compras cerradas en este periodo.";
const HISTORY_SELECT = "id,closed_at,total_amount,stores(display_name)";
const WEEK_FILTERS = ["gte.2026-10-12T06:00:00.000Z", "lt.2026-10-19T06:00:00.000Z"];
const DAY_FILTERS = ["gte.2026-10-18T06:00:00.000Z", "lt.2026-10-19T06:00:00.000Z"];
const MONTH_FILTERS = ["gte.2026-10-01T06:00:00.000Z", "lt.2026-11-01T06:00:00.000Z"];

// E2E-FIN-25: todas del domingo 18, el día en curso, para que valgan en Día y en Semana.
const ZONED_ROWS: HistoryRow[] = [
  {
    closed_at: "2026-10-18T20:00:00+00:00",
    id: "00000000-0000-4000-8000-000000000031",
    stores: { display_name: "Walmart" },
    total_amount: 12000,
  },
  {
    closed_at: "2026-10-18T19:00:00+00:00",
    id: "00000000-0000-4000-8000-000000000032",
    stores: { display_name: "MaxiPali" },
    total_amount: 8000,
  },
  {
    closed_at: "2026-10-18T18:00:00+00:00",
    id: "00000000-0000-4000-8000-000000000033",
    stores: { display_name: "MaxiPali" },
    total_amount: null,
  },
  {
    closed_at: "2026-10-18T17:00:00+00:00",
    id: "00000000-0000-4000-8000-000000000034",
    stores: null,
    total_amount: 8000,
  },
  {
    closed_at: "2026-10-18T16:00:00+00:00",
    id: "00000000-0000-4000-8000-000000000035",
    stores: { display_name: "MasXMenos" },
    total_amount: 3000,
  },
];
// Ids distintos de los que crea set_period_total (…a0 a …a2).
const ZONED_ADJUSTMENTS: SimulatedAdjustment[] = [
  { amount: 500, effective_at: "2026-10-18T15:00:00+00:00", id: "00000000-0000-4000-8000-0000000000b0", scope: "day" },
  { amount: -2000, effective_at: "2026-10-18T15:30:00+00:00", id: "00000000-0000-4000-8000-0000000000b1", scope: "week" },
];

// Intl separa los miles con un espacio especial: cada espacio acepta cualquiera.
const exact = (text: string): RegExp => new RegExp(`^${text.replace(/ /gu, "\\s").replace(/\+/gu, "\\+")}$`, "u");

const getStoreSpending = (page: Page) => page.getByRole("region", { name: STORE_SPENDING });
const getStoreRows = (page: Page) => page.getByRole("list", { name: STORE_SPENDING }).getByRole("listitem");
// La línea del ajuste: dentro de la sección, fuera de la lista (D45).
const getAdjustmentLine = (page: Page, label: string) =>
  getStoreSpending(page).locator("div").filter({ has: page.getByText(label, { exact: true }) });

// Las consultas a purchase_sessions, para comprobar que ninguna es la del gasto viejo.
const recordPurchaseReads = (page: Page): Request[] => {
  const requests: Request[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/rest/v1/purchase_sessions")) requests.push(request);
  });
  return requests;
};

test.use({ timezoneId: TIME_ZONE });

test.describe("Finanzas: gasto por supermercado (SCRUM-72)", () => {
  test.describe.configure({ timeout: COLD_START_TEST_TIMEOUT_MS });

  test.beforeAll(async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext({ baseURL });
    await warmUpRoutes(request);
    await request.dispose();
  });

  test.beforeEach(async ({ page }) => {
    await fixClock(page);
  });

  test("E2E-FIN-24 — Desglose sin zona guardada", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page);
    const purchaseReads = recordPurchaseReads(page);
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_PATH);

    // Semana: el total no cambia; Walmart, solo sin total, al final y sin ₡0 (D46).
    await expect(getExactText(getTotalSection(page), "₡15 000")).toBeVisible();
    await expect(getStoreSpending(page).getByRole("heading", { level: 2, name: STORE_SPENDING })).toBeVisible();
    await expect(getStoreRows(page)).toHaveText([
      exact("MaxiPali₡10 000"),
      exact("MasXMenos₡5 000"),
      exact(`Walmart1 sin total${WITHOUT_TOTAL}`),
    ]);
    await expect(getStoreRows(page).nth(2)).not.toContainText("₡");
    // Sin zona no hay ajustes (regla 59).
    await expect(getStoreSpending(page).getByText(ADJUSTMENT, { exact: true })).toHaveCount(0);
    await expect(getStoreSpending(page).getByText(ADJUSTMENTS, { exact: true })).toHaveCount(0);

    // Día.
    await getPeriodButton(page, "Día").click();
    await expect(getExactText(getTotalSection(page), "₡10 000")).toBeVisible();
    await expect(getStoreRows(page)).toHaveText([exact("MaxiPali₡10 000")]);

    // Mes.
    await getPeriodButton(page, "Mes").click();
    await expect(getExactText(getTotalSection(page), "₡35 000")).toBeVisible();
    await expect(getStoreRows(page)).toHaveText([
      exact("MaxiPali₡30 000"),
      exact("MasXMenos₡5 000"),
      exact(`Walmart1 sin total${WITHOUT_TOTAL}`),
    ]);
    await expect(getStoreSpending(page).getByText(ADJUSTMENT, { exact: true })).toHaveCount(0);

    // Una lectura por periodo, la del Historial (regla 107): conteo exacto, límites y sin dueño.
    expect(recorder.historyRequests.map(getClosedAtFilters)).toEqual([WEEK_FILTERS, DAY_FILTERS, MONTH_FILTERS]);
    for (const request of recorder.historyRequests) {
      expect(getSelect(request)).toBe(HISTORY_SELECT);
      expect((await request.allHeaders()).prefer).toContain("count=exact");
      expect(request.url()).not.toContain("owner_id");
    }
    // Ninguna con la consulta vieja del gasto.
    expect(purchaseReads.map(getSelect)).not.toContain("total_amount");
  });

  test("E2E-FIN-24 — Sin sección en un periodo sin compras", async ({ page }) => {
    await stubFinanceSupabase(page, { historyRows: [] });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_PATH);

    await expect(page.getByText(EMPTY_PERIOD, { exact: true })).toBeVisible();
    await expect(getStoreSpending(page)).toHaveCount(0);
  });

  test("E2E-FIN-25 — Desglose con zona guardada y ajustes", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page, {
      adjustments: ZONED_ADJUSTMENTS,
      historyRows: ZONED_ROWS,
      savedTimeZone: TIME_ZONE,
    });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_PATH);

    // Semana: ₡31 000 de compras y −₡1 500 de ajustes (regla 114).
    await expect(getExactText(getTotalSection(page), "₡29 500")).toBeVisible();
    // «Supermercado no disponible» empata con MaxiPali y va después; no queda al final (D49, regla 109).
    const sameList = [
      exact("Walmart₡12 000"),
      exact("MaxiPali1 sin total₡8 000"),
      exact("Supermercado no disponible₡8 000"),
      exact("MasXMenos₡3 000"),
    ];
    await expect(getStoreRows(page)).toHaveText(sameList);
    // Los dos ajustes en una línea, fuera de la lista (D45, D50).
    await expect(getAdjustmentLine(page, ADJUSTMENTS)).toHaveText(exact(`${ADJUSTMENTS}−₡1 500`));
    await expect(getStoreSpending(page).getByText(ADJUSTMENT, { exact: true })).toHaveCount(0);
    await expect(getStoreRows(page).filter({ hasText: /ajuste/iu })).toHaveCount(0);

    // Día: el ajuste de la semana no cuenta (regla 52).
    await getPeriodButton(page, "Día").click();
    await expect(getExactText(getTotalSection(page), "₡31 500")).toBeVisible();
    await expect(getStoreRows(page)).toHaveText(sameList);
    await expect(getAdjustmentLine(page, ADJUSTMENT)).toHaveText(exact(`${ADJUSTMENT}+₡500`));
    await expect(getStoreSpending(page).getByText(ADJUSTMENTS, { exact: true })).toHaveCount(0);

    // Una sola lectura por periodo, get_period_finance, sin leer la tabla de compras.
    expect(recorder.periodFinanceRequests.map((request) => request.postDataJSON())).toEqual([
      { target_scope: "week" },
      { target_scope: "day" },
    ]);
    expect(recorder.historyRequests).toHaveLength(0);
    // Sin edición en el Dashboard (D11).
    await expect(getEditTotalButtons(page)).toHaveCount(0);
  });
});
