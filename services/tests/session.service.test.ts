import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SIGN_OUT_TIMEOUT_MS } from "@/constants";
import { revokeOtherSessions, signOutUser } from "../session.service";

// Sin Supabase real: getSupabaseClient devuelve un cliente falso con el único método que se usa.
const signOutMock = vi.fn();
const getSupabaseClientMock = vi.fn();

vi.mock("@/services/supabase.client", () => ({
  getSupabaseClient: () => getSupabaseClientMock(),
}));

const MISSING_ENV_ERROR = "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local";

beforeEach(() => {
  vi.resetAllMocks();
  getSupabaseClientMock.mockReturnValue({ auth: { signOut: signOutMock } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("signOutUser", () => {
  it("closes only this browser's session (local scope)", async () => {
    signOutMock.mockResolvedValue({ error: null });

    await signOutUser();

    expect(signOutMock).toHaveBeenCalledWith({ scope: "local" });
  });

  it("does not throw when the request rejects", async () => {
    signOutMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(signOutUser()).resolves.toBeUndefined();
  });

  it("does not throw when the Supabase client cannot be created", async () => {
    getSupabaseClientMock.mockImplementation(() => {
      throw new Error(MISSING_ENV_ERROR);
    });

    await expect(signOutUser()).resolves.toBeUndefined();
  });

  it("stops waiting for the server after the timeout, so a hung network cannot keep the screen stuck", async () => {
    vi.useFakeTimers();
    signOutMock.mockReturnValue(new Promise(() => undefined));
    let isDone = false;

    const pending = signOutUser().then(() => {
      isDone = true;
    });
    await vi.advanceTimersByTimeAsync(SIGN_OUT_TIMEOUT_MS - 1);
    expect(isDone).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(isDone).toBe(true);
  });

  it("leaves no timer pending once the server answers", async () => {
    vi.useFakeTimers();
    signOutMock.mockResolvedValue({ error: null });

    await signOutUser();

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("revokeOtherSessions", () => {
  it("revokes every other session of the account and keeps this one (others scope)", async () => {
    signOutMock.mockResolvedValue({ error: null });

    await revokeOtherSessions();

    expect(signOutMock).toHaveBeenCalledWith({ scope: "others" });
  });

  it("confirms when the server revoked them", async () => {
    signOutMock.mockResolvedValue({ error: null });

    expect(await revokeOtherSessions()).toBe(true);
  });

  it("reports a failure, instead of hiding it, when the server returns an error", async () => {
    signOutMock.mockResolvedValue({ error: { message: "boom", status: 500 } });

    expect(await revokeOtherSessions()).toBe(false);
  });

  it("reports a failure, and does not throw, when the request rejects", async () => {
    signOutMock.mockRejectedValue(new TypeError("Failed to fetch"));

    expect(await revokeOtherSessions()).toBe(false);
  });

  it("reports a failure, and does not throw, when the Supabase client cannot be created", async () => {
    getSupabaseClientMock.mockImplementation(() => {
      throw new Error(MISSING_ENV_ERROR);
    });

    expect(await revokeOtherSessions()).toBe(false);
  });

  it("reports a failure when the server does not answer in time: an unconfirmed revocation counts as not done", async () => {
    vi.useFakeTimers();
    signOutMock.mockReturnValue(new Promise(() => undefined));

    const pending = revokeOtherSessions();
    await vi.advanceTimersByTimeAsync(SIGN_OUT_TIMEOUT_MS);

    expect(await pending).toBe(false);
  });

  it("leaves no timer pending once the server answers", async () => {
    vi.useFakeTimers();
    signOutMock.mockResolvedValue({ error: null });

    await revokeOtherSessions();

    expect(vi.getTimerCount()).toBe(0);
  });
});
