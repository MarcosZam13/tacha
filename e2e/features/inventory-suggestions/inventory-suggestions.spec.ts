import { expect, test } from "@playwright/test";
import {
  createSuggestionRow,
  getEmptyListMessage,
  getListErrors,
  getListSection,
  getSearchBox,
  getSuggestionCard,
  getSuggestionsRegion,
  openListWithSuggestions,
} from "./inventory-suggestions.helpers";

// Escenarios: features/inventory-suggestions/specs/E2E.md. Supabase se
// responde desde el test (helpers): la lista está vacía y solo cambia lo que
// devuelve la RPC de sugerencias. Los textos se escriben acá a propósito
// (oráculo independiente del código, playwright-e2e).
const MANY_PRODUCTS = ["Leche", "Arroz", "Huevos", "Café", "Jabón", "Pan", "Atún", "Azúcar"];

test.describe("Sugerencias de inventario", () => {
  test("E2E-INV-01 — Las sugerencias aparecen debajo del encabezado y antes de la lista", async ({ page }) => {
    await openListWithSuggestions(page, [createSuggestionRow("Leche", 9), createSuggestionRow("Arroz", 35)]);

    const region = getSuggestionsRegion(page);
    await expect(region).toBeVisible();
    await expect(region.getByRole("listitem")).toHaveCount(2);
    await expect(region.getByRole("listitem").first()).toContainText("Leche");
    await expect(region.getByRole("listitem").first()).toContainText("Lo compraste hace 9 días");

    const heading = page.getByRole("heading", { level: 1 });
    const headingBox = await heading.boundingBox();
    const regionBox = await region.boundingBox();
    const searchBox = await getSearchBox(page).boundingBox();
    expect(headingBox!.y).toBeLessThan(regionBox!.y);
    expect(regionBox!.y).toBeLessThan(searchBox!.y);
  });

  test("E2E-INV-02 — La fila se recorre deslizando sin mover la página", async ({ page }) => {
    await openListWithSuggestions(
      page,
      MANY_PRODUCTS.map((productName, index) => createSuggestionRow(productName, index + 8)),
    );

    const strip = getSuggestionsRegion(page).getByRole("list");
    await expect(strip.getByRole("listitem")).toHaveCount(MANY_PRODUCTS.length);
    const lastCard = strip.getByRole("listitem").last();
    await expect(lastCard).not.toBeInViewport();

    await lastCard.scrollIntoViewIfNeeded();

    await expect(lastCard).toBeInViewport();
    const hasPageHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasPageHorizontalScroll).toBe(false);
  });

  test("E2E-INV-03 — Sin sugerencias no aparece la fila", async ({ page }) => {
    await openListWithSuggestions(page, []);

    await expect(getEmptyListMessage(page)).toBeVisible();
    await expect(getSuggestionsRegion(page)).toHaveCount(0);
  });

  test("E2E-INV-04 — Si las sugerencias fallan, la lista funciona igual", async ({ page }) => {
    await openListWithSuggestions(page, null);

    await expect(getEmptyListMessage(page)).toBeVisible();
    await expect(getSearchBox(page)).toBeEnabled();
    await expect(getSuggestionsRegion(page)).toHaveCount(0);
    await expect(getListErrors(page)).toHaveCount(0);
  });
});

// SCRUM-104 (HU-71): ✓ y ✕ en cada tarjeta.
test.describe("Sugerencias de inventario: confirmar o descartar", () => {
  test("E2E-INV-05 — El ✓ agrega el producto a la lista con cantidad 1", async ({ page }) => {
    const actions = await openListWithSuggestions(page, [
      createSuggestionRow("Leche", 9),
      createSuggestionRow("Arroz", 35),
    ]);

    await page.getByRole("button", { name: "Agregar Leche a la lista" }).click();

    await expect(getSuggestionCard(page, "Leche")).toHaveCount(0);
    await expect(getSuggestionCard(page, "Arroz")).toBeVisible();
    const pendingSection = getListSection(page, "Pendientes");
    await expect(pendingSection.getByRole("button", { name: /Leche/u })).toBeVisible();
    await expect(pendingSection.getByRole("listitem").filter({ hasText: "Leche" }).getByText("1", { exact: true })).toBeVisible();
    expect(actions.addRequests).toEqual([{ target_variant_id: "e2e-variant-Leche" }]);
    expect(actions.dismissRequests).toHaveLength(0);
  });

  test("E2E-INV-06 — La ✕ saca la sugerencia sin agregar nada", async ({ page }) => {
    const actions = await openListWithSuggestions(page, [
      createSuggestionRow("Leche", 9),
      createSuggestionRow("Arroz", 35),
    ]);

    await page.getByRole("button", { name: "Descartar Arroz" }).click();

    await expect(getSuggestionCard(page, "Arroz")).toHaveCount(0);
    await expect(getSuggestionCard(page, "Leche")).toBeVisible();
    await expect.poll(() => actions.dismissRequests).toEqual([{ target_variant_id: "e2e-variant-Arroz" }]);
    expect(actions.addRequests).toHaveLength(0);
    await expect(getEmptyListMessage(page)).toBeVisible();
  });

  test("E2E-INV-07 — Se puede ignorar la fila: la lista funciona igual", async ({ page }) => {
    const actions = await openListWithSuggestions(page, [createSuggestionRow("Leche", 9)]);

    await expect(getSuggestionCard(page, "Leche")).toBeVisible();
    await expect(getSearchBox(page)).toBeEnabled();
    await getSearchBox(page).fill("arroz");

    // La búsqueda corrió (la base simulada no devuelve productos): el buscador responde con la fila a la vista.
    await expect(page.getByText("No encontramos productos con ese nombre.")).toBeVisible();
    expect(actions.addRequests).toHaveLength(0);
    expect(actions.dismissRequests).toHaveLength(0);
    await expect(getSuggestionCard(page, "Leche")).toBeVisible();
  });
});
