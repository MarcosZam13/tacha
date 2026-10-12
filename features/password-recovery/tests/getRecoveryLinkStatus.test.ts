import { describe, expect, it } from "vitest";
import { RECOVERY_LINK_STATUS } from "../constants/password-recovery.constants";
import { getRecoveryLinkStatus } from "../utils/getRecoveryLinkStatus";

const RECOVERY_FRAGMENT =
  "#access_token=eyJhbGciOi.payload.signature&expires_in=3600&refresh_token=abc123&token_type=bearer&type=recovery";
const EXPIRED_FRAGMENT =
  "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";

describe("getRecoveryLinkStatus", () => {
  it("recognizes a recovery link", () => {
    expect(getRecoveryLinkStatus(RECOVERY_FRAGMENT)).toBe(RECOVERY_LINK_STATUS.RECOVERY);
  });

  it("recognizes a recovery link even without the leading #", () => {
    expect(getRecoveryLinkStatus(RECOVERY_FRAGMENT.slice(1))).toBe(RECOVERY_LINK_STATUS.RECOVERY);
  });

  it("recognizes the error Supabase leaves for an expired or already used link", () => {
    expect(getRecoveryLinkStatus(EXPIRED_FRAGMENT)).toBe(RECOVERY_LINK_STATUS.ERROR);
  });

  it.each([
    ["only an error code", "#error_code=otp_expired"],
    ["only an error description", "#error_description=Email+link+is+invalid"],
    ["only an error name", "#error=access_denied"],
  ])("treats a fragment with %s as an error", (_label, fragment) => {
    expect(getRecoveryLinkStatus(fragment)).toBe(RECOVERY_LINK_STATUS.ERROR);
  });

  it("lets the error win over a token, so a rejected link never opens the form", () => {
    expect(getRecoveryLinkStatus(`${EXPIRED_FRAGMENT}&access_token=abc&type=recovery`)).toBe(
      RECOVERY_LINK_STATUS.ERROR,
    );
  });

  it.each([
    ["an empty string", ""],
    ["a lone #", "#"],
    ["unrelated parameters", "#section=top&utm_source=mail"],
  ])("says there is no link for %s (the page was opened by hand)", (_label, fragment) => {
    expect(getRecoveryLinkStatus(fragment)).toBe(RECOVERY_LINK_STATUS.NONE);
  });

  it.each([
    ["a signup link", "#access_token=abc&type=signup"],
    ["a magic link", "#access_token=abc&type=magiclink"],
    ["a token without a type", "#access_token=abc"],
    ["a recovery type without a token", "#type=recovery"],
    ["a recovery type with an empty token", "#access_token=&type=recovery"],
  ])("does not take %s for a recovery link: it must not open the password form", (_label, fragment) => {
    expect(getRecoveryLinkStatus(fragment)).toBe(RECOVERY_LINK_STATUS.NONE);
  });
});
