import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  COLD_START_TEST_TIMEOUT_MS,
  FINANCE_HISTORY_PATH,
  SIMULATED_RPC_ERROR,
  TIME_ZONE,
  fixClock,
  getEditTotalButton,
  getEditTotalButtons,
  getExactText,
  getFinanceTab,
  getPurchaseRows,
  getStatusRegion,
  getTotalInput,
  getTotalSection,
  signInAsRegisteredUser,
  stubFinanceSupabase,
  warmUpRoutes,
} from "./finance.helpers";

// Escenarios E2E-FIN-09 a 14: features/finance/specs/E2E.md, sección SCRUM-91.
// Validan la INTERFAZ con una sesión y respuestas de Supabase simuladas; no la
// RLS, ni las RPC reales, ni el trigger (eso lo cubre la prueba SQL 040).
// Los textos se escriben acá a propósito (oráculo independiente del código, playwright-e2e).
const SUNDAY_PENCIL = "Editar total del domingo 18 de octubre, MaxiPali";
const WEDNESDAY_PENCIL = "Editar total del miércoles 14 de octubre, Walmart";
const MONDAY_PENCIL = "Editar total del lunes 12 de octubre, MasXMenos";
const WEEK_PENCIL = "Editar total de esta semana";
const PURCHASE_INPUT = "Total de la compra (₡)";
const WEEK_INPUT = "Total de esta semana (₡)";
const SUNDAY_ID = "00000000-0000-4000-8000-000000000001";
const ADJUSTMENT = "Ajuste manual";
const INVALID_MESSAGE = "Escribe el monto en colones, solo números (ej. 50000).";
const SAVE_ERROR_MESSAGE = "No se pudo guardar el total. Intenta de nuevo.";
const NEGATIVE_MESSAGE = "Ese monto dejaría un periodo en negativo. Revisa el total del día, la semana y el mes.";
const TIME_ZONE_MISSING_MESSAGE = "Confirma tu zona horaria para guardar este total.";
const EMPTY_MESSAGE = "Todavía no tienes compras cerradas en este periodo.";

/** Abre el lápiz, reemplaza el monto y guarda. */
const editTotal = async (page: Page, pencil: string, inputLabel: string, text: string): Promise<void> => {
  await getEditTotalButton(page, pencil).click();
  await getTotalInput(page, inputLabel).fill(text);
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
};

// Next.js agrega su propio role="alert" (el anunciador de rutas): se busca por el texto.
const getAlert = (page: Page, message: string) => page.getByRole("alert").filter({ hasText: message });

const getCounter = (page: Page, label: string) =>
  getTotalSection(page).getByText(label, { exact: true }).locator("..");

test.use({ timezoneId: TIME_ZONE });

test.describe("Finanzas: editar totales (SCRUM-91)", () => {
  test.describe.configure({ timeout: COLD_START_TEST_TIMEOUT_MS });

  test.beforeAll(async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext({ baseURL });
    await warmUpRoutes(request);
    await request.dispose();
  });

  test.beforeEach(async ({ page }) => {
    await fixClock(page);
  });

  test("E2E-FIN-09 — Editar el total de una compra", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page, { savedTimeZone: TIME_ZONE });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_HISTORY_PATH);
    await expect(getExactText(page, "₡15 000")).toBeVisible();
    const readsBefore = recorder.periodFinanceRequests.length;

    // MaxiPali: ₡12 000, sin recargar.
    await editTotal(page, SUNDAY_PENCIL, PURCHASE_INPUT, "12000");

    await expect(getTotalInput(page, PURCHASE_INPUT)).toHaveCount(0);
    await expect(getPurchaseRows(page).nth(0)).toHaveText(/Domingo 18 de octubre.*MaxiPali.*₡12\s000/u);
    await expect(getExactText(page, "₡17 000")).toBeVisible();
    await expect(getStatusRegion(page)).toHaveText(/^Total guardado\. Gastado esta semana: ₡17\s000$/u);
    expect(recorder.totalRequests[0].postDataJSON()).toEqual({ new_total: 12000, target_session_id: SUNDAY_ID });
    expect(recorder.totalRequests[0].url()).toContain("/rpc/set_purchase_session_total");
    expect(recorder.periodFinanceRequests).toHaveLength(readsBefore);

    // Walmart, «Sin total», a ₡0: pasa a "Compras" (D12).
    await editTotal(page, WEDNESDAY_PENCIL, PURCHASE_INPUT, "0");

    await expect(getPurchaseRows(page).nth(1)).toHaveText(/Miércoles 14 de octubre.*Walmart.*₡0/u);
    await expect(getCounter(page, "Compras")).toContainText("3");
    await expect(getCounter(page, "Sin total")).toContainText("0");

    // Dos lápices: solo queda abierto el último, y el primero no se guardó (D21).
    const requestsBefore = recorder.totalRequests.length;
    await getEditTotalButton(page, SUNDAY_PENCIL).click();
    await getTotalInput(page, PURCHASE_INPUT).fill("999");
    await getEditTotalButton(page, MONDAY_PENCIL).click();

    await expect(page.getByRole("textbox")).toHaveCount(1);
    await expect(getTotalInput(page, PURCHASE_INPUT)).toHaveValue("5000");
    await expect(getPurchaseRows(page).nth(0)).toContainText(/₡12\s000/u);
    expect(recorder.totalRequests).toHaveLength(requestsBefore);
  });

  test("E2E-FIN-10 — Editar el total del periodo", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page, { savedTimeZone: TIME_ZONE });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_HISTORY_PATH);
    await expect(getExactText(page, "₡15 000")).toBeVisible();

    // ₡20 000: aparece el ajuste, sin lápiz, y las compras no cambian (D10, D16).
    await editTotal(page, WEEK_PENCIL, WEEK_INPUT, "20000");

    await expect(getExactText(page, "₡20 000")).toBeVisible();
    const adjustmentRow = getPurchaseRows(page).filter({ hasText: ADJUSTMENT });
    await expect(adjustmentRow).toHaveCount(1);
    await expect(adjustmentRow).toContainText(/\+₡5\s000/u);
    await expect(adjustmentRow).toContainText("Total de la semana");
    await expect(adjustmentRow.getByRole("button")).toHaveCount(0);
    await expect(getPurchaseRows(page).filter({ hasText: "MaxiPali" })).toContainText(/₡10\s000/u);
    await expect(getPurchaseRows(page).filter({ hasText: "Walmart" })).toContainText("Sin total");
    await expect(getCounter(page, "Compras")).toContainText("2");
    await expect(getCounter(page, "Sin total")).toContainText("1");
    expect(recorder.totalRequests[0].url()).toContain("/rpc/set_period_total");
    expect(recorder.totalRequests[0].postDataJSON()).toEqual({ target_scope: "week", target_total: 20000 });

    // ₡18 000: una sola fila de ajuste (regla 50).
    await editTotal(page, WEEK_PENCIL, WEEK_INPUT, "18000");
    await expect(getExactText(page, "₡18 000")).toBeVisible();
    await expect(getPurchaseRows(page).filter({ hasText: ADJUSTMENT })).toHaveCount(1);
    await expect(getPurchaseRows(page).filter({ hasText: ADJUSTMENT })).toContainText(/\+₡3\s000/u);

    // ₡15 000: la diferencia da 0 y el ajuste desaparece.
    await editTotal(page, WEEK_PENCIL, WEEK_INPUT, "15000");
    await expect(getExactText(page, "₡15 000")).toBeVisible();
    await expect(getPurchaseRows(page).filter({ hasText: ADJUSTMENT })).toHaveCount(0);
    await expect(getPurchaseRows(page)).toHaveCount(3);
  });

  test("E2E-FIN-11 — El Dashboard refleja el cambio", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page, { budgets: { week: 30000 }, savedTimeZone: TIME_ZONE });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_HISTORY_PATH);
    await expect(getExactText(page, "₡15 000")).toBeVisible();

    await editTotal(page, WEEK_PENCIL, WEEK_INPUT, "20000");
    await expect(getExactText(page, "₡20 000")).toBeVisible();
    const readsBefore = recorder.periodFinanceRequests.length;

    await getFinanceTab(page, "Dashboard").click();

    await expect(page.getByText("Gastado esta semana", { exact: true })).toBeVisible();
    await expect(getExactText(page, "₡20 000")).toBeVisible();
    await expect(page.getByText("Incluye ajustes manuales", { exact: true })).toBeVisible();
    await expect(getExactText(page, "Te quedan ₡10 000")).toBeVisible();
    await expect(getCounter(page, "Compras")).toContainText("2");
    await expect(getEditTotalButtons(page)).toHaveCount(0);
    await expect(page.getByText(ADJUSTMENT, { exact: true })).toHaveCount(0);
    // Una sola lectura con la zona guardada: compras, ajustes y total juntos (D19).
    expect(recorder.periodFinanceRequests.length).toBeGreaterThan(readsBefore);
    expect(recorder.periodFinanceRequests.at(-1)?.postDataJSON()).toEqual({ target_scope: "week" });
    expect(recorder.spendingRequests).toHaveLength(0);
  });

  test("E2E-FIN-12 — Validación y errores al guardar", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page, {
      periodTotalErrors: [SIMULATED_RPC_ERROR.NEGATIVE_PERIOD],
      purchaseTotalErrors: [SIMULATED_RPC_ERROR.SERVER],
      savedTimeZone: TIME_ZONE,
    });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_HISTORY_PATH);
    await expect(getExactText(page, "₡15 000")).toBeVisible();

    // 1. Inválido: vacío y con decimales, sin llamar a la RPC (D13, D14).
    await editTotal(page, SUNDAY_PENCIL, PURCHASE_INPUT, "");
    await expect(page.getByText(INVALID_MESSAGE, { exact: true })).toBeVisible();
    await getTotalInput(page, PURCHASE_INPUT).fill("12.5");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(getTotalInput(page, PURCHASE_INPUT)).toHaveAttribute("aria-invalid", "true");
    expect(recorder.totalRequests).toHaveLength(0);

    // 2. Error al guardar: se anuncia y se conserva lo escrito.
    await getTotalInput(page, PURCHASE_INPUT).fill("12000");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(getAlert(page, SAVE_ERROR_MESSAGE)).toBeVisible();
    await expect(getTotalInput(page, PURCHASE_INPUT)).toHaveValue("12000");
    await expect(getExactText(page, "₡15 000")).toBeVisible();

    // 3. Reintento: sale bien y el campo se cierra.
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(getTotalInput(page, PURCHASE_INPUT)).toHaveCount(0);
    await expect(getExactText(page, "₡17 000")).toBeVisible();

    // 4. Negativo (23514): el mensaje y ningún ajuste (D18).
    await editTotal(page, WEEK_PENCIL, WEEK_INPUT, "1000");
    await expect(getAlert(page, NEGATIVE_MESSAGE)).toBeVisible();
    await expect(getPurchaseRows(page).filter({ hasText: ADJUSTMENT })).toHaveCount(0);

    // 5. Cancelar: Escape cierra el campo, sin petición, y el foco vuelve al lápiz.
    const requestsBefore = recorder.totalRequests.length;
    await getTotalInput(page, WEEK_INPUT).press("Escape");
    await expect(getTotalInput(page, WEEK_INPUT)).toHaveCount(0);
    await expect(getEditTotalButton(page, WEEK_PENCIL)).toBeFocused();
    expect(recorder.totalRequests).toHaveLength(requestsBefore);
  });

  test("E2E-FIN-13 — Editar un periodo sin compras", async ({ page }) => {
    await stubFinanceSupabase(page, { historyRows: [], savedTimeZone: TIME_ZONE });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_HISTORY_PATH);

    await expect(getExactText(page, "₡0")).toBeVisible();
    await expect(page.getByText(EMPTY_MESSAGE, { exact: true })).toBeVisible();
    await expect(getEditTotalButton(page, WEEK_PENCIL)).toBeVisible();

    await editTotal(page, WEEK_PENCIL, WEEK_INPUT, "5000");

    await expect(getExactText(page, "₡5 000")).toBeVisible();
    await expect(getPurchaseRows(page)).toHaveCount(1);
    await expect(getPurchaseRows(page).filter({ hasText: ADJUSTMENT })).toContainText(/\+₡5\s000/u);
    await expect(page.getByText(EMPTY_MESSAGE, { exact: true })).toHaveCount(0);
    await expect(getCounter(page, "Compras")).toContainText("0");
    await expect(getCounter(page, "Sin total")).toContainText("0");
  });

  test("E2E-FIN-14 — Confirmar la zona antes de la primera edición", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page);
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_HISTORY_PATH);
    await expect(getExactText(page, "₡15 000")).toBeVisible();

    // Sin zona: TZ001 propone la del navegador; nada se guarda solo (regla 59).
    await editTotal(page, SUNDAY_PENCIL, PURCHASE_INPUT, "12000");
    await expect(getAlert(page, TIME_ZONE_MISSING_MESSAGE)).toBeVisible();
    await expect(page.getByText(`Zona horaria: ${TIME_ZONE}`, { exact: true })).toBeVisible();
    await expect(getTotalInput(page, PURCHASE_INPUT)).toHaveValue("12000");
    expect(recorder.timeZoneRequests).toHaveLength(0);

    // Confirmar: guarda la zona del navegador y repite la edición.
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();

    await expect(getTotalInput(page, PURCHASE_INPUT)).toHaveCount(0);
    await expect(getPurchaseRows(page).nth(0)).toContainText(/₡12\s000/u);
    await expect(getExactText(page, "₡17 000")).toBeVisible();
    expect(recorder.timeZoneRequests).toHaveLength(1);
    expect(recorder.timeZoneRequests[0].postDataJSON()).toEqual({ new_time_zone: TIME_ZONE });
    expect(recorder.totalRequests).toHaveLength(2);
  });
});

test.describe("Finanzas: la zona guardada, en otro navegador (SCRUM-91)", () => {
  test.describe.configure({ timeout: COLD_START_TEST_TIMEOUT_MS });
  // El navegador está en Tokio: allá ya es lunes 19 y la semana sería otra.
  test.use({ timezoneId: "Asia/Tokyo" });

  test.beforeEach(async ({ page }) => {
    await fixClock(page);
  });

  test("E2E-FIN-14 — El navegador no cambia los periodos", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page, { savedTimeZone: TIME_ZONE });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_HISTORY_PATH);

    // Los límites y las fechas son los de la zona guardada (regla 58).
    await expect(getExactText(page, "₡15 000")).toBeVisible();
    await expect(page.getByText("Lunes 12 a domingo 18 de octubre", { exact: true })).toBeVisible();
    await expect(getPurchaseRows(page).nth(0)).toContainText("Domingo 18 de octubre");
    await expect(page.getByRole("button", { name: "Confirmar", exact: true })).toHaveCount(0);
    expect(recorder.periodFinanceRequests.at(-1)?.postDataJSON()).toEqual({ target_scope: "week" });
    expect(recorder.historyRequests).toHaveLength(0);
  });
});
