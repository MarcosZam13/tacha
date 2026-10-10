// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FORGOT_PASSWORD_ERROR_MESSAGE,
  FORGOT_PASSWORD_STATUS,
  RECOVERY_REQUEST_RESULT,
} from "../constants/password-recovery.constants";
import { useForgotPasswordViewModel } from "../hooks/useForgotPasswordViewModel";
import type { ForgotPasswordViewModel } from "../models/ForgotPasswordViewModel.interface";
import { requestPasswordReset } from "../services/password-recovery.service";

vi.mock("../services/password-recovery.service", () => ({ requestPasswordReset: vi.fn() }));
const requestPasswordResetMock = vi.mocked(requestPasswordReset);

const submitEvent = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;

const renderWithEmail = (email: string): ReturnType<typeof renderHook<ForgotPasswordViewModel, unknown>> => {
  const hook = renderHook(() => useForgotPasswordViewModel());
  act(() => hook.result.current.handleChange(email));
  return hook;
};

beforeEach(() => {
  requestPasswordResetMock.mockReset();
});

describe("useForgotPasswordViewModel", () => {
  it("starts empty with the button disabled and no error shown", () => {
    const { result } = renderHook(() => useForgotPasswordViewModel());

    expect(result.current.email).toBe("");
    expect(result.current.isSubmitDisabled).toBe(true);
    expect(result.current.emailError).toBeUndefined();
    expect(result.current.status).toBe(FORGOT_PASSWORD_STATUS.IDLE);
  });

  it("treats an email with only spaces as empty: no error shown and the button stays disabled", () => {
    const { result } = renderWithEmail("   ");

    expect(result.current.emailError).toBeUndefined();
    expect(result.current.isSubmitDisabled).toBe(true);
  });

  it("shows the format error and keeps the button disabled while the email is invalid", () => {
    const { result } = renderWithEmail("ana@");

    expect(result.current.emailError).toBe(FORGOT_PASSWORD_ERROR_MESSAGE.EMAIL_INVALID);
    expect(result.current.isSubmitDisabled).toBe(true);
  });

  it("enables the button with a valid email", () => {
    const { result } = renderWithEmail("ana@correo.com");

    expect(result.current.emailError).toBeUndefined();
    expect(result.current.isSubmitDisabled).toBe(false);
  });

  it("does not send anything when the email is invalid", async () => {
    const { result } = renderWithEmail("ana@");

    await act(async () => result.current.handleSubmit(submitEvent));

    expect(requestPasswordResetMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe(FORGOT_PASSWORD_STATUS.IDLE);
  });

  it("sends the normalized email and shows the confirmation", async () => {
    requestPasswordResetMock.mockResolvedValue(RECOVERY_REQUEST_RESULT.SENT);
    const { result } = renderWithEmail("  Ana@Correo.COM ");

    await act(async () => result.current.handleSubmit(submitEvent));

    expect(requestPasswordResetMock).toHaveBeenCalledWith("ana@correo.com");
    expect(result.current.status).toBe(FORGOT_PASSWORD_STATUS.SENT);
    expect(result.current.submitError).toBeUndefined();
  });

  it("disables the button and does not send twice while the request is in flight", async () => {
    let resolveRequest: (value: typeof RECOVERY_REQUEST_RESULT.SENT) => void = () => undefined;
    requestPasswordResetMock.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    const { result } = renderWithEmail("ana@correo.com");

    act(() => {
      void result.current.handleSubmit(submitEvent);
    });
    expect(result.current.isSubmitting).toBe(true);
    expect(result.current.isSubmitDisabled).toBe(true);

    await act(async () => result.current.handleSubmit(submitEvent));
    expect(requestPasswordResetMock).toHaveBeenCalledTimes(1);

    await act(async () => resolveRequest(RECOVERY_REQUEST_RESULT.SENT));
    expect(result.current.status).toBe(FORGOT_PASSWORD_STATUS.SENT);
  });

  it("shows the error, keeps the email, and lets the user retry when the request fails", async () => {
    requestPasswordResetMock.mockResolvedValue(RECOVERY_REQUEST_RESULT.ERROR);
    const { result } = renderWithEmail("ana@correo.com");

    await act(async () => result.current.handleSubmit(submitEvent));

    expect(result.current.status).toBe(FORGOT_PASSWORD_STATUS.ERROR);
    expect(result.current.submitError).toBe(FORGOT_PASSWORD_ERROR_MESSAGE.UNEXPECTED);
    expect(result.current.email).toBe("ana@correo.com");
    expect(result.current.isSubmitDisabled).toBe(false);
  });

  it("clears the failure as soon as the user edits the email", async () => {
    requestPasswordResetMock.mockResolvedValue(RECOVERY_REQUEST_RESULT.ERROR);
    const { result } = renderWithEmail("ana@correo.com");
    await act(async () => result.current.handleSubmit(submitEvent));

    act(() => result.current.handleChange("ana@correo.co"));

    expect(result.current.submitError).toBeUndefined();
    expect(result.current.status).toBe(FORGOT_PASSWORD_STATUS.IDLE);
  });

  it("goes back to an empty form when the user picks another email", async () => {
    requestPasswordResetMock.mockResolvedValue(RECOVERY_REQUEST_RESULT.SENT);
    const { result } = renderWithEmail("ana@correo.com");
    await act(async () => result.current.handleSubmit(submitEvent));

    act(() => result.current.handleUseAnotherEmail());

    expect(result.current.email).toBe("");
    expect(result.current.status).toBe(FORGOT_PASSWORD_STATUS.IDLE);
  });
});
