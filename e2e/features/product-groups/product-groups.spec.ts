import { expect, test } from "@playwright/test";
import {
  GROUPS_PATH,
  LIST_PATH,
  getBackToListLink,
  getGeneralNavLink,
  getGroupsEmptyState,
  getGroupsTitle,
  getManageGroupsLink,
} from "./product-groups.helpers";

// Escenarios: features/product-groups/specs/E2E.md. Cada test arranca con un
// navegador nuevo, o sea un usuario anónimo nuevo sin grupos. Los textos y
// rutas se escriben acá a propósito (oráculo independiente del código).
// Ningún test crea datos: no hay limpieza.

test.describe("Mis grupos", () => {
  test("E2E-GRUPOS-01 — Entrar a Mis grupos desde General", async ({ page }) => {
    await page.goto(LIST_PATH);

    await getManageGroupsLink(page).click();

    await expect(page).toHaveURL(GROUPS_PATH);
    await expect(getGroupsTitle(page)).toBeVisible();
    // Es una pantalla secundaria de General: el menú sigue marcando General.
    await expect(getGeneralNavLink(page)).toHaveAttribute("aria-current", "page");
  });

  test("E2E-GRUPOS-02 — Sin grupos se ve el estado vacío y se puede volver", async ({ page }) => {
    await page.goto(GROUPS_PATH);

    await expect(getGroupsEmptyState(page)).toBeVisible();

    await getBackToListLink(page).click();
    await expect(page).toHaveURL(LIST_PATH);
  });
});
