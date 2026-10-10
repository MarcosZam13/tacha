import { describe, expect, it } from "vitest";
import { INACTIVITY } from "../constants/login.constants";
import { parseInactivityLimit } from "../utils/parseInactivityLimit";

describe("parseInactivityLimit", () => {
  it("uses a valid number of minutes as is", () => {
    expect(parseInactivityLimit("45")).toBe(45);
  });

  it("accepts the minimum allowed", () => {
    expect(parseInactivityLimit(String(INACTIVITY.MIN_MINUTES))).toBe(INACTIVITY.MIN_MINUTES);
  });

  it("accepts the maximum allowed", () => {
    expect(parseInactivityLimit(String(INACTIVITY.MAX_MINUTES))).toBe(INACTIVITY.MAX_MINUTES);
  });

  it.each([
    ["undefined", undefined],
    ["an empty string", ""],
    ["blank spaces", "   "],
    ["text", "abc"],
    ["zero", "0"],
    ["a negative number", "-5"],
    ["less than the minimum", "0.5"],
    ["infinity", "Infinity"],
    ["more than the maximum", String(INACTIVITY.MAX_MINUTES + 1)],
    ["a huge number that overflows setTimeout", "99999999"],
  ])("falls back to the default when the value is %s", (_label, raw) => {
    expect(parseInactivityLimit(raw)).toBe(INACTIVITY.DEFAULT_MINUTES);
  });
});
