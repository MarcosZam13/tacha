// @vitest-environment jsdom
import { act, cleanup, render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InventorySuggestions } from "../InventorySuggestions";
import type { InventorySuggestion } from "../models/InventorySuggestion.interface";
import { getInventorySuggestions } from "../services/inventory-suggestions.service";
import { createInventorySuggestionsPage } from "./InventorySuggestions.page";

// Sin Supabase real: las sugerencias salen de un servicio simulado.
vi.mock("../services/inventory-suggestions.service", () => ({ getInventorySuggestions: vi.fn() }));
const getInventorySuggestionsMock = vi.mocked(getInventorySuggestions);

// Sin globals de Vitest, Testing Library no limpia el DOM sola entre tests.
afterEach(cleanup);

// Fecha fija para que "hace N días" no dependa del día en que corre el test.
const NOW = new Date(2026, 10, 24, 9, 0);

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

const MILK: InventorySuggestion = {
  lastPurchasedAt: new Date(2026, 10, 15, 18, 0).toISOString(),
  productName: "Leche",
  sizeLabel: "1000 ml",
  variantId: "variant-milk",
};

const RICE: InventorySuggestion = {
  lastPurchasedAt: new Date(2026, 9, 20, 10, 0).toISOString(),
  productName: "Arroz",
  sizeLabel: "1800 g",
  variantId: "variant-rice",
};

describe("InventorySuggestions", () => {
  it("muestra una tarjeta por sugerencia, en el orden de la base", async () => {
    getInventorySuggestionsMock.mockResolvedValue([MILK, RICE]);
    const page = createInventorySuggestionsPage();

    render(<InventorySuggestions />);

    const region = await page.findRegion();
    const cards = page.getCards(region);
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText("Leche")).toBeTruthy();
    expect(within(cards[1]).getByText("Arroz")).toBeTruthy();
  });

  it("cada tarjeta muestra la presentación y hace cuánto se compró", async () => {
    getInventorySuggestionsMock.mockResolvedValue([MILK]);
    const page = createInventorySuggestionsPage();

    render(<InventorySuggestions />);

    const card = page.getCard(await page.findRegion(), "Leche");
    expect(within(card).getByText("1000 ml")).toBeTruthy();
    expect(within(card).getByText("Lo compraste hace 9 días")).toBeTruthy();
  });

  it("sin sugerencias no dibuja nada", async () => {
    getInventorySuggestionsMock.mockResolvedValue([]);
    const page = createInventorySuggestionsPage();

    const { container } = render(<InventorySuggestions />);
    // Deja que la promesa del servicio termine: así se afirma lo que queda después, no el estado inicial.
    await act(async () => {});

    expect(getInventorySuggestionsMock).toHaveBeenCalledTimes(1);
    expect(page.queryRegion()).toBeNull();
    expect(container.innerHTML).toBe("");
  });

  it("si la carga falla no dibuja nada ni muestra un error (CA-03)", async () => {
    getInventorySuggestionsMock.mockRejectedValue(new Error("network"));
    const page = createInventorySuggestionsPage();

    const { container } = render(<InventorySuggestions />);
    await act(async () => {});

    expect(getInventorySuggestionsMock).toHaveBeenCalledTimes(1);
    expect(page.queryRegion()).toBeNull();
    expect(container.innerHTML).toBe("");
  });
});
