import { describe, expect, it } from "vitest";
import { NEW_PASSWORD_ERROR_MESSAGE } from "@/constants";
import { CHANGE_PASSWORD_ERROR_MESSAGE } from "../constants/change-password.constants";
import {
  isSameAsCurrentPassword,
  validateChangePasswordForm,
} from "../utils/validateChangePasswordForm";

const STRONG = "Tacha2026!";
const OTHER_STRONG = "Otra2027#";

describe("validateChangePasswordForm", () => {
  it("has no errors when the current is filled and the new one is strong, different and repeated", () => {
    const errors = validateChangePasswordForm({
      confirmPassword: STRONG,
      currentPassword: OTHER_STRONG,
      newPassword: STRONG,
    });

    expect(Object.values(errors).every((message) => message === undefined)).toBe(true);
  });

  it("requires the current password", () => {
    const errors = validateChangePasswordForm({
      confirmPassword: STRONG,
      currentPassword: "",
      newPassword: STRONG,
    });

    expect(errors.currentPassword).toBe(CHANGE_PASSWORD_ERROR_MESSAGE.CURRENT_PASSWORD_REQUIRED);
  });

  it("applies the same rules as sign-up to the new password", () => {
    const errors = validateChangePasswordForm({
      confirmPassword: "abc",
      currentPassword: OTHER_STRONG,
      newPassword: "abc",
    });

    expect(errors.newPassword).toBe(NEW_PASSWORD_ERROR_MESSAGE.PASSWORD_TOO_SHORT);
  });

  it("reports that the repeat does not match", () => {
    const errors = validateChangePasswordForm({
      confirmPassword: OTHER_STRONG,
      currentPassword: "Actual123!",
      newPassword: STRONG,
    });

    expect(errors.confirmPassword).toBe(NEW_PASSWORD_ERROR_MESSAGE.PASSWORDS_MISMATCH);
  });

  it("rejects a new password equal to the current one, before any strength message", () => {
    const errors = validateChangePasswordForm({
      confirmPassword: "abc",
      currentPassword: "abc",
      newPassword: "abc",
    });

    expect(errors.newPassword).toBe(NEW_PASSWORD_ERROR_MESSAGE.SAME_PASSWORD);
  });
});

describe("isSameAsCurrentPassword", () => {
  it("is false while the new password is still empty, even if the current one is empty too", () => {
    expect(
      isSameAsCurrentPassword({ confirmPassword: "", currentPassword: "", newPassword: "" }),
    ).toBe(false);
  });

  it("is true only when both are exactly the same", () => {
    expect(
      isSameAsCurrentPassword({ confirmPassword: "", currentPassword: "Abc", newPassword: "Abc" }),
    ).toBe(true);
    expect(
      isSameAsCurrentPassword({ confirmPassword: "", currentPassword: "Abc", newPassword: "abc" }),
    ).toBe(false);
  });
});
