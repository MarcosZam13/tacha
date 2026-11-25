// @vitest-environment jsdom
import { act, cleanup, render, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InventorySuggestions } from "../InventorySuggestions";
import type { InventorySuggestion } from "../models/InventorySuggestion.interface";
import type { InventorySuggestionsProps } from "../models/InventorySuggestionsProps.interface";
import { dismissInventorySuggestion, getInventorySuggestions } from "../services/inventory-suggestions.service";
import { createInventorySuggestionsPage } from "./InventorySuggestions.page";

// Sin Supabase real: las sugerencias salen de un servicio simulado.
vi.mock("../services/inventory-suggestions.service", () => ({
  dismissInventorySuggestion: vi.fn(),
  getInventorySuggestions: vi.fn(),
}));
const getInventorySuggestionsMock = vi.mocked(getInventorySuggestions);
const dismissInventorySuggestionMock = vi.mocked(dismissInventorySuggestion);

// Sin globals de Vitest, Testing Library no limpia el DOM sola entre tests.
afterEach(cleanup);

// Fecha fija para que "hace N días" no dependa del día en que corre el test.
const NOW = new Date(2026, 10, 24, 9, 0);

const onConfirm = vi.fn<InventorySuggestionsProps["onConfirm"]>();

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  onConfirm.mockResolvedValue(true);
  dismissInventorySuggestionMock.mockResolvedValue(undefined);
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

const renderSuggestions = (pendingVariantIds: string[] = []) =>
  render(<InventorySuggestions onConfirm={onConfirm} pendingVariantIds={pendingVariantIds} />);

describe("InventorySuggestions", () => {
  it("muestra una tarjeta por sugerencia, en el orden de la base", async () => {
    getInventorySuggestionsMock.mockResolvedValue([MILK, RICE]);
    const page = createInventorySuggestionsPage();

    renderSuggestions();

    const region = await page.findRegion();
    const cards = page.getCards(region);
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText("Leche")).toBeTruthy();
    expect(within(cards[1]).getByText("Arroz")).toBeTruthy();
  });

  it("cada tarjeta muestra la presentación y hace cuánto se compró", async () => {
    getInventorySuggestionsMock.mockResolvedValue([MILK]);
    const page = createInventorySuggestionsPage();

    renderSuggestions();

    const card = page.getCard(await page.findRegion(), "Leche");
    expect(within(card).getByText("1000 ml")).toBeTruthy();
    expect(within(card).getByText("Lo compraste hace 9 días")).toBeTruthy();
  });

  it("sin sugerencias no dibuja nada", async () => {
    getInventorySuggestionsMock.mockResolvedValue([]);
    const page = createInventorySuggestionsPage();

    const { container } = renderSuggestions();
    // Deja que la promesa del servicio termine: así se afirma lo que queda después, no el estado inicial.
    await act(async () => {});

    expect(getInventorySuggestionsMock).toHaveBeenCalledTimes(1);
    expect(page.queryRegion()).toBeNull();
    expect(container.innerHTML).toBe("");
  });

  it("si la carga falla no dibuja nada ni muestra un error (CA-03)", async () => {
    getInventorySuggestionsMock.mockRejectedValue(new Error("network"));
    const page = createInventorySuggestionsPage();

    const { container } = renderSuggestions();
    await act(async () => {});

    expect(getInventorySuggestionsMock).toHaveBeenCalledTimes(1);
    expect(page.queryRegion()).toBeNull();
    expect(container.innerHTML).toBe("");
  });

  it("si la presentación se agrega a la lista después de cargar, la tarjeta desaparece (D11)", async () => {
    getInventorySuggestionsMock.mockResolvedValue([MILK, RICE]);
    const page = createInventorySuggestionsPage();
    const { rerender } = renderSuggestions();
    await page.findRegion();

    rerender(<InventorySuggestions onConfirm={onConfirm} pendingVariantIds={[MILK.variantId]} />);

    const cards = page.queryCards();
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByText("Arroz")).toBeTruthy();
  });

  it("no ofrece una presentación que ya está pendiente en la lista", async () => {
    getInventorySuggestionsMock.mockResolvedValue([MILK, RICE]);
    const page = createInventorySuggestionsPage();

    renderSuggestions([MILK.variantId]);

    const cards = page.getCards(await page.findRegion());
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByText("Arroz")).toBeTruthy();
  });
});

// SCRUM-104 (HU-71): ✓ y ✕ en cada tarjeta.
describe("InventorySuggestions: confirmar o descartar (SCRUM-104)", () => {
  beforeEach(() => {
    vi.useRealTimers();
    getInventorySuggestionsMock.mockResolvedValue([MILK, RICE]);
  });

  it("cada tarjeta tiene un ✓ y una ✕ con el nombre del producto (CA-01)", async () => {
    const page = createInventorySuggestionsPage();
    renderSuggestions();
    await page.findRegion();

    expect(page.getConfirmButton("Leche")).toBeTruthy();
    expect(page.getDismissButton("Leche")).toBeTruthy();
    expect(page.getConfirmButton("Arroz")).toBeTruthy();
    expect(page.getDismissButton("Arroz")).toBeTruthy();
  });

  it("el ✓ manda a agregar la presentación de la tarjeta y la saca de la fila (CA-01, CA-02)", async () => {
    const page = createInventorySuggestionsPage();
    renderSuggestions();
    await page.findRegion();

    await page.confirm("Leche");

    expect(onConfirm).toHaveBeenCalledExactlyOnceWith({
      productName: "Leche",
      sizeLabel: "1000 ml",
      variantId: MILK.variantId,
    });
    expect(page.queryCards()).toHaveLength(1);
    expect(page.queryError()).toBeNull();
  });

  it("si no se pudo agregar, la tarjeta vuelve con un mensaje", async () => {
    onConfirm.mockResolvedValue(false);
    const page = createInventorySuggestionsPage();
    renderSuggestions();
    await page.findRegion();

    await page.confirm("Leche");

    await waitFor(() => expect(page.queryCards()).toHaveLength(2));
    expect(page.queryError()).toHaveTextContent("No se pudo guardar. Intenta de nuevo.");
  });

  it("la ✕ pospone el producto y saca la tarjeta, sin agregar nada (CA-01, CA-03)", async () => {
    const page = createInventorySuggestionsPage();
    renderSuggestions();
    await page.findRegion();

    await page.dismiss("Arroz");

    expect(dismissInventorySuggestionMock).toHaveBeenCalledExactlyOnceWith(RICE.variantId);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(page.queryCards()).toHaveLength(1);
  });

  it("si no se pudo posponer, la tarjeta vuelve con un mensaje", async () => {
    dismissInventorySuggestionMock.mockRejectedValue(new Error("network"));
    const page = createInventorySuggestionsPage();
    renderSuggestions();
    await page.findRegion();

    await page.dismiss("Arroz");

    await waitFor(() => expect(page.queryCards()).toHaveLength(2));
    expect(page.queryError()).toHaveTextContent("No se pudo guardar. Intenta de nuevo.");
  });

  it("con la última tarjeta resuelta, la fila desaparece (CA-04)", async () => {
    getInventorySuggestionsMock.mockResolvedValue([MILK]);
    const page = createInventorySuggestionsPage();
    renderSuggestions();
    await page.findRegion();

    await page.dismiss("Leche");

    expect(page.queryRegion()).toBeNull();
  });
});

describe("InventorySuggestions: el ✓ que rechaza (SCRUM-104)", () => {
  it("si agregar rechaza en vez de devolver false, la tarjeta vuelve con el mensaje", async () => {
    vi.useRealTimers();
    getInventorySuggestionsMock.mockResolvedValue([MILK]);
    onConfirm.mockRejectedValue(new Error("network"));
    const page = createInventorySuggestionsPage();
    renderSuggestions();
    await page.findRegion();

    await page.confirm("Leche");

    await waitFor(() => expect(page.queryCards()).toHaveLength(1));
    expect(page.queryError()).toHaveTextContent("No se pudo guardar. Intenta de nuevo.");
  });
});
