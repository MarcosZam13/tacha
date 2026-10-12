import { expect, test } from "@playwright/test";
import { signInAsFakeUser, stubSupabaseApi } from "../../support/fake-session";
import {
  COLD_START_TEST_TIMEOUT_MS,
  FORGOT_PASSWORD_PATH,
  LOGIN_PATH,
  NAVIGATION_TIMEOUT_MS,
  RESET_PASSWORD_PATH,
  warmUpRoutes,
} from "./password-recovery.helpers";
import {
  EXPIRED_FRAGMENT,
  RECOVERY_EVENT,
  RECOVERY_FRAGMENT,
  UPDATE_RESPONSE,
  fillNewPassword,
  getConfirmPasswordField,
  getNewPasswordField,
  getSaveButton,
  stubSupabaseForRecovery,
} from "./reset-password.helpers";

// Escenarios: features/password-recovery/specs/E2E.md. Los textos y los tiempos se escriben acá a propósito
// (oráculo independiente del código, playwright-e2e).
const NEW_PASSWORD = "Prueba2026!";
const FORM_TITLE = "Nueva contraseña";
const INVALID_TITLE = "El enlace no es válido";
const DONE_TITLE = "Contraseña actualizada";
const PAUSE_AHEAD_MS = 1000;

test.describe("Recuperación de contraseña: actualizar la contraseña", () => {
  test.describe.configure({ timeout: COLD_START_TEST_TIMEOUT_MS });

  test.beforeAll(async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext({ baseURL });
    await warmUpRoutes(request);
    await request.dispose();
  });

  test("E2E-RESET-01 — Un enlace aceptado muestra el formulario y no deja el token en la URL", async ({ page }) => {
    await stubSupabaseForRecovery(page);

    await page.goto(`${RESET_PASSWORD_PATH}${RECOVERY_FRAGMENT}`);

    await expect(page.getByRole("heading", { name: FORM_TITLE })).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS });
    await expect(getNewPasswordField(page)).toBeVisible();
    await expect(getConfirmPasswordField(page)).toBeVisible();
    await expect(getSaveButton(page)).toBeDisabled();
    await expect(page).not.toHaveURL(/access_token/);
  });

  test("E2E-RESET-02 — Las reglas de la contraseña bloquean el guardado", async ({ page }) => {
    const requests = await stubSupabaseForRecovery(page);
    await page.goto(`${RESET_PASSWORD_PATH}${RECOVERY_FRAGMENT}`);
    await expect(getNewPasswordField(page)).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS });

    await fillNewPassword(page, NEW_PASSWORD, "Otra2026!");
    await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();
    await expect(getSaveButton(page)).toBeDisabled();

    await fillNewPassword(page, "12345678");
    await expect(getSaveButton(page)).toBeDisabled();

    await fillNewPassword(page, "Ab1!");
    await expect(getSaveButton(page)).toBeDisabled();

    expect(requests.updates).toHaveLength(0);
  });

  test("E2E-RESET-03 — Guardar cierra las demás sesiones, cambia la contraseña y cierra la de recuperación, en ese orden", async ({ page }) => {
    const requests = await stubSupabaseForRecovery(page);
    await page.goto(`${RESET_PASSWORD_PATH}${RECOVERY_FRAGMENT}`);
    await expect(getNewPasswordField(page)).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS });

    await fillNewPassword(page, NEW_PASSWORD);
    await getSaveButton(page).click();

    await expect(page.getByRole("heading", { name: DONE_TITLE })).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS });
    expect(requests.updates).toHaveLength(1);
    expect(requests.updates[0].postDataJSON()).toMatchObject({ password: NEW_PASSWORD });
    expect(requests.events).toEqual([RECOVERY_EVENT.REVOKE_OTHERS, RECOVERY_EVENT.UPDATE, RECOVERY_EVENT.SIGN_OUT_LOCAL]);

    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page).toHaveURL(LOGIN_PATH, { timeout: NAVIGATION_TIMEOUT_MS });
  });

  test("E2E-RESET-04 — Tras guardar, se va al inicio de sesión solo", async ({ page }) => {
    await page.clock.install();
    await stubSupabaseForRecovery(page);
    await page.goto(`${RESET_PASSWORD_PATH}${RECOVERY_FRAGMENT}`);
    await expect(getNewPasswordField(page)).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS });
    await fillNewPassword(page, NEW_PASSWORD);
    // `install()` deja correr el tiempo; se pausa antes de guardar para que solo avance con `runFor`.
    await page.clock.pauseAt(new Date(Date.now() + PAUSE_AHEAD_MS));
    await getSaveButton(page).click();
    await expect(page.getByRole("heading", { name: DONE_TITLE })).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS });

    await page.clock.runFor("00:02");
    // Supabase deja un "#" vacío al borrar el token del fragmento.
    await expect(page).toHaveURL(/\/actualizar-contrasena#?$/);

    await page.clock.runFor("00:02");
    await expect(page).toHaveURL(LOGIN_PATH, { timeout: NAVIGATION_TIMEOUT_MS });
  });

  test("E2E-RESET-05 — Un enlace vencido ofrece pedir otro", async ({ page }) => {
    await stubSupabaseForRecovery(page);

    await page.goto(`${RESET_PASSWORD_PATH}${EXPIRED_FRAGMENT}`);

    await expect(page.getByRole("heading", { name: INVALID_TITLE })).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS });
    await expect(page.getByText("El enlace para restablecer tu contraseña no es válido o ya venció.")).toBeVisible();
    await expect(getNewPasswordField(page)).toHaveCount(0);

    await page.getByRole("link", { name: "Pedir un enlace nuevo" }).click();

    await expect(page).toHaveURL(FORGOT_PASSWORD_PATH, { timeout: NAVIGATION_TIMEOUT_MS });
  });

  test("E2E-RESET-06 — Abrir la página a mano no deja cambiar la contraseña, ni con una sesión iniciada", async ({ page }) => {
    await stubSupabaseApi(page);
    await signInAsFakeUser(page);

    await page.goto(RESET_PASSWORD_PATH);

    await expect(page.getByRole("heading", { name: INVALID_TITLE })).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS });
    await expect(getNewPasswordField(page)).toHaveCount(0);
  });

  test("E2E-RESET-07 — Un fallo de red al guardar se puede reintentar sin perder lo escrito", async ({ page }) => {
    await stubSupabaseForRecovery(page, { updateResponses: [UPDATE_RESPONSE.NETWORK_FAILURE, UPDATE_RESPONSE.SUCCESS] });
    await page.goto(`${RESET_PASSWORD_PATH}${RECOVERY_FRAGMENT}`);
    await expect(getNewPasswordField(page)).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS });
    await fillNewPassword(page, NEW_PASSWORD);

    await getSaveButton(page).click();

    await expect(page.getByRole("alert").filter({ hasText: "No pudimos actualizar tu contraseña." })).toBeVisible();
    await expect(getNewPasswordField(page)).toHaveValue(NEW_PASSWORD);
    await expect(getConfirmPasswordField(page)).toHaveValue(NEW_PASSWORD);

    await getSaveButton(page).click();

    await expect(page.getByRole("heading", { name: DONE_TITLE })).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS });
  });

  test("E2E-RESET-08 — Una contraseña igual a la actual se rechaza con su mensaje", async ({ page }) => {
    await stubSupabaseForRecovery(page, { updateResponses: [UPDATE_RESPONSE.SAME_PASSWORD] });
    await page.goto(`${RESET_PASSWORD_PATH}${RECOVERY_FRAGMENT}`);
    await expect(getNewPasswordField(page)).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS });
    await fillNewPassword(page, NEW_PASSWORD);

    await getSaveButton(page).click();

    await expect(page.getByText("La nueva contraseña debe ser distinta de la actual.")).toBeVisible();
    await expect(getSaveButton(page)).toBeEnabled();
    await expect(page.getByRole("heading", { name: DONE_TITLE })).toBeHidden();
  });

  test("E2E-RESET-09 — Si no se pueden cerrar las demás sesiones, la contraseña no se cambia", async ({ page }) => {
    const requests = await stubSupabaseForRecovery(page, { revokeSucceeds: false });
    await page.goto(`${RESET_PASSWORD_PATH}${RECOVERY_FRAGMENT}`);
    await expect(getNewPasswordField(page)).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS });
    await fillNewPassword(page, NEW_PASSWORD);

    await getSaveButton(page).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "No pudimos cerrar tus otras sesiones, así que no cambiamos tu contraseña." }),
    ).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS });
    expect(requests.events).toEqual([RECOVERY_EVENT.REVOKE_OTHERS]);
    expect(requests.updates).toHaveLength(0);
    await expect(getNewPasswordField(page)).toHaveValue(NEW_PASSWORD);
    await expect(getSaveButton(page)).toBeEnabled();
    await expect(page.getByRole("heading", { name: DONE_TITLE })).toBeHidden();
  });

  test("E2E-RESET-10 — Recargar la página tras abrir el enlace muestra que ya no es válido", async ({ page }) => {
    await stubSupabaseForRecovery(page);
    await page.goto(`${RESET_PASSWORD_PATH}${RECOVERY_FRAGMENT}`);
    await expect(getNewPasswordField(page)).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS });

    await page.reload();

    await expect(page.getByRole("heading", { name: INVALID_TITLE })).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS });
    await expect(getNewPasswordField(page)).toHaveCount(0);
  });
});
