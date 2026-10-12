// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordDone } from "../components/ResetPasswordDone";
import { ResetPasswordInvalid } from "../components/ResetPasswordInvalid";
import { resetPasswordPage } from "./ResetPassword.page";

afterEach(cleanup);

describe("ResetPasswordInvalid", () => {
  it("says the link is not valid, with the focus on the title, and offers a new link", () => {
    render(<ResetPasswordInvalid />);

    expect(resetPasswordPage.invalidTitle()).toHaveFocus();
    expect(document.body).toHaveTextContent("El enlace para restablecer tu contraseña no es válido o ya venció.");
    expect(resetPasswordPage.requestNewLinkLink()).toHaveAttribute("href", "/recuperar-contrasena");
  });
});

describe("ResetPasswordDone", () => {
  it("confirms the change, with the focus on the title", () => {
    render(<ResetPasswordDone onGoToLogin={vi.fn()} />);

    expect(resetPasswordPage.doneTitle()).toHaveFocus();
    expect(document.body).toHaveTextContent("Tu contraseña se actualizó.");
  });

  it("lets the user go to the login without waiting for the redirect", async () => {
    const onGoToLogin = vi.fn();
    render(<ResetPasswordDone onGoToLogin={onGoToLogin} />);

    await userEvent.click(resetPasswordPage.goToLoginButton());

    expect(onGoToLogin).toHaveBeenCalledTimes(1);
  });
});
