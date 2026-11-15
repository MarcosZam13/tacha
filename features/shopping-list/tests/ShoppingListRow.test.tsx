// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShoppingListRow } from "../components/ShoppingListRow";
import type { ShoppingListRowViewModel } from "../models/ShoppingListRowViewModel.interface";
import { createShoppingListRowPage } from "./ShoppingListRow.page";

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

const PRODUCT_NAME = "Leche entera";
const TRES_LECHES_NOTE = "+ 600 ml necesarios para Tres leches";
const FLAN_NOTE = "+ 200 g necesarios para Flan";

const createRow = (overrides: Partial<ShoppingListRowViewModel> = {}): ShoppingListRowViewModel => ({
  canDecrease: true,
  canIncrease: true,
  canRemove: true,
  canToggleChecked: true,
  displayedQuantity: 1,
  isChecked: false,
  item: {
    checkedAt: null,
    id: "item-leche",
    productName: PRODUCT_NAME,
    purchaseSessionId: null,
    quantity: 1,
    quantityBought: null,
    recipeShortfalls: [],
    sizeLabel: "1000 ml",
    variantId: "variant-leche",
  },
  requestedNote: null,
  shortfallNotes: [TRES_LECHES_NOTE],
  ...overrides,
});

const renderRow = (row: ShoppingListRowViewModel, onToggleChecked = vi.fn(), assigneeSlot?: React.ReactNode) =>
  render(
    <ul>
      <ShoppingListRow
        assigneeSlot={assigneeSlot}
        onDecrease={vi.fn()}
        onIncrease={vi.fn()}
        onOpenDetail={vi.fn()}
        onRemove={vi.fn()}
        onToggleChecked={onToggleChecked}
        row={row}
      />
    </ul>,
  );

describe("ShoppingListRow: recipe shortfall note (SCRUM-114)", () => {
  it("shows the note under the product, one line per recipe (CA-01)", () => {
    renderRow(createRow({ shortfallNotes: [TRES_LECHES_NOTE, FLAN_NOTE] }));
    const page = createShoppingListRowPage(PRODUCT_NAME);

    expect(page.getShortfallNoteTexts()).toEqual([TRES_LECHES_NOTE, FLAN_NOTE]);
  });

  it("does not check the row when the note is tapped (CA-02)", async () => {
    const onToggleChecked = vi.fn();
    renderRow(createRow(), onToggleChecked);
    const page = createShoppingListRowPage(PRODUCT_NAME);

    await page.clickShortfallNote(TRES_LECHES_NOTE);

    expect(onToggleChecked).not.toHaveBeenCalled();
  });

  it("keeps the note out of the check button, and describes the button with it", () => {
    renderRow(createRow());
    const page = createShoppingListRowPage(PRODUCT_NAME);

    expect(page.getToggleButton()).not.toContainElement(page.getShortfallNote(TRES_LECHES_NOTE));
    expect(page.getToggleButton()).toHaveAccessibleDescription(TRES_LECHES_NOTE);
  });

  it("does not strike through the note on a checked row", () => {
    renderRow(createRow({ isChecked: true }));
    const page = createShoppingListRowPage(PRODUCT_NAME);

    expect(page.getShortfallNotes()).not.toHaveClass("line-through");
    expect(page.getShortfallNote(TRES_LECHES_NOTE)).not.toHaveClass("line-through");
  });

  it("draws nothing extra and no description when the row has no shortfalls", () => {
    renderRow(createRow({ shortfallNotes: [] }));
    const page = createShoppingListRowPage(PRODUCT_NAME);

    expect(page.queryShortfallNotes()).toBeNull();
    expect(page.getToggleButton()).not.toHaveAttribute("aria-describedby");
  });
});

describe("ShoppingListRow: assignee slot (SCRUM-108)", () => {
  it("draws the slot it is given inside the row, outside the check button", () => {
    renderRow(createRow(), vi.fn(), <span>Encargado: Ana</span>);
    const page = createShoppingListRowPage(PRODUCT_NAME);

    expect(page.getRow()).toContainElement(screen.getByText("Encargado: Ana"));
    expect(page.getToggleButton()).not.toContainElement(screen.getByText("Encargado: Ana"));
  });

  it("draws nothing extra when there is no slot", () => {
    renderRow(createRow());

    expect(screen.queryByText("Encargado: Ana")).toBeNull();
  });
});
