// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";
import type { ForgotPasswordFormProps } from "../components/models/ForgotPasswordFormProps.interface";
import { forgotPasswordPage } from "./ForgotPassword.page";

afterEach(cleanup);

const renderForm = (overrides: Partial<ForgotPasswordFormProps> = {}): void => {
  render(
    <ForgotPasswordForm
      email=""
      emailError={undefined}
      handleChange={vi.fn()}
      handleSubmit={vi.fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
      submitError={undefined}
      {...overrides}
    />,
  );
};

describe("ForgotPasswordForm", () => {
  it("offers to send the link and to go back to the login", () => {
    renderForm();

    expect(forgotPasswordPage.title()).toBeInTheDocument();
    expect(forgotPasswordPage.submitButton()).toHaveTextContent("Enviar enlace");
    expect(forgotPasswordPage.backToLoginLink()).toHaveAttribute("href", "/login");
  });

  it("says it is sending and disables the button while the request is in flight", () => {
    renderForm({ isSubmitDisabled: true, isSubmitting: true });

    expect(forgotPasswordPage.submitButton()).toHaveTextContent("Enviando...");
    expect(forgotPasswordPage.submitButton()).toBeDisabled();
  });

  it("shows the email error under the field", () => {
    renderForm({ email: "ana@", emailError: "Ingresá un correo válido." });

    expect(screen.getByText("Ingresá un correo válido.")).toBeInTheDocument();
  });

  it("shows the sending failure as an alert", () => {
    renderForm({ submitError: "No pudimos enviar el correo. Intentá de nuevo en unos minutos." });

    expect(forgotPasswordPage.errorAlert()).toHaveTextContent("No pudimos enviar el correo.");
  });
});
