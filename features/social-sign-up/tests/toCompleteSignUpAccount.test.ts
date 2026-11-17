import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { COMPLETE_SIGN_UP_ACCOUNT_STATUS } from "../constants/complete-sign-up.constants";
import { SOCIAL_PROVIDER, SOCIAL_SIGN_UP_COMPLETED_KEY } from "../constants/social-sign-up.constants";
import { toCompleteSignUpAccount } from "../utils/toCompleteSignUpAccount";

const buildUser = (overrides: Partial<User> = {}): User =>
  ({
    app_metadata: { provider: SOCIAL_PROVIDER.GOOGLE },
    email: "ana@correo.com",
    is_anonymous: false,
    user_metadata: { name: "Ana Pérez" },
    ...overrides,
  }) as User;

describe("toCompleteSignUpAccount", () => {
  // SCRUM-43, CA-01
  it("asks a new social account to complete its data, with the provider name", () => {
    expect(toCompleteSignUpAccount(buildUser())).toEqual({
      name: "Ana Pérez",
      status: COMPLETE_SIGN_UP_ACCOUNT_STATUS.PENDING,
    });
  });

  it("starts with an empty name when the provider gives none", () => {
    const user = buildUser({ app_metadata: { provider: SOCIAL_PROVIDER.FACEBOOK }, user_metadata: {} });

    expect(toCompleteSignUpAccount(user)).toEqual({ name: "", status: COMPLETE_SIGN_UP_ACCOUNT_STATUS.PENDING });
  });

  // SCRUM-43, CA-04
  it("does not ask a social account that already has the completed mark", () => {
    const user = buildUser({ user_metadata: { [SOCIAL_SIGN_UP_COMPLETED_KEY]: "2026-11-16" } });

    expect(toCompleteSignUpAccount(user).status).toBe(COMPLETE_SIGN_UP_ACCOUNT_STATUS.NOT_NEEDED);
  });

  // SCRUM-43, CA-04
  it("never asks an email account to complete social data", () => {
    const user = buildUser({ app_metadata: { provider: "email" } });

    expect(toCompleteSignUpAccount(user).status).toBe(COMPLETE_SIGN_UP_ACCOUNT_STATUS.NOT_NEEDED);
  });

  it("reports no account for an anonymous session", () => {
    const user = buildUser({ email: undefined, is_anonymous: true });

    expect(toCompleteSignUpAccount(user).status).toBe(COMPLETE_SIGN_UP_ACCOUNT_STATUS.NO_ACCOUNT);
  });

  it("reports no account for a registered user without an email", () => {
    const user = buildUser({ email: undefined });

    expect(toCompleteSignUpAccount(user).status).toBe(COMPLETE_SIGN_UP_ACCOUNT_STATUS.NO_ACCOUNT);
  });
});
