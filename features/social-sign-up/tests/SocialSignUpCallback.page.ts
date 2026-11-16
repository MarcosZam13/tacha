import { screen } from "@testing-library/react";
import { SOCIAL_SIGN_UP_LABEL } from "../constants/social-sign-up.constants";

export const createSocialSignUpCallbackPage = () => {
  const getSpinner = (): HTMLElement =>
    screen.getByRole("status", { name: SOCIAL_SIGN_UP_LABEL.CHECKING });

  const findAlert = (): Promise<HTMLElement> => screen.findByRole("alert");

  const getLink = (name: string): HTMLElement => screen.getByRole("link", { name });

  return { findAlert, getLink, getSpinner };
};
