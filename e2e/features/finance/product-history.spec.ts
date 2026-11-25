import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  COLD_START_TEST_TIMEOUT_MS,
  FINANCE_HISTORY_PATH,
  FINANCE_PRODUCTS_PATH,
  PRODUCT_ROWS,
  TIME_ZONE,
  fixClock,
  getFinanceTab,
  getPurchaseRows,
  getStatusRegion,
  hasHorizontalOverflow,
  signInAsAnonymousUser,
  signInAsRegisteredUser,
  stubFinanceSupabase,
  warmUpRoutes,
} from "./finance.helpers";

// Escenarios: features/finance/specs/E2E.md (SCRUM-93). Validan la INTERFAZ con
// una sesión y respuestas de Supabase simuladas; la agrupación, la búsqueda sin
// tildes, el orden y la RLS los hace la base y los cubre la prueba SQL de la 049.
// Los textos se escriben acá a propósito (oráculo independiente del código, playwright-e2e).
const NO_ACCOUNT_MESSAGE = "Inicia sesión con tu cuenta para ver tus finanzas.";
const AMOUNT_NOTE = "Es el total de cada compra completa, no el precio de este producto.";

const getViewSwitch = (page: Page) => page.getByRole("navigation", { name: "Vista del historial" });
const getProductList = (page: Page) => page.getByRole("list", { name: "Productos comprados" });
const getProductButtons = (page: Page) => getProductList(page).locator(":scope > li > button");
const getProductButton = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const getLoadMoreButton = (page: Page) => page.getByRole("button", { name: "Cargar más" });
const getDetail = (page: Page) => page.getByRole("region");
const getSearchInput = (page: Page) => page.getByRole("textbox", { name: "Buscar producto" });
// El vacío se ve y además se anuncia en role="status": se busca el texto visible.
// Next.js monta su propio role="alert" (el anuncio de rutas): se busca el error de la pantalla.
const getErrorMessage = (page: Page) => page.locator('p[role="alert"]');
const getVisibleMessage = (page: Page, text: string) => page.locator("p:not([aria-live])", { hasText: text });

test.use({ timezoneId: TIME_ZONE });

test.describe("Finanzas: Historial por producto (SCRUM-93)", () => {
  test.describe.configure({ timeout: COLD_START_TEST_TIMEOUT_MS });

  test.beforeAll(async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext({ baseURL });
    await warmUpRoutes(request);
    await request.dispose();
  });

  test.beforeEach(async ({ page }) => {
    await fixClock(page);
  });

  test("E2E-FIN-19 — Ver los productos comprados y su conteo", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page);
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_HISTORY_PATH);

    await getViewSwitch(page).getByRole("link", { name: "Productos" }).click();

    await expect(page).toHaveURL(FINANCE_PRODUCTS_PATH);
    await expect(getFinanceTab(page, "Historial")).toHaveAttribute("aria-current", "page");
    await expect(getViewSwitch(page).getByRole("link", { name: "Productos" })).toHaveAttribute("aria-current", "page");
    await expect(getProductButtons(page).nth(0)).toHaveAccessibleName("Leche, 4 veces");
    await expect(getProductButtons(page).nth(1)).toHaveAccessibleName("Azúcar, 2 veces");
    await expect(getProductButtons(page).nth(2)).toHaveAccessibleName("Producto no disponible, 1 vez");
    await expect(getProductButtons(page).nth(3)).toHaveAccessibleName("Arroz, 1 vez");
    expect(await hasHorizontalOverflow(page)).toBe(false);

    // El primer bloque, con la búsqueda vacía y sin dueño: lo pone la base.
    const firstRequest = recorder.productRequests[0].postDataJSON() as Record<string, unknown>;
    expect(firstRequest).toMatchObject({ page_offset: 0, search_text: "" });
    expect(Object.keys(firstRequest).sort()).toEqual(["page_limit", "page_offset", "search_text"]);

    // Volver a "Compras": el Historial de siempre (regla 92).
    await getViewSwitch(page).getByRole("link", { name: "Compras" }).click();
    await expect(page).toHaveURL(FINANCE_HISTORY_PATH);
    await expect(getPurchaseRows(page)).toHaveCount(3);
  });

  test("E2E-FIN-20 — Ver las compras de un producto", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page);
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_PRODUCTS_PATH);

    await getProductButton(page, "Leche, 4 veces").click();

    await expect(getDetail(page)).toBeVisible();
    await expect(page).toHaveURL(FINANCE_PRODUCTS_PATH);
    await expect(page.getByRole("heading", { level: 2, name: "Leche" })).toBeFocused();
    expect(recorder.productPurchaseRequests[0].postDataJSON()).toEqual({
      target_product_key: "leche",
      target_variant_id: null,
    });

    const rows = page.getByRole("list", { name: "Compras con Leche" }).getByRole("listitem");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toHaveText(/Domingo 18 de octubre.*MaxiPali.*1 L, 2 L · 2 veces.*Total de la compra: ₡15\s000/u);
    await expect(rows.nth(1)).toHaveText(/Miércoles 14 de octubre.*Walmart.*1 vez.*Sin total/u);
    await expect(rows.nth(2)).toHaveText(/Lunes 12 de octubre.*Supermercado no disponible.*1 vez.*Total de la compra: ₡8\s000/u);
    // Las apariciones de las compras suman el conteo de la lista (regla 89): 2 + 1 + 1 = 4.
    const appearances = (await rows.allTextContents()).map((text) => Number(/(\d+) ve(?:z|ces)/u.exec(text)?.[1] ?? 0));
    expect(appearances.reduce((total, count) => total + count, 0)).toBe(4);
    await expect(page.getByText(AMOUNT_NOTE)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Editar total/u })).toHaveCount(0);
    expect(await hasHorizontalOverflow(page)).toBe(false);

    await getProductButton(page, "Leche, 4 veces").click();

    await expect(getDetail(page)).toHaveCount(0);
    await expect(getProductButton(page, "Leche, 4 veces")).toBeFocused();
  });

  test("E2E-FIN-21 — Buscar y cargar más", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page);
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_PRODUCTS_PATH);
    await expect(getProductButtons(page).first()).toBeVisible();
    const pageLimit = (recorder.productRequests[0].postDataJSON() as { page_limit: number }).page_limit;
    await expect(getProductButtons(page)).toHaveCount(pageLimit);

    // "Cargar más" hasta el final: un toque por bloque que falta, sin repetidos y con la misma búsqueda.
    const blockCount = Math.ceil(PRODUCT_ROWS.length / pageLimit);
    for (let block = 1; block < blockCount; block += 1) {
      await getLoadMoreButton(page).click();
      await expect(getProductButtons(page)).toHaveCount(Math.min(PRODUCT_ROWS.length, (block + 1) * pageLimit));
    }
    await expect(getLoadMoreButton(page)).toBeHidden();
    await expect(getProductButtons(page)).toHaveCount(PRODUCT_ROWS.length);
    const blockRequests = recorder.productRequests.map((request) => request.postDataJSON());
    expect(blockRequests.map((body) => body.page_offset)).toEqual(
      Array.from({ length: blockCount }, (_, index) => index * pageLimit),
    );
    expect(blockRequests.every((body) => body.search_text === "")).toBe(true);

    // Buscar cierra el detalle y vuelve al primer bloque.
    await getProductButton(page, "Leche, 4 veces").click();
    await expect(getDetail(page)).toBeVisible();
    await getSearchInput(page).fill("  lec ");

    await expect(getProductButtons(page)).toHaveCount(1);
    await expect(getDetail(page)).toHaveCount(0);
    await expect(getStatusRegion(page)).toHaveText("1 producto");
    expect(recorder.productRequests.at(-1)?.postDataJSON()).toMatchObject({ page_offset: 0, search_text: "lec" });

    await getSearchInput(page).fill("zzz");
    await expect(getVisibleMessage(page, "Sin resultados para esa búsqueda.")).toBeVisible();

    await getSearchInput(page).fill("");
    await expect(getProductButtons(page)).toHaveCount(pageLimit);
    expect(recorder.productRequests.at(-1)?.postDataJSON()).toMatchObject({ page_offset: 0, search_text: "" });

    // Cambiar de vista no guarda la búsqueda, los bloques ni el producto (regla 92).
    await getSearchInput(page).fill("lec");
    await expect(getProductButtons(page)).toHaveCount(1);
    await getProductButton(page, "Leche, 4 veces").click();
    await getViewSwitch(page).getByRole("link", { name: "Compras" }).click();
    await expect(page).toHaveURL(FINANCE_HISTORY_PATH);
    await getViewSwitch(page).getByRole("link", { name: "Productos" }).click();

    await expect(getSearchInput(page)).toHaveValue("");
    await expect(getProductButtons(page)).toHaveCount(pageLimit);
    await expect(getDetail(page)).toHaveCount(0);
  });

  test("E2E-FIN-22 — Vacío y errores", async ({ page }) => {
    // Falla el primer bloque, después "Cargar más"; luego responde bien.
    const recorder = await stubFinanceSupabase(page, {
      failProductPurchasesTimes: 1,
      productBlockFailures: [true, false, true],
    });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_PRODUCTS_PATH);

    await expect(getErrorMessage(page)).toHaveText("No se pudieron cargar tus productos. Intenta de nuevo.");
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(getProductButtons(page).first()).toBeVisible();

    const loaded = await getProductButtons(page).count();
    await getLoadMoreButton(page).click();
    await expect(getErrorMessage(page)).toHaveText("No se pudieron cargar más productos. Intenta de nuevo.");
    await expect(getProductButtons(page)).toHaveCount(loaded);
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(getProductButtons(page)).not.toHaveCount(loaded);

    // Falla el detalle: el error queda adentro y la lista sigue.
    await getProductButton(page, "Leche, 4 veces").click();
    await expect(getDetail(page).getByRole("alert")).toHaveText(
      "No se pudieron cargar las compras de este producto. Intenta de nuevo.",
    );
    await expect(getProductList(page)).toBeVisible();
    await getDetail(page).getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByRole("list", { name: "Compras con Leche" }).getByRole("listitem")).toHaveCount(3);
    // El reintento pide el mismo producto.
    expect(recorder.productPurchaseRequests.map((request) => request.postDataJSON())).toEqual([
      { target_product_key: "leche", target_variant_id: null },
      { target_product_key: "leche", target_variant_id: null },
    ]);
  });

  test("E2E-FIN-22 — Sin productos", async ({ page }) => {
    await stubFinanceSupabase(page, { productRows: [] });
    await signInAsRegisteredUser(page);
    await page.goto(FINANCE_PRODUCTS_PATH);

    await expect(getVisibleMessage(page, "Todavía no tienes productos en compras cerradas.")).toBeVisible();
    await expect(getProductList(page)).toHaveCount(0);
  });

  test("E2E-FIN-23 — Sin cuenta registrada", async ({ page }) => {
    const recorder = await stubFinanceSupabase(page);

    await page.goto(FINANCE_PRODUCTS_PATH);
    await expect(page.getByText(NO_ACCOUNT_MESSAGE)).toBeVisible();

    await signInAsAnonymousUser(page);
    await page.goto(FINANCE_PRODUCTS_PATH);
    await expect(page.getByText(NO_ACCOUNT_MESSAGE)).toBeVisible();

    await expect(getViewSwitch(page)).toHaveCount(0);
    expect(recorder.productRequests).toHaveLength(0);
    expect(recorder.productPurchaseRequests).toHaveLength(0);
  });
});
