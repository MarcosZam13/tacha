// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RESET_PASSWORD_STATUS } from "../constants/password-recovery.constants";
import type { ResetPasswordStatusType } from "../constants/password-recovery.constants";
import { useResetPasswordViewModel } from "../hooks/useResetPasswordViewModel";
import type { ResetPasswordViewModel } from "../models/ResetPasswordViewModel.interface";
import { ResetPassword } from "../ResetPassword";
import { resetPasswordPage } from "./ResetPassword.page";

vi.mock("../hooks/useResetPasswordViewModel", () => ({ useResetPasswordViewModel: vi.fn() }));
const useViewModelMock = vi.mocked(useResetPasswordViewModel);

afterEach(cleanup);

const renderWithStatus = (status: ResetPasswordStatusType): void => {
  const viewModel: ResetPasswordViewModel = {
    confirmPasswordError: undefined,
    handleChange: () => vi.fn(),
    handleGoToLogin: vi.fn(),
    handleSubmit: vi.fn(),
    isSaveDisabled: false,
    isSaving: status === RESET_PASSWORD_STATUS.SAVING,
    passwordStrength: undefined,
    status,
    submitError: undefined,
    values: { confirmPassword: "", newPassword: "" },
  };
  useViewModelMock.mockReturnValue(viewModel);
  render(<ResetPassword />);
};

describe("ResetPassword", () => {
  it("shows only a loading indicator, and no form, while the link is being verified", () => {
    renderWithStatus(RESET_PASSWORD_STATUS.VERIFYING);

    expect(resetPasswordPage.checkingSpinner()).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Nueva contraseña/)).not.toBeInTheDocument();
  });

  it.each([RESET_PASSWORD_STATUS.READY, RESET_PASSWORD_STATUS.SAVING])("shows the form when the state is %s", (status) => {
    renderWithStatus(status);

    expect(resetPasswordPage.formTitle()).toBeInTheDocument();
  });

  it("shows the invalid link screen", () => {
    renderWithStatus(RESET_PASSWORD_STATUS.INVALID);

    expect(resetPasswordPage.invalidTitle()).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nueva contraseña/)).not.toBeInTheDocument();
  });

  it("shows the confirmation once the password is saved", () => {
    renderWithStatus(RESET_PASSWORD_STATUS.DONE);

    expect(resetPasswordPage.doneTitle()).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nueva contraseña/)).not.toBeInTheDocument();
  });
});
