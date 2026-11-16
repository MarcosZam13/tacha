// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_ROUTE } from "@/constants";
import { SOCIAL_SIGN_UP_STATUS } from "../constants/social-sign-up.constants";
import { completeSocialSignUp } from "../services/social-sign-up.service";
import { SocialSignUpCallback } from "../SocialSignUpCallback";
import { createSocialSignUpCallbackPage } from "./SocialSignUpCallback.page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("../services/social-sign-up.service", () => ({ completeSocialSignUp: vi.fn() }));
const completeSocialSignUpMock = vi.mocked(completeSocialSignUp);

const renderCallback = (): ReturnType<typeof createSocialSignUpCallbackPage> => {
  render(<SocialSignUpCallback />);
  return createSocialSignUpCallbackPage();
};

afterEach(cleanup);
beforeEach(() => {
  completeSocialSignUpMock.mockReset();
});

describe("SocialSignUpCallback", () => {
  it("shows a spinner while the account is being validated", () => {
    completeSocialSignUpMock.mockReturnValue(new Promise(() => undefined));

    const page = renderCallback();

    expect(page.getSpinner()).toBeInTheDocument();
  });

  // CA-04
  it("tells the person the email is registered and links to the login", async () => {
    completeSocialSignUpMock.mockResolvedValue(SOCIAL_SIGN_UP_STATUS.EMAIL_EXISTS);

    const page = renderCallback();

    expect(await page.findAlert()).toHaveTextContent("Este correo ya está registrado.");
    expect(page.getLink("Iniciar sesión")).toHaveAttribute("href", AUTH_ROUTE.LOGIN);
  });

  // CA-06
  it("shows the error and links back to the registration", async () => {
    completeSocialSignUpMock.mockResolvedValue(SOCIAL_SIGN_UP_STATUS.ERROR);

    const page = renderCallback();

    expect(await page.findAlert()).toBeInTheDocument();
    expect(page.getLink("Volver al registro")).toHaveAttribute("href", AUTH_ROUTE.REGISTER);
  });
});
