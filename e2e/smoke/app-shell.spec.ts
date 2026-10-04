import { expect, test } from "@playwright/test";

// Prueba de infraestructura, no de una historia: confirma que Playwright
// levanta la app y que la ruta raíz responde.
const ROOT_PATH = "/";

test.describe("App shell", () => {
  test("SMOKE-01 — La ruta raíz responde y renderiza", async ({ page }) => {
    const response = await page.goto(ROOT_PATH);

    expect(response?.ok()).toBe(true);
    await expect(page.locator("body")).toBeVisible();
  });
});
