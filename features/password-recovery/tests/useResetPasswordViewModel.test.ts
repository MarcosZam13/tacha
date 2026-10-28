// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import type { RenderHookResult } from "@testing-library/react";
import { StrictMode } from "react";
import type { FormEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NEW_PASSWORD_ERROR_MESSAGE, NEW_PASSWORD_FIELD, PASSWORD_UPDATE_RESULT } from "@/constants";
import { updateUserPassword } from "@/services/password.service";
import { revokeOtherSessions, signOutUser } from "@/services/session.service";
import {
  RECOVERY_AUTH_EVENT,
  RECOVERY_CONFIRMATION_GRACE_MS,
  RESET_PASSWORD_ERROR_MESSAGE,
  RESET_PASSWORD_REDIRECT_DELAY_MS,
  RESET_PASSWORD_STATUS,
} from "../constants/password-recovery.constants";
import { useResetPasswordViewModel } from "../hooks/useResetPasswordViewModel";
import type { ResetPasswordViewModel } from "../models/ResetPasswordViewModel.interface";
import { subscribeToRecoveryEvents } from "../services/password-recovery.service";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock("@/services/password.service", () => ({ updateUserPassword: vi.fn() }));
vi.mock("@/services/session.service", () => ({ revokeOtherSessions: vi.fn(), signOutUser: vi.fn() }));
vi.mock("../services/password-recovery.service", () => ({ subscribeToRecoveryEvents: vi.fn() }));

const updateUserPasswordMock = vi.mocked(updateUserPassword);
const revokeOtherSessionsMock = vi.mocked(revokeOtherSessions);
const signOutUserMock = vi.mocked(signOutUser);
const subscribeMock = vi.mocked(subscribeToRecoveryEvents);

type HookResult = RenderHookResult<ResetPasswordViewModel, unknown>;

const RECOVERY_HASH = "#access_token=abc&refresh_token=def&type=recovery";
const EXPIRED_HASH = "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid";
const STRONG_PASSWORD = "Tacha2026!";
const submitEvent = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;

let emitEvent: (event: string) => void = () => undefined;
const unsubscribeMock = vi.fn();

const setUrlFragment = (fragment: string): void => {
  window.history.replaceState(null, "", `/actualizar-contrasena${fragment}`);
};

// Abre la vista con un enlace de recuperación y lo da por aceptado, como hace Supabase.
const renderReadyHook = (): HookResult => {
  setUrlFragment(RECOVERY_HASH);
  const hook = renderHook(() => useResetPasswordViewModel());
  act(() => emitEvent(RECOVERY_AUTH_EVENT.PASSWORD_RECOVERY));
  return hook;
};

const fillForm = (hook: HookResult, password: string, confirmation: string): void => {
  act(() => hook.result.current.handleChange(NEW_PASSWORD_FIELD.NEW_PASSWORD)(password));
  act(() => hook.result.current.handleChange(NEW_PASSWORD_FIELD.CONFIRM_PASSWORD)(confirmation));
};

const submit = (hook: HookResult): Promise<void> =>
  act(async () => hook.result.current.handleSubmit(submitEvent));

beforeEach(() => {
  vi.resetAllMocks();
  subscribeMock.mockImplementation((onEvent) => {
    emitEvent = onEvent as (event: string) => void;
    return unsubscribeMock;
  });
  revokeOtherSessionsMock.mockResolvedValue(true);
  signOutUserMock.mockResolvedValue(undefined);
  setUrlFragment("");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useResetPasswordViewModel: verifying the link", () => {
  it("starts verifying and waits for Supabase before showing the form", () => {
    setUrlFragment(RECOVERY_HASH);

    const { result } = renderHook(() => useResetPasswordViewModel());

    expect(result.current.status).toBe(RESET_PASSWORD_STATUS.VERIFYING);
  });

  it("shows the form when Supabase confirms the recovery session", () => {
    const { result } = renderReadyHook();

    expect(result.current.status).toBe(RESET_PASSWORD_STATUS.READY);
  });

  it("does not show the form at the initial session just because the fragment is gone: it waits for the confirmation", () => {
    vi.useFakeTimers();
    setUrlFragment(RECOVERY_HASH);
    const { result } = renderHook(() => useResetPasswordViewModel());

    setUrlFragment("");
    act(() => emitEvent(RECOVERY_AUTH_EVENT.INITIAL_SESSION));

    expect(result.current.status).toBe(RESET_PASSWORD_STATUS.VERIFYING);
  });

  it("shows the form if the confirmation arrives right after the initial session, and the wait does not undo it later", () => {
    vi.useFakeTimers();
    setUrlFragment(RECOVERY_HASH);
    const { result } = renderHook(() => useResetPasswordViewModel());
    setUrlFragment("");
    act(() => emitEvent(RECOVERY_AUTH_EVENT.INITIAL_SESSION));

    act(() => emitEvent(RECOVERY_AUTH_EVENT.PASSWORD_RECOVERY));
    act(() => vi.advanceTimersByTime(RECOVERY_CONFIRMATION_GRACE_MS * 2));

    expect(result.current.status).toBe(RESET_PASSWORD_STATUS.READY);
  });

  it("gives the link up as not valid if the confirmation never arrives, instead of staying on the spinner or opening the form", () => {
    vi.useFakeTimers();
    setUrlFragment(RECOVERY_HASH);
    const { result } = renderHook(() => useResetPasswordViewModel());
    setUrlFragment("");
    act(() => emitEvent(RECOVERY_AUTH_EVENT.INITIAL_SESSION));

    act(() => vi.advanceTimersByTime(RECOVERY_CONFIRMATION_GRACE_MS - 1));
    expect(result.current.status).toBe(RESET_PASSWORD_STATUS.VERIFYING);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.status).toBe(RESET_PASSWORD_STATUS.INVALID);
  });

  it("says the link is not valid if the fragment is still in the URL at the initial session (Supabase rejected it)", () => {
    setUrlFragment(RECOVERY_HASH);
    const { result } = renderHook(() => useResetPasswordViewModel());

    act(() => emitEvent(RECOVERY_AUTH_EVENT.INITIAL_SESSION));

    expect(result.current.status).toBe(RESET_PASSWORD_STATUS.INVALID);
  });

  it("says the link is not valid for an expired or used link", () => {
    setUrlFragment(EXPIRED_HASH);
    const { result } = renderHook(() => useResetPasswordViewModel());

    act(() => emitEvent(RECOVERY_AUTH_EVENT.INITIAL_SESSION));

    expect(result.current.status).toBe(RESET_PASSWORD_STATUS.INVALID);
  });

  it("says the link is not valid when the page was opened by hand, even with a session already started", () => {
    const { result } = renderHook(() => useResetPasswordViewModel());

    act(() => emitEvent(RECOVERY_AUTH_EVENT.INITIAL_SESSION));

    expect(result.current.status).toBe(RESET_PASSWORD_STATUS.INVALID);
  });

  it("does not leave the verified state because of a later session event", () => {
    const { result } = renderReadyHook();

    act(() => emitEvent(RECOVERY_AUTH_EVENT.INITIAL_SESSION));

    expect(result.current.status).toBe(RESET_PASSWORD_STATUS.READY);
  });

  it("cancels the subscription when it unmounts", () => {
    const { unmount } = renderHook(() => useResetPasswordViewModel());

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });

  // React corre el efecto, lo limpia y lo vuelve a correr en desarrollo. La verificación lee la URL dentro del
  // efecto y Supabase no la procesa hasta que haya una respuesta de red, así que la segunda corrida sigue viendo
  // el fragmento. Si se leyera una vez, fuera del efecto, o se borrara la URL, esto se rompería.
  it("works under StrictMode, where the effect runs twice", () => {
    setUrlFragment(RECOVERY_HASH);
    const { result } = renderHook(() => useResetPasswordViewModel(), { wrapper: StrictMode });
    expect(subscribeMock).toHaveBeenCalledTimes(2);
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);

    act(() => emitEvent(RECOVERY_AUTH_EVENT.PASSWORD_RECOVERY));

    expect(result.current.status).toBe(RESET_PASSWORD_STATUS.READY);
  });
});

describe("useResetPasswordViewModel: the form", () => {
  it("starts with the save button disabled and no error shown", () => {
    const { result } = renderReadyHook();

    expect(result.current.isSaveDisabled).toBe(true);
    expect(result.current.confirmPasswordError).toBeUndefined();
    expect(result.current.passwordStrength).toBeUndefined();
  });

  it("shows the strength while typing, and the mismatch once the repetition has something", () => {
    const hook = renderReadyHook();

    fillForm(hook, STRONG_PASSWORD, "Otra2026!");

    expect(hook.result.current.passwordStrength).toBeDefined();
    expect(hook.result.current.confirmPasswordError).toBe(NEW_PASSWORD_ERROR_MESSAGE.PASSWORDS_MISMATCH);
    expect(hook.result.current.isSaveDisabled).toBe(true);
  });

  it("keeps the button disabled for a weak password even if it repeats correctly", () => {
    const hook = renderReadyHook();

    fillForm(hook, "12345678", "12345678");

    expect(hook.result.current.isSaveDisabled).toBe(true);
  });

  it("enables the button with a valid, repeated password", () => {
    const hook = renderReadyHook();

    fillForm(hook, STRONG_PASSWORD, STRONG_PASSWORD);

    expect(hook.result.current.isSaveDisabled).toBe(false);
  });

  it("does not send anything while the link is still being verified", async () => {
    setUrlFragment(RECOVERY_HASH);
    const hook = renderHook(() => useResetPasswordViewModel());
    fillForm(hook, STRONG_PASSWORD, STRONG_PASSWORD);

    await submit(hook);

    expect(revokeOtherSessionsMock).not.toHaveBeenCalled();
    expect(updateUserPasswordMock).not.toHaveBeenCalled();
  });
});

describe("useResetPasswordViewModel: saving", () => {
  it("closes the other sessions first, then changes the password, then closes this browser's recovery session", async () => {
    const order: string[] = [];
    revokeOtherSessionsMock.mockImplementation(async () => {
      order.push("revoke");
      return true;
    });
    updateUserPasswordMock.mockImplementation(async () => {
      order.push("update");
      return PASSWORD_UPDATE_RESULT.SUCCESS;
    });
    signOutUserMock.mockImplementation(async () => {
      order.push("signOut");
    });
    const hook = renderReadyHook();
    fillForm(hook, STRONG_PASSWORD, STRONG_PASSWORD);

    await submit(hook);

    expect(updateUserPasswordMock).toHaveBeenCalledWith(STRONG_PASSWORD);
    expect(order).toEqual(["revoke", "update", "signOut"]);
    expect(hook.result.current.status).toBe(RESET_PASSWORD_STATUS.DONE);
  });

  it("does not change the password if the other sessions could not be closed, and lets the user try again", async () => {
    revokeOtherSessionsMock.mockResolvedValue(false);
    const hook = renderReadyHook();
    fillForm(hook, STRONG_PASSWORD, STRONG_PASSWORD);

    await submit(hook);

    expect(updateUserPasswordMock).not.toHaveBeenCalled();
    expect(signOutUserMock).not.toHaveBeenCalled();
    expect(hook.result.current.status).toBe(RESET_PASSWORD_STATUS.READY);
    expect(hook.result.current.submitError).toBe(RESET_PASSWORD_ERROR_MESSAGE.SESSIONS_NOT_CLOSED);
    expect(hook.result.current.values.newPassword).toBe(STRONG_PASSWORD);
    expect(hook.result.current.isSaveDisabled).toBe(false);
  });

  it("keeps what was typed on screen until the confirmation shows, and forgets it then", async () => {
    updateUserPasswordMock.mockResolvedValue(PASSWORD_UPDATE_RESULT.SUCCESS);
    let finishSigningOut: () => void = () => undefined;
    signOutUserMock.mockReturnValue(new Promise<void>((resolve) => { finishSigningOut = resolve; }));
    const hook = renderReadyHook();
    fillForm(hook, STRONG_PASSWORD, STRONG_PASSWORD);

    act(() => {
      void hook.result.current.handleSubmit(submitEvent);
    });
    await act(async () => undefined);
    expect(hook.result.current.status).toBe(RESET_PASSWORD_STATUS.SAVING);
    expect(hook.result.current.values.newPassword).toBe(STRONG_PASSWORD);

    await act(async () => finishSigningOut());

    expect(hook.result.current.status).toBe(RESET_PASSWORD_STATUS.DONE);
    expect(hook.result.current.values).toEqual({ confirmPassword: "", newPassword: "" });
  });

  it("ignores a second submit once the first one is saving", async () => {
    let resolveUpdate: (value: typeof PASSWORD_UPDATE_RESULT.SUCCESS) => void = () => undefined;
    updateUserPasswordMock.mockReturnValue(new Promise((resolve) => { resolveUpdate = resolve; }));
    const hook = renderReadyHook();
    fillForm(hook, STRONG_PASSWORD, STRONG_PASSWORD);

    act(() => {
      void hook.result.current.handleSubmit(submitEvent);
    });
    await act(async () => undefined);
    expect(hook.result.current.isSaving).toBe(true);
    expect(hook.result.current.isSaveDisabled).toBe(true);

    await submit(hook);
    expect(updateUserPasswordMock).toHaveBeenCalledTimes(1);
    expect(revokeOtherSessionsMock).toHaveBeenCalledTimes(1);

    await act(async () => resolveUpdate(PASSWORD_UPDATE_RESULT.SUCCESS));
    expect(hook.result.current.status).toBe(RESET_PASSWORD_STATUS.DONE);
  });

  it.each([
    ["a password equal to the current one", PASSWORD_UPDATE_RESULT.SAME_PASSWORD, NEW_PASSWORD_ERROR_MESSAGE.SAME_PASSWORD],
    ["a password rejected by the project's policy", PASSWORD_UPDATE_RESULT.REJECTED, NEW_PASSWORD_ERROR_MESSAGE.REJECTED],
    ["an unexpected failure", PASSWORD_UPDATE_RESULT.ERROR, NEW_PASSWORD_ERROR_MESSAGE.UNEXPECTED],
  ])("keeps the form, with what was typed, and shows the message for %s", async (_label, result, message) => {
    updateUserPasswordMock.mockResolvedValue(result);
    const hook = renderReadyHook();
    fillForm(hook, STRONG_PASSWORD, STRONG_PASSWORD);

    await submit(hook);

    expect(hook.result.current.status).toBe(RESET_PASSWORD_STATUS.READY);
    expect(hook.result.current.submitError).toBe(message);
    expect(hook.result.current.values.newPassword).toBe(STRONG_PASSWORD);
    expect(signOutUserMock).not.toHaveBeenCalled();
  });

  it("shows the generic error, and does not throw, when the request itself throws", async () => {
    updateUserPasswordMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const hook = renderReadyHook();
    fillForm(hook, STRONG_PASSWORD, STRONG_PASSWORD);

    await submit(hook);

    expect(hook.result.current.submitError).toBe(NEW_PASSWORD_ERROR_MESSAGE.UNEXPECTED);
    expect(hook.result.current.status).toBe(RESET_PASSWORD_STATUS.READY);
  });

  it("clears the failure as soon as the user edits a field", async () => {
    updateUserPasswordMock.mockResolvedValue(PASSWORD_UPDATE_RESULT.ERROR);
    const hook = renderReadyHook();
    fillForm(hook, STRONG_PASSWORD, STRONG_PASSWORD);
    await submit(hook);

    act(() => hook.result.current.handleChange(NEW_PASSWORD_FIELD.CONFIRM_PASSWORD)(""));

    expect(hook.result.current.submitError).toBeUndefined();
  });
});

describe("useResetPasswordViewModel: after saving", () => {
  const renderDoneHook = async (): Promise<HookResult> => {
    vi.useFakeTimers();
    updateUserPasswordMock.mockResolvedValue(PASSWORD_UPDATE_RESULT.SUCCESS);
    const hook = renderReadyHook();
    fillForm(hook, STRONG_PASSWORD, STRONG_PASSWORD);
    await submit(hook);
    return hook;
  };

  it("goes to the login by itself after the delay, replacing the history entry", async () => {
    await renderDoneHook();
    expect(replaceMock).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(RESET_PASSWORD_REDIRECT_DELAY_MS - 1));
    expect(replaceMock).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("goes to the login right away with the button, without waiting", async () => {
    const hook = await renderDoneHook();

    act(() => hook.result.current.handleGoToLogin());

    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("does not redirect after leaving the screen", async () => {
    const hook = await renderDoneHook();

    hook.unmount();
    act(() => vi.advanceTimersByTime(RESET_PASSWORD_REDIRECT_DELAY_MS * 2));

    expect(replaceMock).not.toHaveBeenCalled();
  });
});
