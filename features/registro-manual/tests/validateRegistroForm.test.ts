import { describe, expect, it } from "vitest";
import {
  REGISTRO_ERROR_MESSAGE,
  REGISTRO_FIELD,
  REGISTRO_PASSWORD_MIN_LENGTH,
} from "../constants/registro.constants";
import type { RegistroFormValues } from "../models/RegistroFormValues.interface";
import {
  hasRegistroErrors,
  isRegistroFormComplete,
  validatePasswordsMatch,
  validateRegistroForm,
} from "../utils/validateRegistroForm";

const VALID_VALUES: RegistroFormValues = {
  confirmPassword: "Tacha2026!",
  email: "persona@example.com",
  name: "Persona",
  password: "Tacha2026!",
};

describe("validateRegistroForm", () => {
  it("returns no errors for a valid form", () => {
    const errors = validateRegistroForm(VALID_VALUES);

    expect(hasRegistroErrors(errors)).toBe(false);
  });

  it("rejects a name made only of spaces", () => {
    const errors = validateRegistroForm({ ...VALID_VALUES, name: "   " });

    expect(errors[REGISTRO_FIELD.NAME]).toBe(REGISTRO_ERROR_MESSAGE.NAME_REQUIRED);
  });

  it("rejects an email without a domain", () => {
    const errors = validateRegistroForm({ ...VALID_VALUES, email: "persona@" });

    expect(errors[REGISTRO_FIELD.EMAIL]).toBe(REGISTRO_ERROR_MESSAGE.EMAIL_INVALID);
  });

  it("accepts an email with surrounding spaces and capitals (it is normalized first)", () => {
    const errors = validateRegistroForm({ ...VALID_VALUES, email: "  Persona@Example.COM " });

    expect(errors[REGISTRO_FIELD.EMAIL]).toBeUndefined();
  });

  it("accepts a password of exactly the minimum length and rejects one character less", () => {
    const atMinimum = "a".repeat(REGISTRO_PASSWORD_MIN_LENGTH);
    const belowMinimum = "a".repeat(REGISTRO_PASSWORD_MIN_LENGTH - 1);

    const atMinimumErrors = validateRegistroForm({ ...VALID_VALUES, confirmPassword: atMinimum, password: atMinimum });
    const belowMinimumErrors = validateRegistroForm({
      ...VALID_VALUES,
      confirmPassword: belowMinimum,
      password: belowMinimum,
    });

    expect(atMinimumErrors[REGISTRO_FIELD.PASSWORD]).toBeUndefined();
    expect(belowMinimumErrors[REGISTRO_FIELD.PASSWORD]).toBe(REGISTRO_ERROR_MESSAGE.PASSWORD_TOO_SHORT);
  });

  it("rejects passwords that do not match", () => {
    const errors = validateRegistroForm({ ...VALID_VALUES, confirmPassword: "Tacha2026?" });

    expect(errors[REGISTRO_FIELD.CONFIRM_PASSWORD]).toBe(REGISTRO_ERROR_MESSAGE.PASSWORDS_MISMATCH);
  });

  it("asks to repeat the password when the confirmation is empty, instead of saying they differ", () => {
    const errors = validateRegistroForm({ ...VALID_VALUES, confirmPassword: "" });

    expect(errors[REGISTRO_FIELD.CONFIRM_PASSWORD]).toBe(REGISTRO_ERROR_MESSAGE.REPEAT_PASSWORD_REQUIRED);
  });
});

describe("validatePasswordsMatch", () => {
  it("does not compare while the confirmation is still empty", () => {
    expect(validatePasswordsMatch("Tacha2026!", "")).toBeUndefined();
  });
});

describe("isRegistroFormComplete", () => {
  it("is true only when every field has something typed", () => {
    expect(isRegistroFormComplete(VALID_VALUES)).toBe(true);
    expect(isRegistroFormComplete({ ...VALID_VALUES, confirmPassword: "" })).toBe(false);
  });
});
