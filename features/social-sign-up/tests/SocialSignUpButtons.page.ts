import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SOCIAL_PROVIDER_OPTIONS } from "../constants/social-sign-up.constants";
import type { SocialProviderType } from "../constants/social-sign-up.constants";

const getLabel = (provider: SocialProviderType): string =>
  SOCIAL_PROVIDER_OPTIONS.find((option) => option.provider === provider)?.label ?? "";

export const createSocialSignUpButtonsPage = () => {
  const user = userEvent.setup();

  const getProviderButton = (provider: SocialProviderType): HTMLElement =>
    screen.getByRole("button", { name: getLabel(provider) });

  const clickProvider = async (provider: SocialProviderType): Promise<void> => {
    await user.click(getProviderButton(provider));
  };

  const findError = (): Promise<HTMLElement> => screen.findByRole("alert");

  return { clickProvider, findError, getProviderButton };
};
