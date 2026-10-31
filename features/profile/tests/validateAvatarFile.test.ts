import { describe, expect, it } from "vitest";
import { AVATAR_MAX_FILE_SIZE_BYTES, PROFILE_ERROR_MESSAGE } from "../constants/profile.constants";
import { validateAvatarFile } from "../utils/validateAvatarFile";

describe("validateAvatarFile", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts a small %s", (type) => {
    expect(validateAvatarFile({ size: 1024, type })).toBeUndefined();
  });

  it.each(["application/pdf", "image/gif", "image/svg+xml", ""])("rejects the type '%s'", (type) => {
    expect(validateAvatarFile({ size: 1024, type })).toBe(PROFILE_ERROR_MESSAGE.PHOTO_TYPE_NOT_ALLOWED);
  });

  it("accepts a file of exactly the maximum size", () => {
    expect(validateAvatarFile({ size: AVATAR_MAX_FILE_SIZE_BYTES, type: "image/png" })).toBeUndefined();
  });

  it("rejects a file over the maximum size", () => {
    expect(validateAvatarFile({ size: AVATAR_MAX_FILE_SIZE_BYTES + 1, type: "image/png" })).toBe(
      PROFILE_ERROR_MESSAGE.PHOTO_TOO_LARGE,
    );
  });
});
