import { expect, test } from "@playwright/test";

// SCRUM-144 (en SCRUM-158): quien ya tiene cuenta llega al login desde el registro.
// La entrada desde la navbar de la landing la cubre SCRUM-159 (E2E-NAVBAR-01).
// Escenarios: features/landing/specs/E2E.md. Los textos se escriben acá a
// propósito (oráculo independiente del código).
test.describe("Entrada al login desde las páginas públicas", () => {
  test("E2E-LOGIN-ENTRADA-02 — Desde el registro se llega al login", async ({ page }) => {
    await page.goto("/registro");

    await page.getByRole("link", { name: "Iniciá sesión" }).click();

    await expect(page).toHaveURL(/\/login$/);
  });
});
