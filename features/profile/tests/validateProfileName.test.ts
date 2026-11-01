import { describe, expect, it } from "vitest";
import { PROFILE_ERROR_MESSAGE, PROFILE_NAME_MAX_LENGTH } from "../constants/profile.constants";
import { validateProfileName } from "../utils/validateProfileName";

describe("validateProfileName", () => {
  it("accepts a normal name", () => {
    expect(validateProfileName("Ana Pérez")).toBeUndefined();
  });

  it.each([["empty", ""], ["only spaces", "   "]])("requires the name when it is %s", (_label, name) => {
    expect(validateProfileName(name)).toBe(PROFILE_ERROR_MESSAGE.NAME_REQUIRED);
  });

  it("accepts a name of exactly the maximum length, ignoring the spaces around it", () => {
    expect(validateProfileName(` ${"a".repeat(PROFILE_NAME_MAX_LENGTH)} `)).toBeUndefined();
  });

  it("rejects a name longer than the maximum", () => {
    expect(validateProfileName("a".repeat(PROFILE_NAME_MAX_LENGTH + 1))).toBe(
      PROFILE_ERROR_MESSAGE.NAME_TOO_LONG,
    );
  });
});
