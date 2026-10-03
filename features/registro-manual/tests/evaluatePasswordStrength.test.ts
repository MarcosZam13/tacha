import { describe, expect, it } from "vitest";
import {
  PASSWORD_RULE,
  PASSWORD_RULES,
  PASSWORD_STRENGTH_LEVEL,
  REGISTRO_PASSWORD_MIN_LENGTH,
} from "../constants/registro.constants";
import { evaluatePasswordStrength } from "../utils/evaluatePasswordStrength";

describe("evaluatePasswordStrength", () => {
  it("rates a password that meets every rule as strong", () => {
    const strength = evaluatePasswordStrength("Tacha2026!");

    expect(strength.level).toBe(PASSWORD_STRENGTH_LEVEL.STRONG);
    expect(strength.missingRules).toEqual([]);
    expect(strength.metCount).toBe(PASSWORD_RULES.length);
  });

  it("rates an empty password as weak with every rule missing, in display order", () => {
    const strength = evaluatePasswordStrength("");

    expect(strength.level).toBe(PASSWORD_STRENGTH_LEVEL.WEAK);
    expect(strength.metCount).toBe(0);
    expect(strength.missingRules).toEqual([...PASSWORD_RULES]);
  });

  it("is weak with two rules met and medium with three (MEDIUM_MIN boundary)", () => {
    // "ab": solo minúscula; "aB": minúscula + mayúscula; "aB1": + número.
    expect(evaluatePasswordStrength("aB").level).toBe(PASSWORD_STRENGTH_LEVEL.WEAK);
    expect(evaluatePasswordStrength("aB1").level).toBe(PASSWORD_STRENGTH_LEVEL.MEDIUM);
  });

  it("is still medium with four of five rules met (STRONG_MIN boundary)", () => {
    const strength = evaluatePasswordStrength("Tacha2026");

    expect(strength.level).toBe(PASSWORD_STRENGTH_LEVEL.MEDIUM);
    expect(strength.missingRules).toEqual([PASSWORD_RULE.SPECIAL]);
  });

  it("counts accented letters and ñ as lowercase and uppercase, not as special characters", () => {
    const strength = evaluatePasswordStrength("ÑANDÚ ñandú");

    expect(strength.missingRules).not.toContain(PASSWORD_RULE.LOWERCASE);
    expect(strength.missingRules).not.toContain(PASSWORD_RULE.UPPERCASE);
    // El espacio sí es especial; la ñ y las tildes no.
    expect(evaluatePasswordStrength("ñandúÑANDÚ").missingRules).toContain(PASSWORD_RULE.SPECIAL);
  });

  it("requires exactly the minimum length, not one more", () => {
    const atMinimum = "a".repeat(REGISTRO_PASSWORD_MIN_LENGTH);
    const belowMinimum = "a".repeat(REGISTRO_PASSWORD_MIN_LENGTH - 1);

    expect(evaluatePasswordStrength(atMinimum).missingRules).not.toContain(PASSWORD_RULE.MIN_LENGTH);
    expect(evaluatePasswordStrength(belowMinimum).missingRules).toContain(PASSWORD_RULE.MIN_LENGTH);
  });
});
