// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NEW_PASSWORD_ERROR_MESSAGE, NEW_PASSWORD_FIELD } from "@/constants";
import {
  CHANGE_PASSWORD_ERROR_MESSAGE,
  CHANGE_PASSWORD_FIELD,
  CHANGE_PASSWORD_RESULT,
  CHANGE_PASSWORD_STATUS,
} from "../constants/change-password.constants";
import { useChangePasswordViewModel } from "../hooks/useChangePasswordViewModel";
import { changePassword } from "../services/change-password.service";

vi.mock("../services/change-password.service", () => ({ changePassword: vi.fn() }));
const changePasswordMock = vi.mocked(changePassword);

const submitEvent = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;

const CURRENT = "Actual123!";
const NEW = "Tacha2026!";

const fillForm = (
  hook: ReturnType<typeof renderHook<ReturnType<typeof useChangePasswordViewModel>, unknown>>,
  values: { confirm?: string; current?: string; next?: string },
): void => {
  act(() => {
    hook.result.current.handleChange(CHANGE_PASSWORD_FIELD.CURRENT_PASSWORD)(values.current ?? CURRENT);
  });
  act(() => {
    hook.result.current.handleChange(NEW_PASSWORD_FIELD.NEW_PASSWORD)(values.next ?? NEW);
  });
  act(() => {
    hook.result.current.handleChange(NEW_PASSWORD_FIELD.CONFIRM_PASSWORD)(values.confirm ?? NEW);
  });
};

beforeEach(() => {
  vi.resetAllMocks();
  changePasswordMock.mockResolvedValue(CHANGE_PASSWORD_RESULT.SUCCESS);
});

describe("useChangePasswordViewModel", () => {
  it("starts empty, with save disabled and no error shown", () => {
    const { result } = renderHook(() => useChangePasswordViewModel());

    expect(result.current.values).toEqual({ confirmPassword: "", currentPassword: "", newPassword: "" });
    expect(result.current.isSaveDisabled).toBe(true);
    expect(result.current.confirmPasswordError).toBeUndefined();
    expect(result.current.newPasswordError).toBeUndefined();
    expect(result.current.passwordStrength).toBeUndefined();
  });

  it("rates the new password as it is typed", () => {
    const hook = renderHook(() => useChangePasswordViewModel());

    fillForm(hook, {});

    expect(hook.result.current.passwordStrength?.level).toBe("strong");
  });

  it("keeps save disabled and explains the mismatch while the repeat differs", () => {
    const hook = renderHook(() => useChangePasswordViewModel());

    fillForm(hook, { confirm: "Otra2027#" });

    expect(hook.result.current.confirmPasswordError).toBe(NEW_PASSWORD_ERROR_MESSAGE.PASSWORDS_MISMATCH);
    expect(hook.result.current.isSaveDisabled).toBe(true);
  });

  it("keeps save disabled when the current password is empty", () => {
    const hook = renderHook(() => useChangePasswordViewModel());

    fillForm(hook, { current: "" });

    expect(hook.result.current.isSaveDisabled).toBe(true);
  });

  it("enables save once everything is valid", () => {
    const hook = renderHook(() => useChangePasswordViewModel());

    fillForm(hook, {});

    expect(hook.result.current.isSaveDisabled).toBe(false);
  });

  it("rejects a new password equal to the current one and says so", () => {
    const hook = renderHook(() => useChangePasswordViewModel());

    fillForm(hook, { confirm: CURRENT, current: CURRENT, next: CURRENT });

    expect(hook.result.current.newPasswordError).toBe(NEW_PASSWORD_ERROR_MESSAGE.SAME_PASSWORD);
    expect(hook.result.current.isSaveDisabled).toBe(true);
  });

  it("does not send anything while the form is invalid", async () => {
    const hook = renderHook(() => useChangePasswordViewModel());
    fillForm(hook, { confirm: "otra" });

    await act(() => hook.result.current.handleSubmit(submitEvent));

    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it("changes the password, confirms it and empties the fields", async () => {
    const hook = renderHook(() => useChangePasswordViewModel());
    fillForm(hook, {});

    await act(() => hook.result.current.handleSubmit(submitEvent));

    expect(changePasswordMock).toHaveBeenCalledWith({ currentPassword: CURRENT, newPassword: NEW });
    expect(hook.result.current.status).toBe(CHANGE_PASSWORD_STATUS.SAVED);
    expect(hook.result.current.values.newPassword).toBe("");
    expect(hook.result.current.values.currentPassword).toBe("");
  });

  it("shows the wrong current password under its own field and keeps what was typed", async () => {
    changePasswordMock.mockResolvedValue(CHANGE_PASSWORD_RESULT.WRONG_CURRENT_PASSWORD);
    const hook = renderHook(() => useChangePasswordViewModel());
    fillForm(hook, {});

    await act(() => hook.result.current.handleSubmit(submitEvent));

    expect(hook.result.current.currentPasswordError).toBe(CHANGE_PASSWORD_ERROR_MESSAGE.WRONG_CURRENT_PASSWORD);
    expect(hook.result.current.submitError).toBeUndefined();
    expect(hook.result.current.status).toBe(CHANGE_PASSWORD_STATUS.IDLE);
    expect(hook.result.current.values.newPassword).toBe(NEW);
  });

  it.each([
    [CHANGE_PASSWORD_RESULT.ERROR, NEW_PASSWORD_ERROR_MESSAGE.UNEXPECTED],
    [CHANGE_PASSWORD_RESULT.REJECTED, NEW_PASSWORD_ERROR_MESSAGE.REJECTED],
    [CHANGE_PASSWORD_RESULT.TOO_MANY_ATTEMPTS, CHANGE_PASSWORD_ERROR_MESSAGE.TOO_MANY_ATTEMPTS],
  ])("shows %s as a general error", async (result, message) => {
    changePasswordMock.mockResolvedValue(result);
    const hook = renderHook(() => useChangePasswordViewModel());
    fillForm(hook, {});

    await act(() => hook.result.current.handleSubmit(submitEvent));

    expect(hook.result.current.submitError).toBe(message);
    expect(hook.result.current.currentPasswordError).toBeUndefined();
  });

  it("clears the wrong-password error as soon as the person types again", async () => {
    changePasswordMock.mockResolvedValue(CHANGE_PASSWORD_RESULT.WRONG_CURRENT_PASSWORD);
    const hook = renderHook(() => useChangePasswordViewModel());
    fillForm(hook, {});
    await act(() => hook.result.current.handleSubmit(submitEvent));

    act(() => hook.result.current.handleChange(CHANGE_PASSWORD_FIELD.CURRENT_PASSWORD)("Otra456!"));

    expect(hook.result.current.currentPasswordError).toBeUndefined();
  });

  it("clears the confirmation when editing again", async () => {
    const hook = renderHook(() => useChangePasswordViewModel());
    fillForm(hook, {});
    await act(() => hook.result.current.handleSubmit(submitEvent));

    act(() => hook.result.current.handleChange(NEW_PASSWORD_FIELD.NEW_PASSWORD)("x"));

    expect(hook.result.current.status).toBe(CHANGE_PASSWORD_STATUS.IDLE);
  });

  it("does not send a second request while one is in progress", async () => {
    let finishSave: (result: typeof CHANGE_PASSWORD_RESULT.SUCCESS) => void = () => undefined;
    changePasswordMock.mockReturnValue(new Promise((resolve) => (finishSave = resolve)));
    const hook = renderHook(() => useChangePasswordViewModel());
    fillForm(hook, {});

    await act(async () => {
      void hook.result.current.handleSubmit(submitEvent);
    });
    await act(() => hook.result.current.handleSubmit(submitEvent));

    expect(changePasswordMock).toHaveBeenCalledTimes(1);
    expect(hook.result.current.isSaveDisabled).toBe(true);
    await act(async () => finishSave(CHANGE_PASSWORD_RESULT.SUCCESS));
  });
});
