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

  return { getCurrentLinks, getLink, getMain, getNavigations };
};
