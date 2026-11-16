// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SocialSignUpButtons } from "../components/SocialSignUpButtons";
import {
  SOCIAL_PROVIDER,
  SOCIAL_SIGN_UP_LABEL,
  SOCIAL_SIGN_UP_STATUS,
} from "../constants/social-sign-up.constants";
import { startSocialSignUp } from "../services/social-sign-up.service";
import { createSocialSignUpButtonsPage } from "./SocialSignUpButtons.page";

vi.mock("../services/social-sign-up.service", () => ({ startSocialSignUp: vi.fn() }));
const startSocialSignUpMock = vi.mocked(startSocialSignUp);

const renderButtons = (): ReturnType<typeof createSocialSignUpButtonsPage> => {
  render(<SocialSignUpButtons />);
  return createSocialSignUpButtonsPage();
};

afterEach(cleanup);
beforeEach(() => {
  startSocialSignUpMock.mockReset();
});

describe("SocialSignUpButtons", () => {
  // CA-01
  it("shows the Google and Facebook buttons", () => {
    const page = renderButtons();

    expect(page.getProviderButton(SOCIAL_PROVIDER.GOOGLE)).toBeInTheDocument();
    expect(page.getProviderButton(SOCIAL_PROVIDER.FACEBOOK)).toBeInTheDocument();
  });

  // CA-02
  it("starts the flow of the chosen provider and disables the buttons", async () => {
    startSocialSignUpMock.mockResolvedValue(SOCIAL_SIGN_UP_STATUS.SUCCESS);
    const page = renderButtons();

    await page.clickProvider(SOCIAL_PROVIDER.GOOGLE);

    expect(startSocialSignUpMock).toHaveBeenCalledWith(SOCIAL_PROVIDER.GOOGLE);
    expect(page.getProviderButton(SOCIAL_PROVIDER.FACEBOOK)).toBeDisabled();
  });

  it("shows an error and enables the buttons when the flow cannot start", async () => {
    startSocialSignUpMock.mockResolvedValue(SOCIAL_SIGN_UP_STATUS.ERROR);
    const page = renderButtons();

    await page.clickProvider(SOCIAL_PROVIDER.FACEBOOK);

    expect(await page.findError()).toHaveTextContent(SOCIAL_SIGN_UP_LABEL.START_ERROR);
    expect(page.getProviderButton(SOCIAL_PROVIDER.FACEBOOK)).toBeEnabled();
  });
});
