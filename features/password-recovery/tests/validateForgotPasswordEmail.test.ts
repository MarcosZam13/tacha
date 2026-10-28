import { describe, expect, it } from "vitest";
import { FORGOT_PASSWORD_ERROR_MESSAGE } from "../constants/password-recovery.constants";
import { validateForgotPasswordEmail } from "../utils/validateForgotPasswordEmail";

describe("validateForgotPasswordEmail", () => {
  it("accepts a valid email", () => {
    expect(validateForgotPasswordEmail("ana@correo.com")).toBeUndefined();
  });

  it("accepts a valid email with uppercase letters and surrounding spaces", () => {
    expect(validateForgotPasswordEmail("  Ana@Correo.COM  ")).toBeUndefined();
  });

  it.each([
    ["an empty string", ""],
    ["only spaces", "   "],
  ])("asks for the email when it is %s", (_label, email) => {
    expect(validateForgotPasswordEmail(email)).toBe(FORGOT_PASSWORD_ERROR_MESSAGE.EMAIL_REQUIRED);
  });

  it.each([
    ["has no at sign", "anacorreo.com"],
    ["has no domain", "ana@"],
    ["has no dot in the domain", "ana@correo"],
    ["has spaces inside", "ana @correo.com"],
    ["has no name before the at sign", "@correo.com"],
  ])("rejects an email that %s", (_label, email) => {
    expect(validateForgotPasswordEmail(email)).toBe(FORGOT_PASSWORD_ERROR_MESSAGE.EMAIL_INVALID);
  });
});
