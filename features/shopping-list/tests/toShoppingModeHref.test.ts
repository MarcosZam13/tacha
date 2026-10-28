import { describe, expect, it } from "vitest";
import { toShoppingModeHref } from "../utils/toShoppingModeHref";

describe("toShoppingModeHref", () => {
  it("puts the purchase in the list URL", () => {
    expect(toShoppingModeHref("8f14e45f-ceea-467a-9575-4b4f1d0a3c21")).toBe(
      "/lista?compra=8f14e45f-ceea-467a-9575-4b4f1d0a3c21",
    );
  });

  it("escapes anything that is not part of an id", () => {
    expect(toShoppingModeHref("a&b=c")).toBe("/lista?compra=a%26b%3Dc");
  });
});
