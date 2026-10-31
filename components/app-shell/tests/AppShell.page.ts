import { screen, within } from "@testing-library/react";
import { APP_SHELL_TEXT } from "../constants/app-shell.constants";

export const createAppShellPage = () => {
  // Sidebar y tabs tienen el mismo nombre; en jsdom no hay CSS, así que están las dos.
  const getNavigations = (): HTMLElement[] => screen.getAllByRole("navigation", { name: APP_SHELL_TEXT.NAV_LABEL });

  const getLink = (navigation: HTMLElement, label: string): HTMLElement =>
    within(navigation).getByRole("link", { name: label });

  const getCurrentLinks = (): HTMLElement[] =>
    screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");

  const getMain = (): HTMLElement => screen.getByRole("main");

  // El acceso al perfil está en el sidebar (con el nombre) y en la cabecera de mobile (solo el avatar).
  const getProfileLinks = (): HTMLElement[] =>
    screen.getAllByRole("link", { name: new RegExp(`^${APP_SHELL_TEXT.PROFILE_LINK_LABEL}`) });

  const getSidebarProfileName = (): HTMLElement => within(screen.getByRole("complementary")).getByRole("link", {
    name: new RegExp(`^${APP_SHELL_TEXT.PROFILE_LINK_LABEL}`),
  });

  const getTopBarProfileLink = (): HTMLElement =>
    within(screen.getByRole("banner")).getByRole("link", { name: new RegExp(`^${APP_SHELL_TEXT.PROFILE_LINK_LABEL}`) });

  return { getCurrentLinks, getLink, getMain, getNavigations, getProfileLinks, getSidebarProfileName, getTopBarProfileLink };
};
