import { describe, expect, it } from "vitest";
import { CATALOG_BASE_UNIT } from "@/constants";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import { isBoughtInSession, toShoppingListRow } from "../utils/toShoppingListRow";

const SESSION_ID = "session-maxipali";
const OTHER_SESSION_ID = "session-masxmenos";
const CHECKED_AT = "2026-10-09T15:30:00.000Z";

const createItem = (overrides: Partial<ShoppingListItem> = {}): ShoppingListItem => ({
  checkedAt: null,
  id: "item-leche",
  productName: "Leche entera",
  purchaseSessionId: null,
  quantity: 2,
  quantityBought: null,
  recipeShortfalls: [],
  sizeLabel: "1000 ml",
  variantId: "variant-leche",
  ...overrides,
});

const boughtHere = (quantityBought: number): ShoppingListItem =>
  createItem({ checkedAt: CHECKED_AT, purchaseSessionId: SESSION_ID, quantityBought });

describe("isBoughtInSession", () => {
  it("is true only for a row bought in the active purchase", () => {
    expect(isBoughtInSession(boughtHere(2), SESSION_ID)).toBe(true);
    expect(isBoughtInSession(boughtHere(2), OTHER_SESSION_ID)).toBe(false);
    expect(isBoughtInSession(boughtHere(2), null)).toBe(false);
    expect(isBoughtInSession(createItem({ checkedAt: CHECKED_AT }), SESSION_ID)).toBe(false);
  });
});

describe("toShoppingListRow", () => {
  it("shows what was requested on a pending row, without a note", () => {
    const row = toShoppingListRow({ activeSessionId: SESSION_ID, isPending: false, item: createItem() });

    expect(row.displayedQuantity).toBe(2);
    expect(row.requestedNote).toBeNull();
    expect(row.isChecked).toBe(false);
  });

  it("shows what was bought on a row checked in the active purchase, and reminds what was requested", () => {
    const row = toShoppingListRow({ activeSessionId: SESSION_ID, isPending: false, item: boughtHere(3) });

    expect(row.displayedQuantity).toBe(3);
    expect(row.requestedNote).toBe("Pedido 2");
  });

  it("adds no note when what was bought matches what was requested", () => {
    const row = toShoppingListRow({ activeSessionId: SESSION_ID, isPending: false, item: boughtHere(2) });

    expect(row.requestedNote).toBeNull();
  });

  it("shows what was requested outside shopping mode, even on a row bought in a purchase", () => {
    const row = toShoppingListRow({ activeSessionId: null, isPending: false, item: boughtHere(3) });

    expect(row.displayedQuantity).toBe(2);
    expect(row.requestedNote).toBeNull();
  });

  it("does not let the shown quantity go below 1", () => {
    const row = toShoppingListRow({ activeSessionId: SESSION_ID, isPending: false, item: boughtHere(1) });

    expect(row.canDecrease).toBe(false);
    expect(row.canIncrease).toBe(true);
  });

  it("blocks every control while the row waits for the database", () => {
    const row = toShoppingListRow({ activeSessionId: SESSION_ID, isPending: true, item: boughtHere(3) });

    expect(row).toMatchObject({ canDecrease: false, canIncrease: false, canRemove: false, canToggleChecked: false });
  });

  it("writes one shortfall note per recipe, on pending and on checked rows (SCRUM-114)", () => {
    const recipeShortfalls = [
      { quantityMissing: 600, recipeName: "Tres leches", unit: CATALOG_BASE_UNIT.MILLILITERS },
      { quantityMissing: 200, recipeName: "Flan", unit: CATALOG_BASE_UNIT.GRAMS },
    ];
    const expectedNotes = ["+ 600 ml necesarios para Tres leches", "+ 200 g necesarios para Flan"];

    const pendingRow = toShoppingListRow({ activeSessionId: null, isPending: false, item: createItem({ recipeShortfalls }) });
    const checkedRow = toShoppingListRow({
      activeSessionId: null,
      isPending: false,
      item: createItem({ checkedAt: CHECKED_AT, recipeShortfalls }),
    });

    expect(pendingRow.shortfallNotes).toEqual(expectedNotes);
    expect(checkedRow.shortfallNotes).toEqual(expectedNotes);
  });

  it("has no shortfall notes when the row has no shortfalls", () => {
    const row = toShoppingListRow({ activeSessionId: null, isPending: false, item: createItem() });

    expect(row.shortfallNotes).toEqual([]);
  });
});
