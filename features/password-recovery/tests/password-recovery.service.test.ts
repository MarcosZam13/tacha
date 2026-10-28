import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RECOVERY_AUTH_EVENT, RECOVERY_REQUEST_RESULT } from "../constants/password-recovery.constants";
import { requestPasswordReset, subscribeToRecoveryEvents } from "../services/password-recovery.service";

// Sin Supabase real: getSupabaseClient devuelve un cliente falso con el único método que se usa.
const resetPasswordForEmailMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const getSupabaseClientMock = vi.fn();

vi.mock("@/services/supabase.client", () => ({
  getSupabaseClient: () => getSupabaseClientMock(),
}));

const ORIGIN = "http://localhost:3000";
const EMAIL = "ana@correo.com";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("window", { location: { origin: ORIGIN } });
  getSupabaseClientMock.mockReturnValue({
    auth: { onAuthStateChange: onAuthStateChangeMock, resetPasswordForEmail: resetPasswordForEmailMock },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestPasswordReset", () => {
  it("asks Supabase for the email, with the link pointing to this origin's update-password page", async () => {
    resetPasswordForEmailMock.mockResolvedValue({ data: {}, error: null });

    await requestPasswordReset(EMAIL);

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith(EMAIL, {
      redirectTo: `${ORIGIN}/actualizar-contrasena`,
    });
  });

  // Supabase no devuelve error cuando el correo no tiene cuenta: es el mismo camino que la solicitud aceptada.
  it("reports sent when Supabase accepts the request, which is also what it answers for an email with no account", async () => {
    resetPasswordForEmailMock.mockResolvedValue({ data: {}, error: null });

    expect(await requestPasswordReset(EMAIL)).toBe(RECOVERY_REQUEST_RESULT.SENT);
  });

  it.each([
    ["by status 429", { code: "unexpected_failure", status: 429 }],
    ["by its error code", { code: "over_email_send_rate_limit", status: 400 }],
  ])("reports sent when Supabase rate limits the request (%s), so the limit cannot reveal an account", async (_label, error) => {
    resetPasswordForEmailMock.mockResolvedValue({ data: null, error });

    expect(await requestPasswordReset(EMAIL)).toBe(RECOVERY_REQUEST_RESULT.SENT);
  });

  // Supabase solo intenta mandar el correo si la cuenta existe: un fallo del envío (SMTP caído o que
  // rechaza la dirección) mostrado como error delataría qué correos tienen cuenta.
  it.each([
    ["500", 500],
    ["503", 503],
  ])("reports sent when Supabase fails on the server (%s), so a failed delivery cannot reveal an account", async (_label, status) => {
    resetPasswordForEmailMock.mockResolvedValue({ data: null, error: { code: "unexpected_failure", status } });

    expect(await requestPasswordReset(EMAIL)).toBe(RECOVERY_REQUEST_RESULT.SENT);
  });

  it("reports an error when Supabase rejects the address itself, which does not depend on the account", async () => {
    resetPasswordForEmailMock.mockResolvedValue({ data: null, error: { code: "validation_failed", status: 400 } });

    expect(await requestPasswordReset(EMAIL)).toBe(RECOVERY_REQUEST_RESULT.ERROR);
  });

  it("reports an error when the request never reaches Supabase (supabase-js reports a network failure with status 0)", async () => {
    resetPasswordForEmailMock.mockResolvedValue({ data: null, error: { code: undefined, status: 0 } });

    expect(await requestPasswordReset(EMAIL)).toBe(RECOVERY_REQUEST_RESULT.ERROR);
  });

  it("reports an error, and does not throw, when the request itself throws (network down)", async () => {
    resetPasswordForEmailMock.mockRejectedValue(new TypeError("Failed to fetch"));

    expect(await requestPasswordReset(EMAIL)).toBe(RECOVERY_REQUEST_RESULT.ERROR);
  });

  it("reports an error, and does not throw, when the Supabase client cannot be created", async () => {
    getSupabaseClientMock.mockImplementation(() => {
      throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
    });

    expect(await requestPasswordReset(EMAIL)).toBe(RECOVERY_REQUEST_RESULT.ERROR);
  });
});

describe("subscribeToRecoveryEvents", () => {
  it("passes on each session event by name, and not the session itself", () => {
    onAuthStateChangeMock.mockImplementation((callback) => {
      callback("INITIAL_SESSION", { access_token: "secret" });
      callback("PASSWORD_RECOVERY", { access_token: "secret" });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    const onEvent = vi.fn();

    subscribeToRecoveryEvents(onEvent);

    expect(onEvent.mock.calls).toEqual([[RECOVERY_AUTH_EVENT.INITIAL_SESSION], [RECOVERY_AUTH_EVENT.PASSWORD_RECOVERY]]);
  });

  it("returns a function that cancels the subscription", () => {
    const unsubscribe = vi.fn();
    onAuthStateChangeMock.mockReturnValue({ data: { subscription: { unsubscribe } } });

    subscribeToRecoveryEvents(vi.fn())();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("does not throw when the Supabase client cannot be created: it reports INITIAL_SESSION so the screen can give up", () => {
    getSupabaseClientMock.mockImplementation(() => {
      throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
    });
    const onEvent = vi.fn();

    const unsubscribe = subscribeToRecoveryEvents(onEvent);

    expect(onEvent).toHaveBeenCalledWith(RECOVERY_AUTH_EVENT.INITIAL_SESSION);
    expect(unsubscribe()).toBeUndefined();
  });
});
