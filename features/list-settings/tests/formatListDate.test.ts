import { describe, expect, it } from "vitest";
import { formatListDate } from "../utils/formatListDate";

describe("formatListDate", () => {
  it("writes the day first, without going through a Date", () => {
    expect(formatListDate("2099-12-20")).toBe("20/12/2099");
  });

  it("keeps the first and the last day of a month on their own day", () => {
    expect(formatListDate("2026-11-01")).toBe("01/11/2026");
    expect(formatListDate("2026-11-30")).toBe("30/11/2026");
  });

  it("returns text that is not a date as it came", () => {
    expect(formatListDate("pronto")).toBe("pronto");
    expect(formatListDate("")).toBe("");
  });
});
