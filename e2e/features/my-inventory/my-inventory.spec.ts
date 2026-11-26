import { expect, test } from "@playwright/test";
import {
  INVENTORY_PATH,
  LIST_PATH,
  createInventoryRow,
  getGroup,
  getGroupTitles,
  stubInventory,
} from "./my-inventory.helpers";

// Escenarios: features/my-inventory/specs/E2E.md. Supabase se responde desde
// el test (helpers). Los textos se escriben acá a propósito (oráculo
// independiente del código, playwright-e2e).

test.describe("Mi inventario", () => {
  test("E2E-MINV-01 — Agrupa por urgencia con cuánto le queda a cada producto", async ({ page }) => {
    await stubInventory(page, [
      createInventoryRow("Leche", 3),
      createInventoryRow("Café", 20),
      createInventoryRow("Arroz", 60),
      createInventoryRow("Sal", null),
    ]);

    await page.goto(INVENTORY_PATH);

    await expect(page.getByRole("heading", { level: 1, name: "Mi inventario" })).toBeVisible();
    await expect(getGroupTitles(page)).toHaveText(["Vence pronto", "Este mes", "Más adelante", "Sin fecha estimada"]);
    await expect(getGroup(page, "Vence pronto").getByRole("listitem")).toContainText(["Leche"]);
    await expect(getGroup(page, "Vence pronto")).toContainText("Te quedan 3 días");
    await expect(getGroup(page, "Este mes")).toContainText("Te quedan 20 días");
    await expect(getGroup(page, "Más adelante")).toContainText("Te quedan 60 días");
    await expect(getGroup(page, "Sin fecha estimada")).toContainText("Sal");
    await expect(getGroup(page, "Sin fecha estimada")).not.toContainText("Te qued");
    const hasPageHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasPageHorizontalScroll).toBe(false);
  });

  test("E2E-MINV-02 — Sin nada en el inventario, un estado vacío simple", async ({ page }) => {
    await stubInventory(page, []);

    await page.goto(INVENTORY_PATH);

    await expect(
      page.getByText("Todavía no hay nada en tu inventario. Se llena solo cuando tachas productos al comprar."),
    ).toBeVisible();
    await expect(page.getByRole("region")).toHaveCount(0);
  });

  test("E2E-MINV-03 — Se entra desde General y se vuelve a la lista", async ({ page }) => {
    await stubInventory(page, [createInventoryRow("Leche", 3)]);
    await page.goto(LIST_PATH);

    // exact: "Ver mi inventario" (fila de sugerencias) también contiene "Mi inventario".
    await page.getByRole("link", { name: "Mi inventario", exact: true }).click();

    await expect(page).toHaveURL(INVENTORY_PATH);
    await expect(getGroup(page, "Vence pronto")).toContainText("Leche");

    await page.getByRole("link", { name: "← Volver a la lista" }).click();

    await expect(page).toHaveURL(LIST_PATH);
  });
});

test.describe("Mi inventario: desde la fila de sugerencias", () => {
  test("E2E-MINV-04 — Se entra con Ver mi inventario desde ¿Se te acabó?", async ({ page }) => {
    await stubInventory(page, [createInventoryRow("Leche", 3)], [createInventoryRow("Arroz", -5)]);
    await page.goto(LIST_PATH);

    const suggestionsRow = page.getByRole("region", { name: "¿Se te acabó?" });
    await suggestionsRow.getByRole("link", { name: "Ver mi inventario" }).click();

    await expect(page).toHaveURL(INVENTORY_PATH);
    await expect(getGroup(page, "Vence pronto")).toContainText("Leche");
  });
});
