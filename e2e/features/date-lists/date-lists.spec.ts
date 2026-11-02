import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { deleteOwnListItems } from "../../support/supabase";

// Escenarios: features/date-lists/specs/E2E.md.
const DATE_LISTS_PATH = "/fechas";
const LIST_NAME = "Paseo a la playa";
const PAST_DATE = "2020-01-01";
const FUTURE_DATE = "2099-12-20";
const SEARCH_TERM = "leche";
const DETAIL_URL = /\/fechas\/[0-9a-f-]+$/;

const fillCreateForm = async (page: Page, eventDate: string): Promise<void> => {
  await page.getByRole("button", { name: "+ Nueva sublista" }).click();
  await page.getByRole("textbox", { name: /^Nombre/ }).fill(LIST_NAME);
  await page.getByLabel(/^Fecha/).fill(eventDate);
  await page.getByRole("button", { name: "Crear sublista" }).click();
};

const getListCard = (page: Page) => page.getByRole("link", { name: new RegExp(LIST_NAME) });

const addFirstResult = async (page: Page): Promise<void> => {
  await page.getByRole("textbox", { name: "Buscar producto" }).fill(SEARCH_TERM);
  await page.locator("section ul li button").first().click();
};

test.describe("Sublistas por fecha", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DATE_LISTS_PATH);
  });

  test.afterEach(async ({ page, request }) => {
    await deleteOwnListItems(page, request);
  });

  test("E2E-FECHAS-01: la sublista creada aparece sin recargar, pendiente", async ({ page }) => {
    await fillCreateForm(page, FUTURE_DATE);

    await expect(getListCard(page)).toContainText("Pendiente");
  });

  test("E2E-FECHAS-02: una fecha pasada no se acepta", async ({ page }) => {
    await fillCreateForm(page, PAST_DATE);

    await expect(page.getByText("Elegí hoy o una fecha futura.")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("E2E-FECHAS-03: agregar dos veces suma en la misma fila", async ({ page }) => {
    await fillCreateForm(page, FUTURE_DATE);
    await getListCard(page).click();
    await expect(page).toHaveURL(DETAIL_URL);

    await addFirstResult(page);
    const removeButtons = page.getByRole("button", { name: "Eliminar" });
    await expect(removeButtons).toHaveCount(1);
    // El segundo agregado espera a que termine de guardarse el primero.
    await expect(page.getByRole("button", { name: "Agregar uno" })).toBeEnabled();
    await addFirstResult(page);

    await expect(page.getByRole("button", { name: "Agregar uno" }).locator("..")).toContainText("2");
    await expect(removeButtons).toHaveCount(1);
  });
});
