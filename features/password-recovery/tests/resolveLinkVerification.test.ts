import { describe, expect, it } from "vitest";
import {
  RECOVERY_AUTH_EVENT,
  RECOVERY_LINK_STATUS,
  RESET_PASSWORD_STATUS,
} from "../constants/password-recovery.constants";
import { resolveLinkVerification } from "../utils/resolveLinkVerification";

const { ERROR, NONE, RECOVERY } = RECOVERY_LINK_STATUS;
const { INITIAL_SESSION, PASSWORD_RECOVERY } = RECOVERY_AUTH_EVENT;

describe("resolveLinkVerification", () => {
  describe("when the URL held a recovery link", () => {
    it("accepts the link when Supabase confirms the recovery session", () => {
      expect(resolveLinkVerification(RECOVERY, PASSWORD_RECOVERY, NONE)).toBe(RESET_PASSWORD_STATUS.READY);
    });

    it("keeps waiting at the initial session if the fragment is already gone: that alone does not prove Supabase accepted the link", () => {
      expect(resolveLinkVerification(RECOVERY, INITIAL_SESSION, NONE)).toBe(RESET_PASSWORD_STATUS.VERIFYING);
    });

    it("rejects the link at the initial session if the fragment is still in the URL: Supabase did not accept it", () => {
      expect(resolveLinkVerification(RECOVERY, INITIAL_SESSION, RECOVERY)).toBe(RESET_PASSWORD_STATUS.INVALID);
    });

    it("rejects it too if the fragment was replaced by an error", () => {
      expect(resolveLinkVerification(RECOVERY, INITIAL_SESSION, ERROR)).toBe(RESET_PASSWORD_STATUS.INVALID);
    });

    it("keeps verifying on any other session event", () => {
      expect(resolveLinkVerification(RECOVERY, "TOKEN_REFRESHED", NONE)).toBe(RESET_PASSWORD_STATUS.VERIFYING);
      expect(resolveLinkVerification(RECOVERY, "SIGNED_IN", NONE)).toBe(RESET_PASSWORD_STATUS.VERIFYING);
    });
  });

  describe("when the URL did not hold a recovery link", () => {
    it.each([
      ["was opened by hand", NONE],
      ["held the error of an expired or used link", ERROR],
    ])("is invalid when the page %s, even with a session already started", (_label, initialLink) => {
      expect(resolveLinkVerification(initialLink, INITIAL_SESSION, NONE)).toBe(RESET_PASSWORD_STATUS.INVALID);
    });

    it("never takes an old session for a recovery session, even if a PASSWORD_RECOVERY event shows up", () => {
      expect(resolveLinkVerification(NONE, PASSWORD_RECOVERY, NONE)).toBe(RESET_PASSWORD_STATUS.INVALID);
    });
  });
});
