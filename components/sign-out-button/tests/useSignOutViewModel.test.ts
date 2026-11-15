// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_ROUTE, UNSAVED_CHANGES_SOURCE } from "@/constants";
import { signOutUser } from "@/services/session.service";
import { setUnsavedChanges } from "@/services/unsaved-changes.service";
import { SIGN_OUT_STATUS } from "../constants/sign-out.constants";
import { useSignOutViewModel } from "../hooks/useSignOutViewModel";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock("@/services/session.service", () => ({ signOutUser: vi.fn() }));
const signOutUserMock = vi.mocked(signOutUser);

beforeEach(() => {
  vi.resetAllMocks();
  signOutUserMock.mockResolvedValue(undefined);
});

// El registro de cambios sin guardar vive en el módulo: se deja limpio entre tests.
afterEach(() => setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, false));

describe("useSignOutViewModel", () => {
  it("starts idle with no dialog", () => {
    const { result } = renderHook(() => useSignOutViewModel());

    expect(result.current.status).toBe(SIGN_OUT_STATUS.IDLE);
    expect(result.current.isConfirmOpen).toBe(false);
  });

  // CA-02, CA-03
  it("signs out right away and goes to the login when nothing is unsaved", async () => {
    const { result } = renderHook(() => useSignOutViewModel());

    await act(() => result.current.handleRequest());

    expect(signOutUserMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith(AUTH_ROUTE.LOGIN);
  });

  it("goes to the login only after the session is closed", async () => {
    const { result } = renderHook(() => useSignOutViewModel());

    await act(() => result.current.handleRequest());

    expect(signOutUserMock.mock.invocationCallOrder[0]).toBeLessThan(
      replaceMock.mock.invocationCallOrder[0],
    );
  });

  // CA-03
  it("asks for confirmation instead of signing out when something is unsaved", async () => {
    setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, true);
    const { result } = renderHook(() => useSignOutViewModel());

    await act(() => result.current.handleRequest());

    expect(result.current.isConfirmOpen).toBe(true);
    expect(signOutUserMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("goes back to idle without signing out when the confirmation is cancelled", async () => {
    setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, true);
    const { result } = renderHook(() => useSignOutViewModel());
    await act(() => result.current.handleRequest());

    act(() => result.current.handleCancel());

    expect(result.current.status).toBe(SIGN_OUT_STATUS.IDLE);
    expect(signOutUserMock).not.toHaveBeenCalled();
  });

  it("signs out and goes to the login when the confirmation is accepted", async () => {
    setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, true);
    const { result } = renderHook(() => useSignOutViewModel());
    await act(() => result.current.handleRequest());

    await act(() => result.current.handleConfirm());

    expect(signOutUserMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith(AUTH_ROUTE.LOGIN);
  });

  it("does not ask again once the unsaved changes are gone", async () => {
    setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, true);
    const { result } = renderHook(() => useSignOutViewModel());
    act(() => setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, false));

    await act(() => result.current.handleRequest());

    expect(result.current.isConfirmOpen).toBe(false);
    expect(signOutUserMock).toHaveBeenCalledTimes(1);
  });

  it("does not start a second sign-out while one is in progress", async () => {
    let finishSignOut: () => void = () => undefined;
    signOutUserMock.mockReturnValue(new Promise<void>((resolve) => (finishSignOut = resolve)));
    const { result } = renderHook(() => useSignOutViewModel());

    await act(async () => {
      void result.current.handleRequest();
    });
    await act(() => result.current.handleRequest());
    await act(() => result.current.handleConfirm());

    expect(result.current.isSigningOut).toBe(true);
    expect(signOutUserMock).toHaveBeenCalledTimes(1);
    await act(async () => finishSignOut());
  });

  it("keeps going to the login even if closing the session did nothing", async () => {
    signOutUserMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSignOutViewModel());

    await act(() => result.current.handleRequest());

    expect(replaceMock).toHaveBeenCalledTimes(1);
  });
});
