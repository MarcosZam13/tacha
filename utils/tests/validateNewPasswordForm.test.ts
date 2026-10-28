import { describe, expect, it } from "vitest";
import { NEW_PASSWORD_ERROR_MESSAGE, NEW_PASSWORD_FIELD } from "@/constants";
import { hasNewPasswordErrors, validateNewPasswordForm } from "../validateNewPasswordForm";

const STRONG_PASSWORD = "Tacha2026!";
// Cumple 4 de las 5 reglas (sin carácter especial): nivel intermedio, que se acepta.
const MEDIUM_PASSWORD = "Tacha2026";
// 8 caracteres pero solo cumple 2 de las 5 reglas (largo y número): nivel débil.
const WEAK_PASSWORD = "12345678";

describe("validateNewPasswordForm", () => {
  it("accepts a strong password that matches its repetition", () => {
    const errors = validateNewPasswordForm({ confirmPassword: STRONG_PASSWORD, newPassword: STRONG_PASSWORD });

    expect(hasNewPasswordErrors(errors)).toBe(false);
  });

  it("accepts a medium-strength password", () => {
    const errors = validateNewPasswordForm({ confirmPassword: MEDIUM_PASSWORD, newPassword: MEDIUM_PASSWORD });

    expect(hasNewPasswordErrors(errors)).toBe(false);
  });

  it("asks for both fields when they are empty", () => {
    const errors = validateNewPasswordForm({ confirmPassword: "", newPassword: "" });

    expect(errors[NEW_PASSWORD_FIELD.NEW_PASSWORD]).toBe(NEW_PASSWORD_ERROR_MESSAGE.PASSWORD_REQUIRED);
    expect(errors[NEW_PASSWORD_FIELD.CONFIRM_PASSWORD]).toBe(NEW_PASSWORD_ERROR_MESSAGE.CONFIRM_REQUIRED);
    expect(hasNewPasswordErrors(errors)).toBe(true);
  });

  it("rejects a password shorter than the minimum, even if it repeats correctly", () => {
    const errors = validateNewPasswordForm({ confirmPassword: "Ab1!", newPassword: "Ab1!" });

    expect(errors[NEW_PASSWORD_FIELD.NEW_PASSWORD]).toBe(NEW_PASSWORD_ERROR_MESSAGE.PASSWORD_TOO_SHORT);
    expect(hasNewPasswordErrors(errors)).toBe(true);
  });

  it("rejects a long enough password of weak strength: swapping a weak password for another weak one defeats the purpose", () => {
    const errors = validateNewPasswordForm({ confirmPassword: WEAK_PASSWORD, newPassword: WEAK_PASSWORD });

    expect(errors[NEW_PASSWORD_FIELD.NEW_PASSWORD]).toBe(NEW_PASSWORD_ERROR_MESSAGE.PASSWORD_TOO_WEAK);
    expect(hasNewPasswordErrors(errors)).toBe(true);
  });

  it("rejects a repetition that does not match", () => {
    const errors = validateNewPasswordForm({ confirmPassword: "Otra2026!", newPassword: STRONG_PASSWORD });

    expect(errors[NEW_PASSWORD_FIELD.NEW_PASSWORD]).toBeUndefined();
    expect(errors[NEW_PASSWORD_FIELD.CONFIRM_PASSWORD]).toBe(NEW_PASSWORD_ERROR_MESSAGE.PASSWORDS_MISMATCH);
    expect(hasNewPasswordErrors(errors)).toBe(true);
  });
});
