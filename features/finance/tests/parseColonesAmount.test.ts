import { describe, expect, it } from "vitest";
import { COLONES_AMOUNT } from "../constants/finance.constants";
import { parseColonesAmount } from "../utils/parseColonesAmount";

describe("parseColonesAmount", () => {
  it("reads whole colones, trimming spaces around", () => {
    expect(parseColonesAmount("50000")).toEqual({ amount: 50000, isValid: true });
    expect(parseColonesAmount("  50000 ")).toEqual({ amount: 50000, isValid: true });
  });

  it("accepts ₡0 as a valid budget", () => {
    expect(parseColonesAmount("0")).toEqual({ amount: 0, isValid: true });
  });

  it("accepts thousands separators in groups of three", () => {
    expect(parseColonesAmount("50 000")).toEqual({ amount: 50000, isValid: true });
    expect(parseColonesAmount("50.000")).toEqual({ amount: 50000, isValid: true });
    expect(parseColonesAmount("1,250,000")).toEqual({ amount: 1250000, isValid: true });
  });

  it("rejects an empty field: a budget always has an amount", () => {
    expect(parseColonesAmount("")).toEqual({ isValid: false });
    expect(parseColonesAmount("   ")).toEqual({ isValid: false });
  });

  it("rejects what is not a whole amount, instead of guessing", () => {
    // "12.5" podría ser 12,5 o 125: no se adivina.
    expect(parseColonesAmount("12.5")).toEqual({ isValid: false });
    expect(parseColonesAmount("12 50")).toEqual({ isValid: false });
    expect(parseColonesAmount("abc")).toEqual({ isValid: false });
    expect(parseColonesAmount("-5")).toEqual({ isValid: false });
    expect(parseColonesAmount("₡50000")).toEqual({ isValid: false });
    expect(parseColonesAmount("1e5")).toEqual({ isValid: false });
  });

  it("accepts the database limit and rejects one colón more", () => {
    expect(parseColonesAmount(String(COLONES_AMOUNT.MAX))).toEqual({ amount: 9_999_999_999, isValid: true });
    expect(parseColonesAmount("9 999 999 999")).toEqual({ amount: 9_999_999_999, isValid: true });
    expect(parseColonesAmount("10000000000")).toEqual({ isValid: false });
  });

  it("gives the same answer on repeated calls", () => {
    // El patrón no lleva /g: .test no guarda estado entre llamadas.
    expect(parseColonesAmount("50000")).toEqual(parseColonesAmount("50000"));
  });
});
