import { describe, expect, it } from "vitest";
import { toAddRecipeToListResponse } from "../utils/toAddRecipeToListResponse";

describe("toAddRecipeToListResponse", () => {
  it("adapts what the database returns", () => {
    expect(
      toAddRecipeToListResponse({
        added: ["Leche"],
        missing: [{ product_name: "Harina", quantity: 300, unit: "g" }],
        skipped: ["Sal"],
      }),
    ).toEqual({
      addedProductNames: ["Leche"],
      missingItems: [{ productName: "Harina", quantity: 300, unit: "g" }],
      skippedProductNames: ["Sal"],
    });
  });

  it("keeps the lists empty when nothing was added, missing or skipped", () => {
    expect(toAddRecipeToListResponse({ added: [], missing: [], skipped: [] })).toEqual({
      addedProductNames: [],
      missingItems: [],
      skippedProductNames: [],
    });
  });
});
