import { expect, test } from "@playwright/test";
import {
  AFTER_EXPIRY_TIMEOUT_MS,
  COLD_START_TEST_TIMEOUT_MS,
  LIST_PATH,
  LOGIN_PATH,
  getInactivityNotice,
  openListWithSession,
  prepareControlledSession,
  warmUpRoutes,
} from "./login-inactivity.helpers";

// Escenarios: features/login/specs/E2E.md. Los tiempos y los textos se escriben acá a propósito
// (oráculo independiente del código, playwright-e2e). Límite por defecto: 30 minutos.
test.describe("Login — cierre por inactividad", () => {
  test.describe.configure({ timeout: COLD_START_TEST_TIMEOUT_MS });

  test.beforeAll(async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext({ baseURL });
    await warmUpRoutes(request);
    await request.dispose();
  });

  test.beforeEach(async ({ page }) => {
    await prepareControlledSession(page);
  });

  test("E2E-INACT-01 — Sin actividad durante 30 minutos se cierra la sesión", async ({ page }) => {
    await openListWithSession(page);
    await expect(page).toHaveURL(LIST_PATH);

    await page.clock.runFor("31:00");

    await expect(page).toHaveURL(LOGIN_PATH, { timeout: AFTER_EXPIRY_TIMEOUT_MS });
    await expect(getInactivityNotice(page)).toBeVisible();
  });

  test("E2E-INACT-02 — La actividad reinicia el conteo", async ({ page }) => {
    await openListWithSession(page);

    await page.clock.runFor("29:00");
    await page.keyboard.press("Shift");
    await page.clock.runFor("29:00");

    await expect(page).toHaveURL(LIST_PATH);
    await expect(getInactivityNotice(page)).toBeHidden();

    await page.clock.runFor("02:00");

    await expect(page).toHaveURL(LOGIN_PATH, { timeout: AFTER_EXPIRY_TIMEOUT_MS });
    await expect(getInactivityNotice(page)).toBeVisible();
  });

  test("E2E-INACT-03 — El aviso aparece una sola vez", async ({ page }) => {
    await page.goto(LOGIN_PATH);
    await expect(getInactivityNotice(page)).toBeHidden();

    await openListWithSession(page);
    await page.clock.runFor("31:00");
    await expect(getInactivityNotice(page)).toBeVisible({ timeout: AFTER_EXPIRY_TIMEOUT_MS });

    await page.reload();
    await expect(getInactivityNotice(page)).toBeHidden();

    await page.goto(`${LOGIN_PATH}?motivo=inactividad`);
    await expect(getInactivityNotice(page)).toBeHidden();
  });
});
