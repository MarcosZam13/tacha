import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  SOCIAL_SIGN_UP_COMPLETED_KEY,
  SOCIAL_SIGN_UP_STATUS,
} from "../constants/social-sign-up.constants";
import { getSocialSignUpResult } from "../utils/getSocialSignUpResult";

const buildUser = (overrides: Partial<User> = {}): User =>
  ({
    email: "ana@correo.com",
    identities: [{ provider: "google" }],
    is_anonymous: false,
    user_metadata: {},
    ...overrides,
  }) as User;

describe("getSocialSignUpResult", () => {
  // CA-05
  it("accepts a new account", () => {
    expect(getSocialSignUpResult(buildUser())).toBe(SOCIAL_SIGN_UP_STATUS.SUCCESS);
  });

  // CA-04
  it("reports an existing account that already completed the social sign up", () => {
    const user = buildUser({ user_metadata: { [SOCIAL_SIGN_UP_COMPLETED_KEY]: "2026-11-02" } });

    expect(getSocialSignUpResult(user)).toBe(SOCIAL_SIGN_UP_STATUS.EMAIL_EXISTS);
  });

  // CA-04
  it("reports an existing account when the provider was linked to another identity", () => {
    const identities = [{ provider: "email" }, { provider: "google" }] as User["identities"];

    expect(getSocialSignUpResult(buildUser({ identities }))).toBe(
      SOCIAL_SIGN_UP_STATUS.EMAIL_EXISTS,
    );
  });

  // CA-03
  it("rejects a user without an email", () => {
    expect(getSocialSignUpResult(buildUser({ email: undefined }))).toBe(
      SOCIAL_SIGN_UP_STATUS.ERROR,
    );
  });

  it("rejects an anonymous session", () => {
    expect(getSocialSignUpResult(buildUser({ is_anonymous: true }))).toBe(
      SOCIAL_SIGN_UP_STATUS.ERROR,
    );
  });
});
