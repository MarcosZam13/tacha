import { expect, test } from "@playwright/test";
import { deleteOwnListItems } from "../../support/supabase";
import {
  LIST_PATH,
  addFirstSearchResult,
  getCheckButton,
  getEmptyListMessage,
  getListRow,
  getListSection,
} from "./shopping-list.helpers";

// Escenarios: features/shopping-list/specs/E2E.md. Cada test arranca con un
// navegador nuevo, o sea un usuario anónimo nuevo con la lista vacía.
const SEARCH_TERM = "leche";
const PENDING_SECTION = "Pendientes";
const CHECKED_SECTION = "Tachados hoy";

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
});
