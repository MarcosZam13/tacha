import { describe, expect, it } from "vitest";
import { hasContactErrors, validateContactForm } from "../utils/validateContactForm";

const VALID_VALUES = {
  email: "ana@correo.com",
  message: "Hola, quiero saber más de Tacha.",
  name: "Ana",
};

describe("validateContactForm", () => {
  it("accepts a complete form with valid data", () => {
    expect(hasContactErrors(validateContactForm(VALID_VALUES))).toBe(false);
  });

  it("marks every field as required when they only have spaces", () => {
    const errors = validateContactForm({ email: "  ", message: "   ", name: " " });

    expect(errors).toEqual({
      email: "El correo es obligatorio.",
      message: "El mensaje es obligatorio.",
      name: "El nombre es obligatorio.",
    });
  });

  it.each([
    ["without a domain", "ana@"],
    ["without an at sign", "ana.correo.com"],
    ["with spaces inside", "ana maria@correo.com"],
  ])("rejects an email %s", (_label, email) => {
    expect(validateContactForm({ ...VALID_VALUES, email }).email).toBe("Ingresá un correo válido.");
  });

  it("accepts an email with outer spaces and capitals, because it is normalized", () => {
    expect(validateContactForm({ ...VALID_VALUES, email: "  Ana@Correo.COM " }).email).toBeUndefined();
  });

  it("rejects a name of one character, not counting outer spaces", () => {
    expect(validateContactForm({ ...VALID_VALUES, name: " A " }).name).toBe(
      "El nombre debe tener al menos 2 caracteres.",
    );
  });

  it("rejects a message shorter than 10 characters", () => {
    expect(validateContactForm({ ...VALID_VALUES, message: "Hola" }).message).toBe(
      "El mensaje debe tener al menos 10 caracteres.",
    );
  });

  it("accepts a message of exactly 1000 characters and rejects one of 1001", () => {
    expect(validateContactForm({ ...VALID_VALUES, message: "a".repeat(1000) }).message).toBeUndefined();
    expect(validateContactForm({ ...VALID_VALUES, message: "a".repeat(1001) }).message).toBe(
      "El mensaje puede tener como máximo 1000 caracteres.",
    );
  });
});
