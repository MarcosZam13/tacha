import { expect, test } from "@playwright/test";
import {
  COLD_START_TEST_TIMEOUT_MS,
  clickLinkUntilNavigated,
  FORGOT_PASSWORD_PATH,
  LOGIN_PATH,
  NAVIGATION_TIMEOUT_MS,
  RECOVER_RESPONSE,
  getEmailField,
  getSubmitButton,
  requestResetLink,
  stubRecoverRequests,
  warmUpRoutes,
} from "./password-recovery.helpers";
import type { RecoverResponse } from "./password-recovery.helpers";

// Escenarios: features/password-recovery/specs/E2E.md. Los textos se escriben acá a propósito
// (oráculo independiente del código, playwright-e2e).
const SENT_MESSAGE =
  "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisá también la carpeta de spam.";
const NETWORK_ERROR_MESSAGE = "No pudimos enviar el correo. Intentá de nuevo en unos minutos.";
const INVALID_EMAIL_MESSAGE = "Ingresá un correo válido.";

test.describe("Recuperación de contraseña", () => {
  test.describe.configure({ timeout: COLD_START_TEST_TIMEOUT_MS });

  test.beforeAll(async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext({ baseURL });
    await warmUpRoutes(request);
    await request.dispose();
  });

  test("E2E-RECOVERY-01 — Llegar a la pantalla desde el login", async ({ page }) => {
    await page.goto(LOGIN_PATH);

    await clickLinkUntilNavigated(
      page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }),
      page,
      FORGOT_PASSWORD_PATH,
    );

    await expect(page.getByRole("heading", { name: "Recuperar contraseña" })).toBeVisible();
    await expect(getEmailField(page)).toBeVisible();
    await expect(getSubmitButton(page)).toBeDisabled();
  });

  test("E2E-RECOVERY-02 — Un correo inválido no se envía", async ({ page }) => {
    const received = await stubRecoverRequests(page, [RECOVER_RESPONSE.SUCCESS]);
    await page.goto(FORGOT_PASSWORD_PATH);

    await expect(getSubmitButton(page)).toBeDisabled();
    await expect(page.getByText(INVALID_EMAIL_MESSAGE)).toBeHidden();

    await getEmailField(page).fill("ana@");

    await expect(page.getByText(INVALID_EMAIL_MESSAGE)).toBeVisible();
    await expect(getSubmitButton(page)).toBeDisabled();
    expect(received).toHaveLength(0);
  });

  const SAME_CONFIRMATION_CASES: { label: string; response: RecoverResponse }[] = [
    { label: "Supabase accepts the request", response: RECOVER_RESPONSE.SUCCESS },
    { label: "Supabase rate limits the request", response: RECOVER_RESPONSE.RATE_LIMIT },
    { label: "Supabase fails on the server", response: RECOVER_RESPONSE.SERVER_ERROR },
  ];

  for (const { label, response } of SAME_CONFIRMATION_CASES) {
    test(`E2E-RECOVERY-03 — La confirmación es la misma (${label})`, async ({ page }) => {
      const received = await stubRecoverRequests(page, [response]);
      await page.goto(FORGOT_PASSWORD_PATH);

      await requestResetLink(page, "  Ana@Correo.COM ");

      await expect(page.getByText(SENT_MESSAGE)).toBeVisible();
      await expect(page.getByText(NETWORK_ERROR_MESSAGE)).toBeHidden();
      expect(received).toHaveLength(1);
      expect(received[0].postDataJSON()).toMatchObject({ email: "ana@correo.com" });
      expect(decodeURIComponent(received[0].url())).toMatch(/redirect_to=.+\/actualizar-contrasena$/);
    });
  }

  test("E2E-RECOVERY-04 — Un fallo de red se puede reintentar", async ({ page }) => {
    await stubRecoverRequests(page, [RECOVER_RESPONSE.NETWORK_FAILURE, RECOVER_RESPONSE.SUCCESS]);
    await page.goto(FORGOT_PASSWORD_PATH);

    await requestResetLink(page, "ana@correo.com");

    // Next trae su propio role="alert" (el anunciador de rutas): se busca el del error por su texto.
    await expect(page.getByRole("alert").filter({ hasText: NETWORK_ERROR_MESSAGE })).toBeVisible();
    await expect(getEmailField(page)).toHaveValue("ana@correo.com");
    await expect(getSubmitButton(page)).toBeEnabled();

    await getSubmitButton(page).click();

    await expect(page.getByText(SENT_MESSAGE)).toBeVisible();
  });

  test("E2E-RECOVERY-05 — Las salidas de la confirmación", async ({ page }) => {
    await stubRecoverRequests(page, [RECOVER_RESPONSE.SUCCESS]);
    await page.goto(FORGOT_PASSWORD_PATH);
    await requestResetLink(page, "ana@correo.com");
    await expect(page.getByText(SENT_MESSAGE)).toBeVisible();

    await page.getByRole("button", { name: "Usar otro correo" }).click();

    await expect(getEmailField(page)).toHaveValue("");
    await expect(getSubmitButton(page)).toBeDisabled();

    await requestResetLink(page, "ana@correo.com");
    await expect(page.getByText(SENT_MESSAGE)).toBeVisible();
    await page.getByRole("link", { name: "Volver al inicio de sesión" }).click();

    await expect(page).toHaveURL(LOGIN_PATH, { timeout: NAVIGATION_TIMEOUT_MS });
  });
});
