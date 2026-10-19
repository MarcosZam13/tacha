import { expect, test } from "@playwright/test";
import {
  COLD_START_TEST_TIMEOUT_MS,
  FINANCE_PATH,
  LIST_PATH,
  LOGIN_PATH,
  TIME_ZONE,
  fixClock,
  getClosedAtFilters,
  getExactText,
  getPeriodButton,
  getPeriodGroup,
  getSelect,
  getStatusRegion,
  getVisibleAppNav,
  signInAsAnonymousUser,
  signInAsRegisteredUser,
  stubFinanceSupabase,
  warmUpRoutes,
} from "./finance.helpers";

// Escenarios: features/finance/specs/E2E.md. Validan la INTERFAZ con una sesión
// y respuestas de Supabase simuladas; no la autenticación real ni la seguridad
// de la base (eso es la prueba SQL 027 y las pruebas manuales).
// Los textos se escriben acá a propósito (oráculo independiente del código, playwright-e2e).
const WEEK_FILTERS = ["gte.2026-10-12T06:00:00.000Z", "lt.2026-10-19T06:00:00.000Z"];
const DAY_FILTERS = ["gte.2026-10-18T06:00:00.000Z", "lt.2026-10-19T06:00:00.000Z"];
const MONTH_FILTERS = ["gte.2026-10-01T06:00:00.000Z", "lt.2026-11-01T06:00:00.000Z"];
const INPUT_LABEL_WEEK = "Presupuesto semanal (₡)";
const INVALID_AMOUNT_MESSAGE = "Escribe el monto en colones, solo números (ej. 50000).";
const NO_ACCOUNT_MESSAGE = "Inicia sesión con tu cuenta para ver tus finanzas.";

test.use({ timezoneId: TIME_ZONE });

test.describe("Finanzas", () => {
  test.describe.configure({ timeout: COLD_START_TEST_TIMEOUT_MS });

  test.beforeAll(async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext({ baseURL });
    await warmUpRoutes(request);
    await request.dispose();
  });

  test.beforeEach(async ({ page }) => {
    await fixClock(page);
  });

  test("E2E-FIN-01 — Elegir el periodo y ver el gasto", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page);
    await signInAsRegisteredUser(page);
    await page.goto(LIST_PATH);

    await getVisibleAppNav(page).getByRole("link", { name: "Finanzas" }).click();

    await expect(page).toHaveURL(FINANCE_PATH);
    await expect(page.getByRole("heading", { level: 1, name: "Finanzas" })).toBeVisible();
    await expect(page.getByRole("tablist")).toHaveCount(0);
    await expect(getPeriodButton(page, "Día")).toHaveAttribute("aria-pressed", "false");
    await expect(getPeriodButton(page, "Semana")).toHaveAttribute("aria-pressed", "true");
    await expect(getPeriodButton(page, "Mes")).toHaveAttribute("aria-pressed", "false");

    // Semana.
    await expect(page.getByText("Gastado esta semana", { exact: true })).toBeVisible();
    await expect(getExactText(page, "₡15 000")).toBeVisible();
    await expect(page.getByText("Lunes 12 a domingo 18 de octubre", { exact: true })).toBeVisible();
    await expect(page.getByText("Compras", { exact: true }).locator("..")).toContainText("2");
    await expect(page.getByText("Sin total", { exact: true }).locator("..")).toContainText("1");
    expect(getSelect(recorder.spendingRequests[0])).toBe("total_amount");
    expect(getClosedAtFilters(recorder.spendingRequests[0])).toEqual(WEEK_FILTERS);
    expect(recorder.spendingRequests[0].url()).not.toContain("owner_id");

    // Día.
    await getPeriodButton(page, "Día").click();
    await expect(page.getByText("Gastado hoy", { exact: true })).toBeVisible();
    await expect(getExactText(page, "₡10 000")).toBeVisible();
    await expect(page.getByText("Domingo 18 de octubre", { exact: true })).toBeVisible();
    await expect(getStatusRegion(page)).toHaveText(/^Gastado hoy: ₡10\s000$/u);
    expect(getClosedAtFilters(recorder.spendingRequests.at(-1)!)).toEqual(DAY_FILTERS);

    // Mes.
    await getPeriodButton(page, "Mes").click();
    await expect(page.getByText("Gastado este mes", { exact: true })).toBeVisible();
    await expect(getExactText(page, "₡35 000")).toBeVisible();
    await expect(page.getByText("Octubre de 2026", { exact: true })).toBeVisible();
    expect(getClosedAtFilters(recorder.spendingRequests.at(-1)!)).toEqual(MONTH_FILTERS);

    // Sin navegar ni recargar, y los presupuestos se pidieron una sola vez.
    await expect(page).toHaveURL(FINANCE_PATH);
    expect(recorder.budgetRequests).toHaveLength(1);
    expect(getSelect(recorder.budgetRequests[0])).toBe("period,amount");
  });

  test("E2E-FIN-02 — Definir y editar el presupuesto", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page);
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_PATH);
    await expect(getExactText(page, "₡15 000")).toBeVisible();

    await expect(page.getByText("Sin presupuesto semanal", { exact: true })).toBeVisible();
    await expect(page.getByText(/^Te (quedan|pasaste)/u)).toHaveCount(0);

    // Definir ₡50 000.
    await page.getByRole("button", { name: "Definir presupuesto" }).click();
    await page.getByRole("textbox", { name: INPUT_LABEL_WEEK }).fill("50 000");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(getExactText(page, "₡50 000")).toBeVisible();
    await expect(getExactText(page, "Te quedan ₡35 000")).toBeVisible();
    await expect(page.getByText("No incluye 1 compra sin total", { exact: true })).toBeVisible();
    await expect(getStatusRegion(page)).toHaveText("Presupuesto guardado");
    await expect(page.getByRole("button", { name: "Editar presupuesto" })).toBeFocused();
    expect(recorder.rpcRequests).toHaveLength(1);
    expect(recorder.rpcRequests[0].postDataJSON()).toEqual({ budget_amount: 50000, budget_period: "week" });

    // Editarlo a ₡12 000.
    await page.getByRole("button", { name: "Editar presupuesto" }).click();
    await expect(page.getByRole("textbox", { name: INPUT_LABEL_WEEK })).toHaveValue("50000");
    await page.getByRole("textbox", { name: INPUT_LABEL_WEEK }).fill("12000");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(getExactText(page, "Te pasaste por ₡3 000")).toBeVisible();

    // Al recargar se vuelve a leer: la respuesta simulada recuerda lo guardado.
    await page.reload();
    await expect(getExactText(page, "₡12 000")).toBeVisible();

    // Los otros periodos no cambian.
    await getPeriodButton(page, "Día").click();
    await expect(page.getByText("Sin presupuesto diario", { exact: true })).toBeVisible();
    await getPeriodButton(page, "Mes").click();
    await expect(page.getByText("Sin presupuesto mensual", { exact: true })).toBeVisible();
  });

  test("E2E-FIN-03 — Monto inválido y error al guardar", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page, { failSave: true });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_PATH);
    await page.getByRole("button", { name: "Definir presupuesto" }).click();
    const input = page.getByRole("textbox", { name: INPUT_LABEL_WEEK });

    // Monto inválido y campo vacío: no llaman a la RPC.
    await input.fill("12.5");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText(INVALID_AMOUNT_MESSAGE, { exact: true })).toBeVisible();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await input.fill("");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText(INVALID_AMOUNT_MESSAGE, { exact: true })).toBeVisible();
    expect(recorder.rpcRequests).toHaveLength(0);

    // Error al guardar: se conserva lo escrito y se puede cancelar.
    await input.fill("30000");
    await page.getByRole("button", { name: "Guardar" }).click();
    // Filtrado por texto: Next también monta un role="alert" propio (el anunciador de rutas).
    await expect(
      page.getByRole("alert").filter({ hasText: "No se pudo guardar tu presupuesto. Intenta de nuevo." }),
    ).toBeVisible();
    await expect(input).toHaveValue("30000");
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByText("Sin presupuesto semanal", { exact: true })).toBeVisible();
  });

  test("E2E-FIN-03 — Errores de carga del gasto y del presupuesto", async ({ page }) => {
    await stubFinanceSupabase(page, { failBudgets: true, failSpendingTimes: 1 });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_PATH);

    await expect(page.getByText("No se pudo cargar tu gasto. Intenta de nuevo.", { exact: true })).toBeVisible();
    await expect(page.getByText("No se pudo cargar tu presupuesto. Intenta de nuevo.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /presupuesto$/u })).toHaveCount(0);

    // Reintentar el gasto (el primero de los dos "Reintentar").
    await page.getByRole("button", { name: "Reintentar" }).first().click();
    await expect(getExactText(page, "₡15 000")).toBeVisible();
    await expect(page.getByText("No se pudo cargar tu presupuesto. Intenta de nuevo.", { exact: true })).toBeVisible();
  });

  test("E2E-FIN-04 — Sin sesión no se ve ni se pide nada", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page);
    await page.goto(FINANCE_PATH);

    await expect(page.getByText(NO_ACCOUNT_MESSAGE, { exact: true })).toBeVisible();
    await expect(getPeriodGroup(page)).toHaveCount(0);
    await expect(page.getByText(/presupuesto/iu)).toHaveCount(0);
    expect(recorder.spendingRequests).toHaveLength(0);
    expect(recorder.budgetRequests).toHaveLength(0);
    expect(recorder.rpcRequests).toHaveLength(0);

    await page.getByRole("link", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(LOGIN_PATH);
  });

  test("E2E-FIN-04 — Con sesión anónima no se ve ni se pide nada", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page);
    await signInAsAnonymousUser(page);
    await page.goto(FINANCE_PATH);

    await expect(page.getByText(NO_ACCOUNT_MESSAGE, { exact: true })).toBeVisible();
    await expect(getPeriodGroup(page)).toHaveCount(0);
    await expect(page.getByText(/presupuesto/iu)).toHaveCount(0);
    expect(recorder.spendingRequests).toHaveLength(0);
    expect(recorder.budgetRequests).toHaveLength(0);
    expect(recorder.rpcRequests).toHaveLength(0);
  });
});
