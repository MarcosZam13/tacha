import { expect, test, type Page } from "@playwright/test";

// Escenarios: components/ui/modal/specs/E2E.md (SCRUM-142). Corren en Chromium real (desktop y Pixel 7)
// sobre la demo de /ui-kit, que solo existe en desarrollo y no usa la base de datos. Los textos se
// escriben acá a propósito (oráculo independiente del código, playwright-e2e).
const UI_KIT_PATH = "/ui-kit";
const OPEN_BUTTON = "Abrir modal";
const DIALOG_TITLE = "Confirmar acción";
const CANCEL = "Cancelar";
const CONFIRM = "Confirmar";
// Un punto del fondo oscuro, fuera de la tarjeta del diálogo (la esquina superior izquierda).
const BACKDROP_POINT = { x: 4, y: 4 };

const getDialog = (page: Page) => page.getByRole("dialog", { name: DIALOG_TITLE });
const getOpenButton = (page: Page) => page.getByRole("button", { name: OPEN_BUTTON });

const openDialog = async (page: Page): Promise<void> => {
  await page.goto(UI_KIT_PATH);
  await getOpenButton(page).click();
  await expect(getDialog(page)).toBeVisible();
};

test.describe("Modal compartido: foco (SCRUM-142)", () => {
  test("E2E-MODAL-01 — Al abrir, el foco pasa al primer elemento del diálogo", async ({ page }) => {
    await openDialog(page);

    await expect(getDialog(page).getByRole("button", { name: CANCEL })).toBeFocused();
  });

  test("E2E-MODAL-02 — Tab y Shift+Tab no salen del diálogo", async ({ page }) => {
    await openDialog(page);

    await page.keyboard.press("Tab");
    await expect(getDialog(page).getByRole("button", { name: CONFIRM })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(getDialog(page).getByRole("button", { name: CANCEL })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(getDialog(page).getByRole("button", { name: CONFIRM })).toBeFocused();
  });

  test("E2E-MODAL-03 — Escape cierra y devuelve el foco al botón que lo abrió", async ({ page }) => {
    await openDialog(page);

    await page.keyboard.press("Escape");

    await expect(getDialog(page)).toBeHidden();
    await expect(getOpenButton(page)).toBeFocused();
  });

  test("E2E-MODAL-04 — Un clic en el fondo cierra y devuelve el foco al botón que lo abrió", async ({ page }) => {
    await openDialog(page);

    await page.mouse.click(BACKDROP_POINT.x, BACKDROP_POINT.y);

    await expect(getDialog(page)).toBeHidden();
    await expect(getOpenButton(page)).toBeFocused();
  });
});
