import { describe, expect, it } from "vitest";
import { USER_NAME_MAX_LENGTH } from "@/constants";
import { COMPLETE_SIGN_UP_ERROR } from "../constants/complete-sign-up.constants";
import { validateSignUpName } from "../utils/validateSignUpName";

describe("validateSignUpName", () => {
  // SCRUM-43, CA-02
  it.each(["", "   "])("rejects the empty name %j", (name) => {
    expect(validateSignUpName(name)).toBe(COMPLETE_SIGN_UP_ERROR.NAME_REQUIRED);
  });

  it("accepts a one-letter name", () => {
    expect(validateSignUpName("A")).toBeUndefined();
  });

  it("accepts a name right at the maximum, ignoring the spaces around it", () => {
    expect(validateSignUpName(` ${"a".repeat(USER_NAME_MAX_LENGTH)} `)).toBeUndefined();
  });

  it("rejects a name over the maximum, the same limit as the profile", () => {
    expect(validateSignUpName("a".repeat(USER_NAME_MAX_LENGTH + 1))).toBe(COMPLETE_SIGN_UP_ERROR.NAME_TOO_LONG);
  });
});
