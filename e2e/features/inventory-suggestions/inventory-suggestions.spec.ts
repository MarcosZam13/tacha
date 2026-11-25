import { expect, test } from "@playwright/test";
import {
  createSuggestionRow,
  getEmptyListMessage,
  getListErrors,
  getSearchBox,
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
