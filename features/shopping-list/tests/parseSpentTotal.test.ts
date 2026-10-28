import { describe, expect, it } from "vitest";
import { parseSpentTotal } from "../utils/parseSpentTotal";

describe("parseSpentTotal", () => {
  it("treats an empty field as 'no total', which is allowed", () => {
    expect(parseSpentTotal("")).toEqual({ isValid: true, total: null });
    expect(parseSpentTotal("   ")).toEqual({ isValid: true, total: null });
  });

  it("reads whole colones", () => {
    expect(parseSpentTotal("12500")).toEqual({ isValid: true, total: 12500 });
    expect(parseSpentTotal(" 0 ")).toEqual({ isValid: true, total: 0 });
  });

  it("accepts thousands separators in groups of three", () => {
    expect(parseSpentTotal("12 500")).toEqual({ isValid: true, total: 12500 });
    expect(parseSpentTotal("12.500")).toEqual({ isValid: true, total: 12500 });
    expect(parseSpentTotal("1,250,000")).toEqual({ isValid: true, total: 1250000 });
  });

  it("rejects what is not a whole amount, instead of guessing", () => {
    // "12.5" podría ser 12,5 o 125: no se adivina.
    expect(parseSpentTotal("12.5")).toEqual({ isValid: false });
    expect(parseSpentTotal("abc")).toEqual({ isValid: false });
    expect(parseSpentTotal("-5")).toEqual({ isValid: false });
    expect(parseSpentTotal("₡12500")).toEqual({ isValid: false });
  });

  it("rejects an amount larger than the database column can hold", () => {
    expect(parseSpentTotal("10000000000")).toEqual({ isValid: false });
  });
});
