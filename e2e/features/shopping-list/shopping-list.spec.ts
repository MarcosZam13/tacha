import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";
import { createOwnRecipe, deleteOwnListItems, deleteOwnRecipes } from "../../support/supabase";
import {
  LIST_PATH,
  RECIPES_PATH,
  addFirstSearchResult,
  getAddRecipeToListButton,
  getAddRecipeToListSummary,
  getCheckButton,
  getClosePurchasePanel,
  getEmptyListMessage,
  getListRow,
  getListSection,
  getShoppingModeBar,
  getShortfallNote,
  getShortfallPanel,
  getUndoDialog,
  startPurchaseAt,
} from "./shopping-list.helpers";

// Escenarios: features/shopping-list/specs/E2E.md. Cada test arranca con un
// navegador nuevo, o sea un usuario anónimo nuevo con la lista vacía.
const SEARCH_TERM = "leche";
const PENDING_SECTION = "Pendientes";
const CHECKED_SECTION = "Tachados hoy";
const STORE_NAME = "MaxiPali";
const SHOPPING_MODE_URL = /\/lista\?compra=([0-9a-f-]+)$/;
const LIST_URL = /\/lista$/;

test.describe("Lista general", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LIST_PATH);
    await expect(getEmptyListMessage(page)).toBeVisible();
  });

  test.afterEach(async ({ page, request }) => {
    await deleteOwnListItems(page, request);
  });

  test("E2E-LISTA-01 — Añadir un producto desde el buscador", async ({ page }) => {
    const productName = await addFirstSearchResult(page, SEARCH_TERM);

    const row = getListRow(page, productName);
    await expect(row).toBeVisible();
    await expect(row.getByText("1", { exact: true })).toBeVisible();

    await page.reload();
    await expect(getListRow(page, productName).getByText("1", { exact: true })).toBeVisible();
  });

  test("E2E-LISTA-02 — Subir la cantidad con +", async ({ page }) => {
    const productName = await addFirstSearchResult(page, SEARCH_TERM);
    const row = getListRow(page, productName);
    await expect(row.getByText("1", { exact: true })).toBeVisible();

    await row.getByRole("button", { name: "Añadir uno" }).click();

    await expect(row.getByText("2", { exact: true })).toBeVisible();
    await page.reload();
    await expect(getListRow(page, productName).getByText("2", { exact: true })).toBeVisible();
  });

  test("E2E-LISTA-04 — Tachar y destachar un producto", async ({ page }) => {
    const productName = await addFirstSearchResult(page, SEARCH_TERM);
    const pendingSection = getListSection(page, PENDING_SECTION);
    const checkedSection = getListSection(page, CHECKED_SECTION);
    await expect(getCheckButton(pendingSection, productName)).toBeVisible();

    await getCheckButton(pendingSection, productName).click();

    await expect(getCheckButton(checkedSection, productName)).toHaveAttribute("aria-pressed", "true");
    await expect(getCheckButton(pendingSection, productName)).toHaveCount(0);
    // El tachado es optimista: la fila cambia de sección antes de que guarde la
    // base. Vuelve a estar habilitada cuando la base confirmó; recién ahí se recarga.
    await expect(getCheckButton(checkedSection, productName)).toBeEnabled();
    await page.reload();
    await expect(getCheckButton(checkedSection, productName)).toBeVisible();

    await getCheckButton(checkedSection, productName).click();

    await expect(getCheckButton(pendingSection, productName)).toHaveAttribute("aria-pressed", "false");
    await expect(checkedSection).toHaveCount(0);
    await expect(getCheckButton(pendingSection, productName)).toBeEnabled();
    await page.reload();
    await expect(getCheckButton(pendingSection, productName)).toBeVisible();
  });

  test("E2E-LISTA-05 — Modo compra de punta a punta", async ({ page }) => {
    const productName = await addFirstSearchResult(page, SEARCH_TERM);
    const checkedSection = getListSection(page, CHECKED_SECTION);
    const pendingSection = getListSection(page, PENDING_SECTION);
    await expect(getCheckButton(pendingSection, productName)).toBeVisible();

    await startPurchaseAt(page, STORE_NAME);

    await expect(page).toHaveURL(SHOPPING_MODE_URL);
    const firstSessionId = SHOPPING_MODE_URL.exec(page.url())?.at(1);
    await expect(getShoppingModeBar(page)).toContainText(STORE_NAME);

    await getCheckButton(pendingSection, productName).click();
    await expect(getCheckButton(checkedSection, productName)).toHaveAttribute("aria-pressed", "true");
    await expect(getCheckButton(checkedSection, productName)).toBeEnabled();

    const checkedRow = getListRow(page, productName);
    await checkedRow.getByRole("button", { name: "Añadir uno" }).click();
    await expect(checkedRow.getByText("2", { exact: true })).toBeVisible();
    await expect(checkedRow.getByText("Pedido 1", { exact: true })).toBeVisible();

    await getShoppingModeBar(page).getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(LIST_URL);
    await expect(getShoppingModeBar(page)).toHaveCount(0);
    await expect(getCheckButton(checkedSection, productName)).toHaveAttribute("aria-pressed", "true");

    await startPurchaseAt(page, STORE_NAME);
    await expect(page).toHaveURL(SHOPPING_MODE_URL);
    expect(SHOPPING_MODE_URL.exec(page.url())?.at(1)).toBe(firstSessionId);

    const closePanel = getClosePurchasePanel(page);
    await expect(closePanel).toBeVisible();
    await closePanel.getByRole("textbox", { name: "Total gastado (₡)" }).fill("12500");
    await closePanel.getByRole("button", { name: "Cerrar compra" }).click();

    await expect(page).toHaveURL(LIST_URL);
    await expect(getShoppingModeBar(page)).toHaveCount(0);
    await expect(getClosePurchasePanel(page)).toHaveCount(0);
  });
});

test.describe("Lista general: aviso de faltante de receta", () => {
  // El máximo que acepta una receta (regla 9 de recetas): ninguna presentación
  // del catálogo lo cubre, así que agregarla siempre deja faltante.
  const INGREDIENT_MILLILITERS = 100_000;
  const RECIPE_BASE_SERVINGS = 2;

  test.afterEach(async ({ page, request }) => {
    await deleteOwnListItems(page, request);
    // Los registros de faltante se van con la receta (cascada).
    await deleteOwnRecipes(page, request);
  });

  test("E2E-LISTA-06 — Aviso de faltante de una receta", async ({ page, request }) => {
    // Abrir /lista primero abre la sesión anónima que usa la API para crear la receta.
    await page.goto(LIST_PATH);
    await expect(getEmptyListMessage(page)).toBeVisible();
    const recipeName = `Receta E2E ${crypto.randomUUID().slice(0, 8)}`;
    await createOwnRecipe(page, request, recipeName, RECIPE_BASE_SERVINGS, INGREDIENT_MILLILITERS);

    await page.goto(RECIPES_PATH);
    await getAddRecipeToListButton(page, recipeName).click();
    await expect(getAddRecipeToListSummary(page)).toBeVisible();

    await page.goto(LIST_PATH);
    const pendingSection = getListSection(page, PENDING_SECTION);
    const note = getShortfallNote(pendingSection, recipeName);
    await expect(note).toBeVisible();

    await note.click();

    await expect(getShortfallNote(getListSection(page, PENDING_SECTION), recipeName)).toBeVisible();
    await expect(getListSection(page, CHECKED_SECTION)).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("Lista general: ¿Qué hiciste? al tachar", () => {
  // El máximo que acepta una receta: una unidad más nunca cubre el faltante.
  const INGREDIENT_MILLILITERS = 100_000;
  const RECIPE_BASE_SERVINGS = 2;
  // El botón de tachar de la fila es el único con aria-pressed; pressed: false
  // de getByRole también encuentra los botones sin ese atributo (cantidad, detalle).
  const CHECK_BUTTON = "button[aria-pressed]";
  // La fila de la receta, por el texto de su aviso. first(): los avisos también
  // son <li> dentro de la fila, y la fila va primero en el orden del DOM.
  const getRowWithShortfall = (section: Locator, recipeName: string): Locator =>
    section.getByRole("listitem").filter({ hasText: `necesarios para ${recipeName}` }).first();

  test.afterEach(async ({ page, request }) => {
    await deleteOwnListItems(page, request);
    await deleteOwnRecipes(page, request);
  });

  test("E2E-LISTA-07 — ¿Qué hiciste? al tachar y deshacer al destachar", async ({ page, request }) => {
    await page.goto(LIST_PATH);
    await expect(getEmptyListMessage(page)).toBeVisible();
    const recipeName = `Receta E2E ${crypto.randomUUID().slice(0, 8)}`;
    await createOwnRecipe(page, request, recipeName, RECIPE_BASE_SERVINGS, INGREDIENT_MILLILITERS);

    await page.goto(RECIPES_PATH);
    await getAddRecipeToListButton(page, recipeName).click();
    await expect(getAddRecipeToListSummary(page)).toBeVisible();

    await page.goto(LIST_PATH);
    const pendingSection = getListSection(page, PENDING_SECTION);
    const pendingRow = getRowWithShortfall(pendingSection, recipeName);
    await expect(pendingRow).toBeVisible();

    // 1. Tachar abre el panel con el aviso.
    await pendingRow.locator(CHECK_BUTTON).click();
    const panel = getShortfallPanel(page);
    await expect(panel).toBeVisible();
    await expect(getShortfallNote(panel, recipeName)).toBeVisible();

    // 2. Una unidad más no alcanza: el panel sigue abierto.
    await panel.getByRole("button", { name: "Agregué otra igual" }).click();
    await expect(panel.getByText("Todavía falta:")).toBeVisible();

    // 3. Cerrar: la fila tachada quedó con 2 y su aviso.
    await panel.getByRole("button", { name: "Ahora no" }).click();
    await expect(panel).toHaveCount(0);
    const checkedSection = getListSection(page, CHECKED_SECTION);
    const checkedRow = getRowWithShortfall(checkedSection, recipeName);
    await expect(checkedRow.getByText("2", { exact: true })).toBeVisible();

    // 4. Destachar pide confirmar y deshace: vuelve a 1 en Pendientes, con aviso.
    await checkedRow.locator(CHECK_BUTTON).click();
    const undoDialog = getUndoDialog(page);
    await expect(undoDialog).toContainText("La fila vuelve a 1 ×");
    await undoDialog.getByRole("button", { name: "Destachar y deshacer" }).click();
    await expect(undoDialog).toHaveCount(0);
    await expect(getListSection(page, CHECKED_SECTION)).toHaveCount(0);
    const undoneRow = getRowWithShortfall(pendingSection, recipeName);
    await expect(undoneRow.getByText("1", { exact: true })).toBeVisible();

    // 5. Tachar otra vez y descartar: el aviso desaparece.
    await undoneRow.locator(CHECK_BUTTON).click();
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: "Ya tenía suficiente" }).click();
    await expect(panel).toHaveCount(0);
    await expect(getShortfallNote(page.locator("main"), recipeName)).toHaveCount(0);
  });
});
