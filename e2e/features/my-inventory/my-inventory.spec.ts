import { expect, test } from "@playwright/test";
import {
  INVENTORY_PATH,
  LIST_PATH,
  createCatalogRow,
  createInventoryRow,
  getGroup,
  getGroupTitles,
  stubInventory,
  stubInventoryWithActions,
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

test.describe("Mi inventario: Ya se acabó y ajustar la fecha", () => {
  test("E2E-MINV-05 — Ya se acabó saca el producto de la pantalla", async ({ page }) => {
    const calls = await stubInventoryWithActions(
      page,
      [createInventoryRow("Leche", 3), createInventoryRow("Café", 20)],
      [createInventoryRow("Café", 20)],
    );
    await page.goto(INVENTORY_PATH);

    await page.getByRole("button", { name: "Ya se acabó: Leche" }).click();

    await expect(page.getByText("Leche", { exact: true })).toHaveCount(0);
    await expect(getGroup(page, "Este mes")).toContainText("Café");
    expect(calls.usedUp).toEqual([{ target_variant_id: "e2e-variant-Leche" }]);
  });

  test("E2E-MINV-06 — Ajustar fecha con un chip mueve el producto de grupo", async ({ page }) => {
    const calls = await stubInventoryWithActions(page, [createInventoryRow("Leche", 3)], [createInventoryRow("Leche", 21)]);
    await page.goto(INVENTORY_PATH);

    await page.getByRole("button", { name: "Ajustar fecha: Leche" }).click();
    const chips = page.getByRole("group", { name: "¿Cuánto te va a durar Leche?" });
    await expect(chips.getByRole("button")).toHaveText([
      "Vence en pocos días",
      "2-4 semanas",
      "1-3 meses",
      "No vence / no aplica",
    ]);
    // Los cuatro chips se ven sin mover la página de lado (también en el celular).
    for (const chip of await chips.getByRole("button").all()) {
      await expect(chip).toBeInViewport();
    }
    const hasPageHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasPageHorizontalScroll).toBe(false);

    await chips.getByRole("button", { name: "2-4 semanas" }).click();

    await expect(getGroupTitles(page)).toHaveText(["Este mes"]);
    await expect(getGroup(page, "Este mes")).toContainText("Te quedan 21 días");
    await expect(chips).toHaveCount(0);
    expect(calls.adjust).toEqual([{ target_choice: "two_to_four_weeks", target_variant_id: "e2e-variant-Leche" }]);
  });
});

test.describe("Mi inventario: agregar a mano", () => {
  test("E2E-MINV-07 — Agregar algo que ya había en casa, con un chip", async ({ page }) => {
    const calls = await stubInventoryWithActions(page, [], [createInventoryRow("Leche", 21)], [createCatalogRow("Leche")]);
    await page.goto(INVENTORY_PATH);

    await page.getByRole("button", { name: "+ Agregar a mi inventario" }).click();
    const panel = page.getByRole("group", { name: "Agregar a mi inventario" });
    await panel.getByRole("combobox", { name: "Buscar producto" }).fill("le");
    await page.getByRole("option", { name: /^Leche\s*1000 ml$/u }).click();
    await panel.getByRole("button", { name: "2-4 semanas" }).click();
    const hasPageHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasPageHorizontalScroll).toBe(false);
    await panel.getByRole("button", { name: "Agregar", exact: true }).click();

    await expect(panel).toHaveCount(0);
    await expect(getGroup(page, "Este mes")).toContainText("Leche");
    await expect(getGroup(page, "Este mes")).toContainText("Te quedan 21 días");
    expect(calls.add).toEqual([{ target_choice: "two_to_four_weeks", target_variant_id: "e2e-variant-Leche" }]);
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
