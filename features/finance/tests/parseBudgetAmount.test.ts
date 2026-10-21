import { describe, expect, it } from "vitest";
import { BUDGET_AMOUNT } from "../constants/finance.constants";
import { parseBudgetAmount } from "../utils/parseBudgetAmount";

describe("parseBudgetAmount", () => {
  it("reads whole colones, trimming spaces around", () => {
    expect(parseBudgetAmount("50000")).toEqual({ amount: 50000, isValid: true });
    expect(parseBudgetAmount("  50000 ")).toEqual({ amount: 50000, isValid: true });
  });

  it("accepts ₡0 as a valid budget", () => {
    expect(parseBudgetAmount("0")).toEqual({ amount: 0, isValid: true });
  });

  it("accepts thousands separators in groups of three", () => {
    expect(parseBudgetAmount("50 000")).toEqual({ amount: 50000, isValid: true });
    expect(parseBudgetAmount("50.000")).toEqual({ amount: 50000, isValid: true });
    expect(parseBudgetAmount("1,250,000")).toEqual({ amount: 1250000, isValid: true });
  });

  it("rejects an empty field: a budget always has an amount", () => {
    expect(parseBudgetAmount("")).toEqual({ isValid: false });
    expect(parseBudgetAmount("   ")).toEqual({ isValid: false });
  });

  it("rejects what is not a whole amount, instead of guessing", () => {
    // "12.5" podría ser 12,5 o 125: no se adivina.
    expect(parseBudgetAmount("12.5")).toEqual({ isValid: false });
    expect(parseBudgetAmount("12 50")).toEqual({ isValid: false });
    expect(parseBudgetAmount("abc")).toEqual({ isValid: false });
    expect(parseBudgetAmount("-5")).toEqual({ isValid: false });
    expect(parseBudgetAmount("₡50000")).toEqual({ isValid: false });
    expect(parseBudgetAmount("1e5")).toEqual({ isValid: false });
  });

  it("accepts the database limit and rejects one colón more", () => {
    expect(parseBudgetAmount(String(BUDGET_AMOUNT.MAX))).toEqual({ amount: 9_999_999_999, isValid: true });
    expect(parseBudgetAmount("9 999 999 999")).toEqual({ amount: 9_999_999_999, isValid: true });
    expect(parseBudgetAmount("10000000000")).toEqual({ isValid: false });
  });

  it("gives the same answer on repeated calls", () => {
    // El patrón no lleva /g: .test no guarda estado entre llamadas.
    expect(parseBudgetAmount("50000")).toEqual(parseBudgetAmount("50000"));
  });
});
