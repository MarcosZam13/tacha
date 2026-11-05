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
const CREATE_RPC_URL = /\/rest\/v1\/rpc\/create_date_list/;
const LOAD_LISTS_URL = /\/rest\/v1\/lists\?.*type=eq\.date/;

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

  test("E2E-FECHAS-07: la carga inicial que llega tarde no borra lo recién creado", async ({ page }) => {
    // La carga responde vacía y solo después de crear: es la consulta que salió antes de que
    // existiera la sublista y llegó tarde. Dejarla ir a la red no sirve: si sale después de
    // crear ya trae la sublista, y la prueba pasaría aunque el bug siguiera ahí.
    const created = page.waitForResponse(CREATE_RPC_URL);
    await page.route(LOAD_LISTS_URL, async (route) => {
      await created;
      await route.fulfill({ json: [] });
    });
    const loaded = page.waitForResponse(LOAD_LISTS_URL);
    await page.goto(DATE_LISTS_PATH);

    await fillCreateForm(page, FUTURE_DATE);
    await loaded;
    // El spinner se va en el mismo paso en que se guarda la carga. Revisar antes pasaría
    // aunque la carga después borrara la sublista.
    await expect(page.getByRole("status")).toHaveCount(0);

    await expect(getListCard(page)).toContainText("Pendiente");
  });

  test("E2E-FECHAS-11: la carga que ya trae lo recién creado no lo duplica", async ({ page }) => {
    // El orden inverso a E2E-FECHAS-07: crear ya guardó en la base, la carga trae la sublista
    // y responde primero, y la respuesta de crear llega de última.
    let markSaved = (): void => {};
    let releaseCreate = (): void => {};
    const savedInDatabase = new Promise<void>((resolve) => {
      markSaved = resolve;
    });
    const createHeld = new Promise<void>((resolve) => {
      releaseCreate = resolve;
    });
    await page.route(CREATE_RPC_URL, async (route) => {
      const response = await route.fetch();
      markSaved();
      await createHeld;
      await route.fulfill({ response });
    });
    await page.route(LOAD_LISTS_URL, async (route) => {
      await savedInDatabase;
      await route.fulfill({ response: await route.fetch() });
    });
    await page.goto(DATE_LISTS_PATH);

    await fillCreateForm(page, FUTURE_DATE);
    await expect(getListCard(page)).toHaveCount(1);
    releaseCreate();
    await expect(page.getByRole("button", { name: "Crear sublista" })).toHaveCount(0);

    await expect(getListCard(page)).toHaveCount(1);
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
