import { describe, expect, it } from "vitest";
import { CATALOG_BASE_UNIT } from "@/constants";
import type { AddRecipeToListResponse } from "../models/recipe-list-addition.interfaces";
import { toAddToListSummaryText } from "../utils/toAddToListSummaryText";

const createResponse = (overrides: Partial<AddRecipeToListResponse> = {}): AddRecipeToListResponse => ({
  addedProductNames: [],
  missingItems: [],
  skippedProductNames: [],
  ...overrides,
});

describe("toAddToListSummaryText", () => {
  it("says the recipe was added", () => {
    expect(toAddToListSummaryText(createResponse({ addedProductNames: ["Leche"] }))).toEqual([
      "Agregaste la receta a tu lista.",
    ]);
  });

  it("lists what is missing with its quantity, also when no row was added", () => {
    expect(
      toAddToListSummaryText(
        createResponse({
          missingItems: [
            { productName: "Leche", quantity: 2500.5, unit: CATALOG_BASE_UNIT.MILLILITERS },
            { productName: "Harina", quantity: 300, unit: CATALOG_BASE_UNIT.GRAMS },
          ],
        }),
      ),
    ).toEqual(["Agregaste la receta a tu lista.", "Te falta comprar: Leche (2500,5 ml), Harina (300 g)"]);
  });

  it("says the list already had everything", () => {
    expect(toAddToListSummaryText(createResponse())).toEqual(["Tu lista ya tenía lo necesario para esta receta."]);
  });

  it("only says what could not be added when that is all that happened", () => {
    expect(toAddToListSummaryText(createResponse({ skippedProductNames: ["Sal", "Azúcar"] }))).toEqual([
      "No se pudieron agregar: Sal, Azúcar",
    ]);
  });
});
