import { expect, test } from "@playwright/test";

// Escenario E2E-NAVBAR-01: features/landing/specs/E2E.md. Los textos se escriben acá
// a propósito (oráculo independiente del código, playwright-e2e).
const HOME_PATH = "/";
const LOGIN_PATH = "/login";

test.describe("Navbar pública", () => {
  test("E2E-NAVBAR-01 — Un visitante llega al login desde la navbar", async ({ page }) => {
    await page.goto(HOME_PATH);
    const navbar = page.getByRole("navigation", { name: "Navegación principal" });

    await expect(navbar.getByRole("link", { name: "Registrarse" })).toBeVisible();
    await navbar.getByRole("link", { name: "Iniciar sesión" }).click();

    await expect(page).toHaveURL(LOGIN_PATH);
  });
});
