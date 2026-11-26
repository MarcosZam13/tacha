import { expect, test } from "@playwright/test";
import { CALLBACK_PATH, REGISTER_PATH, stubProviderCancellation } from "./social-sign-up.helpers";

// Escenarios: features/social-sign-up/specs/E2E.md. Los textos se escriben acá a propósito
// (oráculo independiente del código, playwright-e2e).
test.describe("Registro con proveedor externo", () => {
  test("E2E-SOCIAL-01 — Se muestran los botones de Google y Facebook", async ({ page }) => {
    await page.goto(REGISTER_PATH);

    await expect(page.getByRole("button", { name: "Registrarse con Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrarse con Facebook" })).toBeVisible();
  });

  test("E2E-SOCIAL-02 — El botón abre el flujo del proveedor y cancelar muestra el error", async ({ page }) => {
    const authorizeUrls = await stubProviderCancellation(page);
    await page.goto(REGISTER_PATH);

    await page.getByRole("button", { name: "Registrarse con Facebook" }).click();

    await expect(page.getByRole("heading", { name: "No pudimos completar el registro" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver al registro" })).toBeVisible();
    expect(authorizeUrls[0]).toContain("provider=facebook");
    expect(authorizeUrls[0]).toContain(encodeURIComponent(CALLBACK_PATH));
  });

  test("E2E-SOCIAL-03 — Abrir la página de retorno sin iniciar el flujo muestra el error", async ({ page }) => {
    await page.goto(CALLBACK_PATH);

    await expect(page.getByRole("heading", { name: "No pudimos completar el registro" })).toBeVisible();
  });
});
