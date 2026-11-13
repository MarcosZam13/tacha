// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_ROUTE } from "@/constants";
import { signOutUser } from "@/services/session.service";
import {
  SOCIAL_PROVIDER,
  SOCIAL_SIGN_UP_COMPLETED_KEY,
  SOCIAL_SIGN_UP_PENDING_KEY,
  SOCIAL_SIGN_UP_STATUS,
} from "../constants/social-sign-up.constants";
import { completeSocialSignUp, startSocialSignUp } from "../services/social-sign-up.service";

const { getUser, signInWithOAuth, unlinkIdentity, updateUser } = vi.hoisted(() => ({
  getUser: vi.fn(),
  signInWithOAuth: vi.fn(),
  unlinkIdentity: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/services/supabase.client", () => ({
  getSupabaseClient: () => ({ auth: { getUser, signInWithOAuth, unlinkIdentity, updateUser } }),
}));
vi.mock("@/services/session.service", () => ({ signOutUser: vi.fn() }));

const GOOGLE_IDENTITY = { identity_id: "google-id", provider: SOCIAL_PROVIDER.GOOGLE };
const EMAIL_IDENTITY = { identity_id: "email-id", provider: "email" };

const buildUser = (overrides: object = {}): object => ({
  email: "ana@correo.com",
  identities: [GOOGLE_IDENTITY],
  is_anonymous: false,
  user_metadata: {},
  ...overrides,
});

const mockUser = (overrides: object = {}): void => {
  getUser.mockResolvedValue({ data: { user: buildUser(overrides) }, error: null });
};

const markFlowAsPending = (): void =>
  window.sessionStorage.setItem(SOCIAL_SIGN_UP_PENDING_KEY, SOCIAL_PROVIDER.GOOGLE);

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  window.history.replaceState(null, "", AUTH_ROUTE.SOCIAL_SIGN_UP);
  updateUser.mockResolvedValue({ error: null });
});

describe("startSocialSignUp", () => {
  // CA-02
  it("sends the visitor to the chosen provider and back to the return page", async () => {
    signInWithOAuth.mockResolvedValue({ error: null });

    await startSocialSignUp(SOCIAL_PROVIDER.FACEBOOK);

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: SOCIAL_PROVIDER.FACEBOOK,
      options: { redirectTo: `${window.location.origin}${AUTH_ROUTE.SOCIAL_SIGN_UP}` },
    });
  });

  it("removes the pending mark when the flow cannot start", async () => {
    signInWithOAuth.mockResolvedValue({ error: new Error("failed") });

    const result = await startSocialSignUp(SOCIAL_PROVIDER.GOOGLE);

    expect(result).toBe(SOCIAL_SIGN_UP_STATUS.ERROR);
    expect(window.sessionStorage.getItem(SOCIAL_SIGN_UP_PENDING_KEY)).toBeNull();
  });
});

describe("completeSocialSignUp", () => {
  // CA-05
  it("saves the completed mark and keeps the session of a new account", async () => {
    markFlowAsPending();
    mockUser();

    const result = await completeSocialSignUp();

    expect(result).toBe(SOCIAL_SIGN_UP_STATUS.SUCCESS);
    expect(updateUser).toHaveBeenCalledWith({
      data: { [SOCIAL_SIGN_UP_COMPLETED_KEY]: expect.any(String) },
    });
    expect(signOutUser).not.toHaveBeenCalled();
  });

  it("closes the session when the completed mark cannot be saved", async () => {
    markFlowAsPending();
    mockUser();
    updateUser.mockResolvedValue({ error: new Error("failed") });

    const result = await completeSocialSignUp();

    expect(result).toBe(SOCIAL_SIGN_UP_STATUS.ERROR);
    expect(signOutUser).toHaveBeenCalledOnce();
  });

  // CA-04
  it("unlinks the new identity and closes the session when the email has another identity", async () => {
    markFlowAsPending();
    mockUser({ identities: [EMAIL_IDENTITY, GOOGLE_IDENTITY] });

    const result = await completeSocialSignUp();

    expect(result).toBe(SOCIAL_SIGN_UP_STATUS.EMAIL_EXISTS);
    expect(unlinkIdentity).toHaveBeenCalledWith(GOOGLE_IDENTITY);
    expect(signOutUser).toHaveBeenCalledOnce();
  });

  // CA-04
  it("keeps the only identity of an account that repeats the social sign up", async () => {
    markFlowAsPending();
    mockUser({ user_metadata: { [SOCIAL_SIGN_UP_COMPLETED_KEY]: "2026-11-02" } });

    const result = await completeSocialSignUp();

    expect(result).toBe(SOCIAL_SIGN_UP_STATUS.EMAIL_EXISTS);
    expect(unlinkIdentity).not.toHaveBeenCalled();
    expect(signOutUser).toHaveBeenCalledOnce();
  });

  // CA-03
  it("closes the session when the provider gives no email", async () => {
    markFlowAsPending();
    mockUser({ email: undefined });

    const result = await completeSocialSignUp();

    expect(result).toBe(SOCIAL_SIGN_UP_STATUS.ERROR);
    expect(signOutUser).toHaveBeenCalledOnce();
  });

  it("does not close an anonymous session", async () => {
    markFlowAsPending();
    mockUser({ email: undefined, is_anonymous: true });

    await completeSocialSignUp();

    expect(signOutUser).not.toHaveBeenCalled();
  });

  it("does not touch the session when the page was opened directly", async () => {
    const result = await completeSocialSignUp();

    expect(result).toBe(SOCIAL_SIGN_UP_STATUS.ERROR);
    expect(getUser).not.toHaveBeenCalled();
    expect(signOutUser).not.toHaveBeenCalled();
  });

  // CA-06
  it.each(["?error=access_denied", "#error=access_denied"])(
    "reports an error when the provider returns %s",
    async (urlSuffix) => {
      markFlowAsPending();
      window.history.replaceState(null, "", `${AUTH_ROUTE.SOCIAL_SIGN_UP}${urlSuffix}`);

      const result = await completeSocialSignUp();

      expect(result).toBe(SOCIAL_SIGN_UP_STATUS.ERROR);
      expect(signOutUser).not.toHaveBeenCalled();
    },
  );

  it("reports an error when the user cannot be validated", async () => {
    markFlowAsPending();
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });

    expect(await completeSocialSignUp()).toBe(SOCIAL_SIGN_UP_STATUS.ERROR);
  });
});
