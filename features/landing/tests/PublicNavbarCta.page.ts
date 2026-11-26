import { screen } from "@testing-library/react";
import { NAVBAR_TEXT } from "../constants/landing.constants";

// Cómo encontrar los botones de la navbar pública en los tests de componente. Sin aserciones.
export const createPublicNavbarCtaPage = () => {
  const getRegisterLink = (): HTMLElement => screen.getByRole("link", { name: NAVBAR_TEXT.REGISTER });
  const queryRegisterLink = (): HTMLElement | null => screen.queryByRole("link", { name: NAVBAR_TEXT.REGISTER });
  const getLoginLink = (): HTMLElement => screen.getByRole("link", { name: NAVBAR_TEXT.LOGIN });
  const queryLoginLink = (): HTMLElement | null => screen.queryByRole("link", { name: NAVBAR_TEXT.LOGIN });
  const getGoToAppLink = (): HTMLElement => screen.getByRole("link", { name: NAVBAR_TEXT.GO_TO_APP });
  const queryGoToAppLink = (): HTMLElement | null => screen.queryByRole("link", { name: NAVBAR_TEXT.GO_TO_APP });

  return { getGoToAppLink, getLoginLink, getRegisterLink, queryGoToAppLink, queryLoginLink, queryRegisterLink };
};
