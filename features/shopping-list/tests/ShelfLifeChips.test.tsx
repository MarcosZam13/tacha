// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShelfLifeChips } from "../components/ShelfLifeChips";
import { SHELF_LIFE_CHOICE } from "../constants/shelf-life.constants";
import type { ShelfLifeChipsViewModel } from "../models/ShelfLifeChipsViewModel.interface";
import { createShelfLifeChipsPage } from "./ShelfLifeChips.page";

// Sin globals de Vitest, Testing Library no limpia el DOM sola entre tests.
afterEach(cleanup);

const PRODUCT_NAME = "Leche";

const createChips = (overrides: Partial<ShelfLifeChipsViewModel> = {}): ShelfLifeChipsViewModel => ({
  errorMessage: null,
  isSaving: false,
  itemId: "item-leche",
  onChoose: vi.fn(),
  selectedChoice: null,
  ...overrides,
});

describe("ShelfLifeChips (SCRUM-103)", () => {
  it("muestra los cuatro chips en el orden de la historia (CA-01)", () => {
    render(<ShelfLifeChips chips={createChips()} productName={PRODUCT_NAME} />);
    const page = createShelfLifeChipsPage(PRODUCT_NAME);

    expect(page.getChips().map((chip) => chip.textContent)).toEqual([
      "Vence en pocos días",
      "2-4 semanas",
      "1-3 meses",
      "No vence / no aplica",
    ]);
  });

  it("sin elegir, ningún chip está marcado (CA-02)", () => {
    render(<ShelfLifeChips chips={createChips()} productName={PRODUCT_NAME} />);
    const page = createShelfLifeChipsPage(PRODUCT_NAME);

    page.getChips().forEach((chip) => expect(chip).toHaveAttribute("aria-pressed", "false"));
  });

  it("marca el chip elegido", () => {
    render(
      <ShelfLifeChips
        chips={createChips({ selectedChoice: SHELF_LIFE_CHOICE.ONE_TO_THREE_MONTHS })}
        productName={PRODUCT_NAME}
      />,
    );
    const page = createShelfLifeChipsPage(PRODUCT_NAME);

    expect(page.getChip("1-3 meses")).toHaveAttribute("aria-pressed", "true");
    expect(page.getChip("2-4 semanas")).toHaveAttribute("aria-pressed", "false");
  });

  it("tocar un chip lo elige, sin pedir confirmación (CA-03)", async () => {
    const chips = createChips();
    render(<ShelfLifeChips chips={chips} productName={PRODUCT_NAME} />);
    const page = createShelfLifeChipsPage(PRODUCT_NAME);

    await page.clickChip("2-4 semanas");

    expect(chips.onChoose).toHaveBeenCalledExactlyOnceWith(SHELF_LIFE_CHOICE.TWO_TO_FOUR_WEEKS);
  });

  it("mientras guarda, los chips no se pueden tocar", () => {
    render(<ShelfLifeChips chips={createChips({ isSaving: true })} productName={PRODUCT_NAME} />);
    const page = createShelfLifeChipsPage(PRODUCT_NAME);

    page.getChips().forEach((chip) => expect(chip).toBeDisabled());
  });

  it("muestra el error si no se pudo guardar", () => {
    render(
      <ShelfLifeChips
        chips={createChips({ errorMessage: "No se pudo guardar. Intenta de nuevo." })}
        productName={PRODUCT_NAME}
      />,
    );
    const page = createShelfLifeChipsPage(PRODUCT_NAME);

    expect(page.queryError()).toHaveTextContent("No se pudo guardar. Intenta de nuevo.");
  });
});
