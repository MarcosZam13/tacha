import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  COLD_START_TEST_TIMEOUT_MS,
  FINANCE_HISTORY_PATH,
  PENDING_ROWS,
  TIME_ZONE,
  fixClock,
  getEditTotalButtons,
  getExactText,
  getFinanceTab,
  getPurchaseRows,
  getTotalInput,
  getTotalSection,
  signInAsRegisteredUser,
  stubFinanceSupabase,
  warmUpRoutes,
} from "./finance.helpers";
import type { HistoryRow } from "./finance.helpers";

// Escenarios E2E-FIN-15 a 18: features/finance/specs/E2E.md, sección SCRUM-92.
// Validan la INTERFAZ con una sesión y respuestas de Supabase simuladas; no la
// RLS, ni la RPC real, ni el contraste medido (eso es manual, SPEC D27).
// Los textos se escriben acá a propósito (oráculo independiente del código, playwright-e2e).
const PENDING_SECTION = "Compras sin total";
const WITHOUT_TOTAL = "Sin total";
const PURCHASE_INPUT = "Total de la compra (₡)";
const ONE_PENDING = "Tienes 1 compra sin total desde hace más de 24 horas";
const TWO_PENDING = "Tienes 2 compras sin total desde hace más de 24 horas";
const LOAD_ERROR = "No se pudo revisar si tienes compras sin total. Intenta de nuevo.";
const LAST_MONTH_PENCIL = "Editar total del domingo 20 de septiembre, Walmart";
const FOUR_DAYS_PENCIL = "Editar total del miércoles 14 de octubre, Walmart";
// La clase del texto terracota de contraste AA (SPEC D27); el color se mide a mano.
const BADGE_TEXT_CLASS = /text-tacha-terracotta-text/u;

// La semana de E2E-FIN-05 más una compra de ₡0.
const ZERO_ROW: HistoryRow = {
  closed_at: "2026-10-16T16:00:00+00:00",
  id: "00000000-0000-4000-8000-000000000020",
  stores: { display_name: "MasXMenos" },
  total_amount: 0,
};
const WEEK_WITH_ZERO: HistoryRow[] = [
  {
    closed_at: "2026-10-18T16:00:00+00:00",
    id: "00000000-0000-4000-8000-000000000001",
    stores: { display_name: "MaxiPali" },
    total_amount: 10000,
  },
  ZERO_ROW,
  PENDING_ROWS.FOUR_DAYS,
];

const getPendingSection = (page: Page) => page.getByRole("region", { name: PENDING_SECTION });
const getPendingRows = (page: Page) => page.getByRole("list", { name: PENDING_SECTION }).getByRole("listitem");
const getCounter = (page: Page, label: string) =>
  getTotalSection(page).getByText(label, { exact: true }).locator("..");
// Next.js agrega su propio role="alert" (el anunciador de rutas): se busca por el texto.
const getAlert = (page: Page, message: string) => page.getByRole("alert").filter({ hasText: message });

test.use({ timezoneId: TIME_ZONE });

test.describe("Finanzas: compras sin total (SCRUM-92)", () => {
  test.describe.configure({ timeout: COLD_START_TEST_TIMEOUT_MS });

  test.beforeAll(async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext({ baseURL });
    await warmUpRoutes(request);
    await request.dispose();
  });

  test.beforeEach(async ({ page }) => {
    await fixClock(page);
  });

  test("E2E-FIN-15 — Badge «Sin total»", async ({ page }) => {
    await stubFinanceSupabase(page, { historyRows: WEEK_WITH_ZERO });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_HISTORY_PATH);

    const walmartRow = getPurchaseRows(page).filter({ hasText: "Walmart" });
    const badge = walmartRow.getByText(WITHOUT_TOTAL, { exact: true });
    await expect(badge).toBeVisible();
    await expect(badge).toHaveClass(BADGE_TEXT_CLASS);
    await expect(page.getByRole("alert").filter({ hasText: WITHOUT_TOTAL })).toHaveCount(0);
    await expect(walmartRow.getByRole("button", { name: FOUR_DAYS_PENCIL })).toBeEnabled();

    // Los montos, incluido ₡0, se ven sin badge (D8).
    const maxiPaliAmount = getPurchaseRows(page).filter({ hasText: "MaxiPali" }).getByText(/₡10\s000/u);
    await expect(maxiPaliAmount).not.toHaveClass(BADGE_TEXT_CLASS);
    const zeroAmount = getPurchaseRows(page).filter({ hasText: "MasXMenos" }).getByText("₡0", { exact: true });
    await expect(zeroAmount).toBeVisible();
    await expect(zeroAmount).not.toHaveClass(BADGE_TEXT_CLASS);

    // Los contadores no cambian: la de ₡0 cuenta en "Compras".
    await expect(getCounter(page, "Compras")).toContainText("2");
    await expect(getCounter(page, "Sin total")).toContainText("1");
  });

  test("E2E-FIN-16 — Recordatorio después de 24 horas", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page, {
      pendingRows: [PENDING_ROWS.ELEVEN_HOURS, PENDING_ROWS.FOUR_DAYS],
    });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_HISTORY_PATH);

    // Solo la de 4 días cuenta; la de 11 horas todavía no (D23).
    await expect(page.getByText(ONE_PENDING, { exact: true })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: ONE_PENDING })).toHaveCount(0);
    // Sin botón para descartarlo (D26): el recordatorio no tiene ningún botón.
    await expect(page.getByText(ONE_PENDING, { exact: true }).locator("..").getByRole("button")).toHaveCount(0);

    // La sección lista las dos, de la más reciente a la más antigua, con badge y lápiz.
    await expect(getPendingRows(page)).toHaveCount(2);
    await expect(getPendingRows(page).nth(0)).toContainText("Domingo 18 de octubre");
    await expect(getPendingRows(page).nth(1)).toContainText("Miércoles 14 de octubre");
    await expect(getPendingSection(page).getByText(WITHOUT_TOTAL, { exact: true })).toHaveCount(2);
    await expect(getPendingSection(page).getByRole("button", { name: /^Editar total/u })).toHaveCount(2);

    // El enlace lleva a la sección.
    await page.getByRole("link", { name: "Completarla", exact: true }).click();
    await expect(page).toHaveURL(`${FINANCE_HISTORY_PATH}#compras-sin-total`);
    await expect(getPendingSection(page)).toBeInViewport();

    // La petición: todas las sin total, de cualquier fecha, con conteo exacto y sin dueño.
    const pendingRequest = recorder.pendingRequests[0];
    const searchParams = new URL(pendingRequest.url()).searchParams;
    expect(searchParams.get("total_amount")).toBe("is.null");
    expect(searchParams.get("closed_at")).toBe("not.is.null");
    expect(searchParams.getAll("closed_at")).toHaveLength(1);
    expect((await pendingRequest.allHeaders()).prefer).toContain("count=exact");
    expect(pendingRequest.url()).not.toContain("owner_id");

    // Dashboard: la misma línea, con el enlace al Historial y sin lápices (D11, D26).
    await getFinanceTab(page, "Dashboard").click();
    await expect(page.getByText(ONE_PENDING, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Completarla", exact: true })).toHaveAttribute(
      "href",
      `${FINANCE_HISTORY_PATH}#compras-sin-total`,
    );
    await expect(getEditTotalButtons(page)).toHaveCount(0);

    // Desde el Dashboard, el enlace lleva a la sección aunque se dibuje después de cargar.
    await page.getByRole("link", { name: "Completarla", exact: true }).click();
    await expect(page).toHaveURL(`${FINANCE_HISTORY_PATH}#compras-sin-total`);
    await expect(getPendingSection(page)).toBeInViewport();
  });

  test("E2E-FIN-17 — Completar una compra de un periodo anterior", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page, {
      pendingRows: [PENDING_ROWS.FOUR_DAYS, PENDING_ROWS.LAST_MONTH],
      savedTimeZone: TIME_ZONE,
    });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_HISTORY_PATH);
    await expect(getExactText(page, "₡15 000")).toBeVisible();
    await expect(page.getByText(TWO_PENDING, { exact: true })).toBeVisible();

    // Septiembre: está solo en la sección, porque no es del periodo.
    await getPendingSection(page).getByRole("button", { name: LAST_MONTH_PENCIL }).click();
    await expect(page.getByRole("textbox")).toHaveCount(1);
    await getTotalInput(page, PURCHASE_INPUT).fill("8000");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();

    await expect(getPendingSection(page).getByRole("button", { name: LAST_MONTH_PENCIL })).toHaveCount(0);
    await expect(getPendingRows(page)).toHaveCount(1);
    await expect(getExactText(page, "₡15 000")).toBeVisible();
    await expect(page.getByText(ONE_PENDING, { exact: true })).toBeVisible();
    expect(recorder.totalRequests[0].postDataJSON()).toEqual({
      new_total: 8000,
      target_session_id: PENDING_ROWS.LAST_MONTH.id,
    });

    // 14 de octubre, desde la sección: también está en la semana, y se aplica en las dos listas.
    await getPendingSection(page).getByRole("button", { name: FOUR_DAYS_PENCIL }).click();
    await expect(page.getByRole("textbox")).toHaveCount(1);
    await getTotalInput(page, PURCHASE_INPUT).fill("0");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();

    await expect(getPendingSection(page)).toHaveCount(0);
    await expect(page.getByText(ONE_PENDING, { exact: true })).toHaveCount(0);
    await expect(getPurchaseRows(page).filter({ hasText: "Walmart" })).toContainText("₡0");
    await expect(getCounter(page, "Compras")).toContainText("3");
    await expect(getCounter(page, "Sin total")).toContainText("0");
    // Sin volver a pedir las pendientes.
    expect(recorder.pendingRequests).toHaveLength(1);
  });

  test("E2E-FIN-18 — Error al leer las pendientes y reintento", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page, {
      failPendingTimes: 1,
      pendingRows: [PENDING_ROWS.FOUR_DAYS],
    });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_HISTORY_PATH);

    await expect(getAlert(page, LOAD_ERROR)).toBeVisible();
    // El total y la lista del periodo siguen visibles (regla 67).
    await expect(getExactText(page, "₡15 000")).toBeVisible();
    await expect(getPurchaseRows(page)).toHaveCount(3);

    await page.getByRole("button", { name: "Reintentar", exact: true }).click();

    await expect(page.getByText(ONE_PENDING, { exact: true })).toBeVisible();
    await expect(getAlert(page, LOAD_ERROR)).toHaveCount(0);
    expect(recorder.pendingRequests).toHaveLength(2);
  });
});
