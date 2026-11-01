import { describe, expect, it } from "vitest";
import { formatPurchaseDate } from "../utils/formatPurchaseDate";

describe("formatPurchaseDate", () => {
  it("shows the day with its weekday, without the time", () => {
    expect(formatPurchaseDate(new Date(2026, 9, 18, 15, 0).toISOString())).toBe("Domingo 18 de octubre");
  });

  it("uses the local day at both sides of midnight", () => {
    expect(formatPurchaseDate(new Date(2026, 9, 18, 23, 59).toISOString())).toBe("Domingo 18 de octubre");
    expect(formatPurchaseDate(new Date(2026, 9, 19, 0, 0).toISOString())).toBe("Lunes 19 de octubre");
  });
});
