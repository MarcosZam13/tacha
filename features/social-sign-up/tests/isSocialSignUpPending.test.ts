import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { USER_METADATA_KEY } from "@/constants";
import { SOCIAL_PROVIDER, SOCIAL_SIGN_UP_COMPLETED_KEY } from "../constants/social-sign-up.constants";
import { isSocialSignUpPending } from "../utils/isSocialSignUpPending";

const buildUser = (overrides: Partial<User> = {}): User =>
  ({
    app_metadata: { provider: SOCIAL_PROVIDER.GOOGLE },
    email: "ana@correo.com",
    is_anonymous: false,
    user_metadata: {},
    ...overrides,
  }) as User;

describe("isSocialSignUpPending", () => {
  it.each([SOCIAL_PROVIDER.GOOGLE, SOCIAL_PROVIDER.FACEBOOK])(
    "is pending for a %s account without the completed mark",
    (provider) => {
      expect(isSocialSignUpPending(buildUser({ app_metadata: { provider } }))).toBe(true);
    },
  );

  it("is not pending once the completed mark and the terms are saved", () => {
    const user = buildUser({ user_metadata: { [SOCIAL_SIGN_UP_COMPLETED_KEY]: "2026-11-16", [USER_METADATA_KEY.TERMS_ACCEPTED_AT]: "2026-11-16" } });

    expect(isSocialSignUpPending(user)).toBe(false);
  });

  // SCRUM-44: escribir solo la marca desde la consola no completa el registro.
  it("is still pending with the completed mark but without the terms accepted", () => {
    const user = buildUser({ user_metadata: { [SOCIAL_SIGN_UP_COMPLETED_KEY]: "2026-11-16" } });

    expect(isSocialSignUpPending(user)).toBe(true);
  });

  it("is never pending for an email account", () => {
    expect(isSocialSignUpPending(buildUser({ app_metadata: { provider: "email" } }))).toBe(false);
  });

  it("is never pending without a provider", () => {
    expect(isSocialSignUpPending(buildUser({ app_metadata: {} }))).toBe(false);
  });

  it("is never pending for an anonymous session", () => {
    expect(isSocialSignUpPending(buildUser({ app_metadata: {}, is_anonymous: true }))).toBe(false);
  });

  // El formulario no acepta una cuenta sin correo: mandarla ahí la dejaría sin salida.
  it("is never pending for a social account without an email", () => {
    expect(isSocialSignUpPending(buildUser({ email: undefined }))).toBe(false);
  });
});
