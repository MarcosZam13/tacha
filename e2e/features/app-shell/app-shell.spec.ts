import { expect, test } from "@playwright/test";
import {
  LANDING_PATH,
  LIST_PATH,
  getAnyAppNav,
  getPublicNav,
  getSectionLink,
  getVisibleAppNav,
} from "./app-shell.helpers";

// Escenarios: components/app-shell/specs/E2E.md. Los textos y rutas se
// escriben acá a propósito (oráculo independiente del código, playwright-e2e).
const SECTIONS = [
  { label: "Recetas", path: "/recetas" },
  { label: "Catálogo", path: "/catalogo" },
  { label: "Mi familia", path: "/household" },
  { label: "General", path: "/lista" },
] as const;

test.describe("App shell", () => {
  test("E2E-SHELL-01 — Navegar entre las secciones de la app", async ({ page }) => {
    await page.goto(LIST_PATH);
    const nav = getVisibleAppNav(page);
    await expect(nav).toHaveCount(1);

    for (const section of SECTIONS) {
      await getSectionLink(nav, section.label).click();

      await expect(page).toHaveURL(section.path);
      await expect(getSectionLink(nav, section.label)).toHaveAttribute("aria-current", "page");
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    }
  });

  test("E2E-SHELL-02 — Las páginas públicas no tienen el shell", async ({ page }) => {
    await page.goto(LANDING_PATH);

    await expect(getPublicNav(page)).toBeVisible();
    await expect(getAnyAppNav(page)).toHaveCount(0);
  });
});
