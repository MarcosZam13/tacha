import { describe, expect, it } from "vitest";
import { formatEventDate, toLocalIsoDate } from "../utils/eventDate";
import { validateDateListForm } from "../utils/validateDateListForm";

const TODAY = "2026-11-01";
const LONG_NAME = "a".repeat(61);

describe("toLocalIsoDate", () => {
  it("uses the local day, with zero padding", () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});

describe("formatEventDate", () => {
  it("keeps the day of the date, without the UTC shift (SPEC §5, rule 4)", () => {
    expect(formatEventDate("2026-12-20")).toContain("20");
    expect(formatEventDate("2026-12-20")).toContain("diciembre");
  });

  it("returns the text as is when it is not a date", () => {
    expect(formatEventDate("mañana")).toBe("mañana");
  });
});

describe("validateDateListForm", () => {
  it("accepts a name and today's date", () => {
    expect(validateDateListForm("Paseo", TODAY, TODAY)).toEqual({ dateError: null, nameError: null });
  });

  it("rejects a name with only spaces", () => {
    expect(validateDateListForm("   ", TODAY, TODAY).nameError).not.toBeNull();
  });

  it("rejects a name over the database limit", () => {
    expect(validateDateListForm(LONG_NAME, TODAY, TODAY).nameError).not.toBeNull();
  });

  it("does not count the spaces around the name toward the limit", () => {
    expect(validateDateListForm(`  ${"a".repeat(60)}  `, TODAY, TODAY).nameError).toBeNull();
  });

  it("rejects an empty date and a past date", () => {
    expect(validateDateListForm("Paseo", "", TODAY).dateError).not.toBeNull();
    expect(validateDateListForm("Paseo", "2026-10-31", TODAY).dateError).not.toBeNull();
  });
});
