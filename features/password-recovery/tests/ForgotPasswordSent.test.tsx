// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordSent } from "../components/ForgotPasswordSent";
import { forgotPasswordPage } from "./ForgotPassword.page";

afterEach(cleanup);

describe("ForgotPasswordSent", () => {
  it("moves the focus to the title, since the button that had it is gone", () => {
    render(<ForgotPasswordSent onUseAnotherEmail={vi.fn()} />);

    expect(forgotPasswordPage.title()).toHaveFocus();
  });

  it("announces the generic confirmation", () => {
    render(<ForgotPasswordSent onUseAnotherEmail={vi.fn()} />);

    expect(forgotPasswordPage.sentMessage()).toHaveTextContent(
      "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.",
    );
  });

  it("lets the user pick another email or go back to the login", async () => {
    const onUseAnotherEmail = vi.fn();
    render(<ForgotPasswordSent onUseAnotherEmail={onUseAnotherEmail} />);

    await userEvent.click(forgotPasswordPage.useAnotherEmailButton());

    expect(onUseAnotherEmail).toHaveBeenCalledTimes(1);
    expect(forgotPasswordPage.backToLoginLink()).toHaveAttribute("href", "/login");
  });
});
