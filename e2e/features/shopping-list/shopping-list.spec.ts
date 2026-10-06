import { expect, test } from "@playwright/test";
import { deleteOwnListItems } from "../../support/supabase";
import {
  LIST_PATH,
  addFirstSearchResult,
  getEmptyListMessage,
  getListRow,
} from "./shopping-list.helpers";

// Escenarios: features/shopping-list/specs/E2E.md. Cada test arranca con un
// navegador nuevo, o sea un usuario anónimo nuevo con la lista vacía.
const SEARCH_TERM = "leche";

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
});
