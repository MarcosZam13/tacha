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

// La agenda: en desktop la misma sublista también es un enlace dentro de la celda.
const getListCard = (page: Page) =>
  page.getByRole("list", { name: "Sublistas del mes" }).getByRole("link", { name: new RegExp(LIST_NAME) });

const getPendingCheckbox = (page: Page) => page.getByRole("checkbox", { checked: false, name: /^Tachar / });
const getCheckedCheckbox = (page: Page) => page.getByRole("checkbox", { checked: true, name: /^Tachar / });

// Espera a que termine de guardarse el cambio anterior: mientras tanto la fila está deshabilitada.
const waitForSave = async (page: Page): Promise<void> => {
  await expect(page.getByRole("checkbox", { name: /^Tachar / }).first()).toBeEnabled();
};

// Dos productos distintos, para que no se sumen en la misma fila.
const createListWithTwoProducts = async (page: Page): Promise<void> => {
  await fillCreateForm(page, FUTURE_DATE);
  await getListCard(page).click();
  await expect(page).toHaveURL(DETAIL_URL);

  await page.getByRole("textbox", { name: "Buscar producto" }).fill(SEARCH_TERM);
  await page.locator("section ul li button").first().click();
  await expect(page.getByRole("checkbox", { name: /^Tachar / })).toHaveCount(1);
  await waitForSave(page);

  await page.getByRole("textbox", { name: "Buscar producto" }).fill(SEARCH_TERM);
  await page.locator("section ul li button").nth(1).click();
  await expect(page.getByRole("checkbox", { name: /^Tachar / })).toHaveCount(2);
  await waitForSave(page);
};

const getCalendar = (page: Page) => page.getByRole("region", { name: "Calendario de sublistas" });

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

  test("E2E-FECHAS-04: la sublista aparece en su día, en otro mes", async ({ page }) => {
    await fillCreateForm(page, FUTURE_DATE);

    const calendar = getCalendar(page);
    await expect(calendar.getByRole("heading")).toContainText("2099");
    await expect(calendar.getByRole("listitem").filter({ hasText: LIST_NAME })).toContainText("20");
  });

  test("E2E-FECHAS-05: tocar un día abre el formulario con esa fecha", async ({ page }) => {
    await page.getByRole("button", { name: "Mes siguiente" }).click();
    await getCalendar(page).getByRole("button", { name: /Crear sublista el .* 15 de / }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel(/^Fecha/)).toHaveValue(/^\d{4}-\d{2}-15$/);
  });

  test("E2E-FECHAS-06: un día pasado no se puede tocar", async ({ page }) => {
    await page.getByRole("button", { name: "Mes anterior" }).click();

    await expect(getCalendar(page).getByRole("button", { name: /Crear sublista el/ })).toHaveCount(0);
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

  test("E2E-FECHAS-08: tachar todo la completa, y destachar la devuelve a pendiente", async ({ page }) => {
    await createListWithTwoProducts(page);

    await getPendingCheckbox(page).first().click();
    await expect(getPendingCheckbox(page)).toHaveCount(1);
    await expect(page.getByText(/· Pendiente$/)).toBeVisible();
    await waitForSave(page);

    await getPendingCheckbox(page).first().click();
    await expect(page.getByText(/· Completada$/)).toBeVisible();
    await waitForSave(page);

    await getCheckedCheckbox(page).first().click();
    await expect(page.getByText(/· Pendiente$/)).toBeVisible();
  });

  test("E2E-FECHAS-09 y 10: cancelar no borra, y reactivar la devuelve", async ({ page }) => {
    await createListWithTwoProducts(page);

    await page.getByRole("button", { name: "Cancelar sublista" }).click();
    await page.getByRole("button", { name: "Sí, cancelar" }).click();

    await expect(page.getByText(/· Cancelada$/)).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /^Tachar / })).toHaveCount(2);
    await expect(page.getByRole("textbox", { name: "Buscar producto" })).toHaveCount(0);

    await page.getByRole("button", { name: "Reactivar sublista" }).click();

    await expect(page.getByText(/· Pendiente$/)).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Buscar producto" })).toBeVisible();
  });
});
