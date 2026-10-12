// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluatePasswordStrength } from "@/utils/password.utils";
import type { ResetPasswordFormProps } from "../components/models/ResetPasswordFormProps.interface";
import { ResetPasswordForm } from "../components/ResetPasswordForm";
import { resetPasswordPage } from "./ResetPassword.page";

afterEach(cleanup);

const renderForm = (overrides: Partial<ResetPasswordFormProps> = {}): void => {
  render(
    <ResetPasswordForm
      confirmPasswordError={undefined}
      handleChange={() => vi.fn()}
      handleSubmit={vi.fn()}
      isSaveDisabled={false}
      isSaving={false}
      passwordStrength={undefined}
      submitError={undefined}
      values={{ confirmPassword: "", newPassword: "" }}
      {...overrides}
    />,
  );
};

describe("ResetPasswordForm", () => {
  it("moves the focus to the title, since the previous screen's control is gone", () => {
    renderForm();

    expect(resetPasswordPage.formTitle()).toHaveFocus();
  });

  it("offers the new and repeat fields as new-password fields, each with its show/hide button", () => {
    renderForm();

    expect(resetPasswordPage.newPasswordField()).toHaveAttribute("autocomplete", "new-password");
    expect(resetPasswordPage.confirmPasswordField()).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getAllByRole("button", { name: "Mostrar contraseña" })).toHaveLength(2);
  });

  it("shows the strength meter once there is a password to rate, and not before", () => {
    renderForm();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    cleanup();

    renderForm({ passwordStrength: evaluatePasswordStrength("Tacha2026!") });

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("blocks the button and says it is saving while the request is in flight", () => {
    renderForm({ isSaveDisabled: true, isSaving: true });

    expect(resetPasswordPage.saveButton()).toHaveTextContent("Guardando...");
    expect(resetPasswordPage.saveButton()).toBeDisabled();
  });

  it("shows the mismatch under the repeat field and the save failure as an alert", () => {
    renderForm({
      confirmPasswordError: "Las contraseñas no coinciden.",
      submitError: "La nueva contraseña debe ser distinta de la actual.",
    });

    expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
    expect(resetPasswordPage.errorAlert()).toHaveTextContent("La nueva contraseña debe ser distinta de la actual.");
  });
});
