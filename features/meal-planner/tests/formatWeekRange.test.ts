import { describe, expect, it } from "vitest";
import { formatWeekRange } from "../utils/formatWeekRange";

describe("formatWeekRange", () => {
  it("writes the days once and the month once when the week stays in one month", () => {
    expect(formatWeekRange(new Date(2026, 9, 12))).toBe("12 – 18 oct");
  });

  it("writes the month at both ends when the week crosses a month", () => {
    expect(formatWeekRange(new Date(2026, 8, 28))).toBe("28 sep – 4 oct");
  });

  it("writes the month at both ends when the week crosses a year", () => {
    expect(formatWeekRange(new Date(2025, 11, 29))).toBe("29 dic – 4 ene");
  });

  it("ends in March when the week crosses the end of February in a common year", () => {
    expect(formatWeekRange(new Date(2026, 1, 23))).toBe("23 feb – 1 mar");
  });

  it("ends in March when the week crosses the leap day", () => {
    expect(formatWeekRange(new Date(2028, 1, 28))).toBe("28 feb – 5 mar");
  });

  it("does not pad one-digit days", () => {
    expect(formatWeekRange(new Date(2026, 9, 5))).toBe("5 – 11 oct");
  });
});
