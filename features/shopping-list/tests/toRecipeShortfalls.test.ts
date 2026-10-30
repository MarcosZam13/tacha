import { describe, expect, it } from "vitest";
import { toRecipeShortfalls } from "../utils/toRecipeShortfalls";

describe("toRecipeShortfalls", () => {
  it("groups the shortfalls by list row, one per recipe, in the database order", () => {
    const shortfallsByItemId = toRecipeShortfalls([
      { list_item_id: "item-leche", quantity_missing: 600, quantity_unit: "ml", recipe_name: "Tres leches" },
      { list_item_id: "item-harina", quantity_missing: 150, quantity_unit: "g", recipe_name: "Queque" },
      { list_item_id: "item-leche", quantity_missing: 200, quantity_unit: "ml", recipe_name: "Flan" },
    ]);

    expect(shortfallsByItemId.get("item-leche")).toEqual([
      { quantityMissing: 600, recipeName: "Tres leches", unit: "ml" },
      { quantityMissing: 200, recipeName: "Flan", unit: "ml" },
    ]);
    expect(shortfallsByItemId.get("item-harina")).toEqual([{ quantityMissing: 150, recipeName: "Queque", unit: "g" }]);
  });

  it("returns no shortfalls when the list has none", () => {
    expect(toRecipeShortfalls([]).size).toBe(0);
  });
});
