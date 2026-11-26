import { describe, expect, it } from "vitest";
import { toShortfallSnapshots } from "../utils/toShortfallSnapshots";
import { toUndoReturnsToText } from "../utils/toUndoReturnsToText";

describe("toShortfallSnapshots", () => {
  it("maps each resolved row to what it goes back to", () => {
    const snapshots = toShortfallSnapshots([
      {
        list_item_id: "item-leche",
        previous_base_quantity: 1000,
        previous_base_unit: "ml",
        previous_quantity_requested: 1,
      },
    ]);

    expect(snapshots.get("item-leche")).toEqual({ previousQuantity: 1, previousSizeLabel: "1000 ml" });
  });
});

describe("toUndoReturnsToText", () => {
  it("says what the row goes back to (rule 45)", () => {
    const text = toUndoReturnsToText("Leche Dos Pinos", { previousQuantity: 1, previousSizeLabel: "1000 ml" });

    expect(text).toBe("La fila vuelve a 1 × Leche Dos Pinos (1000 ml).");
  });
});
