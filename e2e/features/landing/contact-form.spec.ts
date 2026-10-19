import { expect, test } from "@playwright/test";
import {
  FAKE_CAPTCHA_LABEL,
  FAKE_CAPTCHA_TOKEN,
  HOME_PATH,
  fillContactForm,
  getContactRegion,
  stubContactFunction,
  stubRecaptcha,
} from "./contact-form.helpers";

// Escenarios: features/landing/specs/E2E.md. Los textos se escriben acá a propósito
// (oráculo independiente del código, playwright-e2e).
const VALID_FORM = {
  email: "ana@correo.com",
  message: "Hola, quiero saber más de Tacha.",
  name: "Ana",
};

test.describe("Contacto desde la página de inicio", () => {
  test.beforeEach(async ({ page }) => {
    await stubRecaptcha(page);
  });

  test("E2E-CONTACTO-01 — Desde la navbar se llega al formulario y el envío se confirma", async ({ page }) => {
    const requests = await stubContactFunction(page, { body: { received: true }, status: 201 });
    await page.goto(HOME_PATH);

    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Contacto" })
      .click();
    await expect(page).toHaveURL(/#formulario-contacto$/);

    const region = getContactRegion(page);
    await fillContactForm(page, VALID_FORM);
    await region.getByRole("button", { name: FAKE_CAPTCHA_LABEL }).click();
    await region.getByRole("button", { name: "Enviar mensaje" }).click();

    await expect(region.getByRole("status")).toHaveText(
      "¡Gracias! Recibimos tu mensaje y te vamos a responder al correo que nos dejaste.",
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].postDataJSON()).toEqual({
      ...VALID_FORM,
      captchaToken: FAKE_CAPTCHA_TOKEN,
      source: "landing",
    });
  });

  test("E2E-CONTACTO-02 — Sin reCAPTCHA no se envía", async ({ page }) => {
    const requests = await stubContactFunction(page, { body: { received: true }, status: 201 });
    await page.goto(HOME_PATH);
    const region = getContactRegion(page);

    await fillContactForm(page, VALID_FORM);
    await region.getByRole("button", { name: "Enviar mensaje" }).click();

    await expect(region.getByRole("alert")).toHaveText("Confirmá que no sos un robot.");
    expect(requests).toHaveLength(0);
  });

  test("E2E-CONTACTO-03 — Un error del servidor se informa y el texto se conserva", async ({ page }) => {
    await stubContactFunction(page, { body: { code: "server_error" }, status: 500 });
    await page.goto(HOME_PATH);
    const region = getContactRegion(page);

    await fillContactForm(page, VALID_FORM);
    await region.getByRole("button", { name: FAKE_CAPTCHA_LABEL }).click();
    await region.getByRole("button", { name: "Enviar mensaje" }).click();

    await expect(region.getByRole("alert")).toHaveText(
      "No pudimos enviar tu mensaje. Intentá de nuevo en unos minutos.",
    );
    await expect(region.getByLabel("Nombre")).toHaveValue("Ana");
  });
});
