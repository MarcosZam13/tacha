import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { INVENTORY_GROUP_TITLE, MY_INVENTORY_TEXT } from "../constants/my-inventory.constants";

/**
 * Page Object de "Mi inventario": cómo encontrar sus elementos y tocarlos.
 * Sin aserciones: las hace el test.
 */
export const createMyInventoryPage = () => {
  const user = userEvent.setup();

  const getTitle = (): HTMLElement => screen.getByRole("heading", { level: 1, name: MY_INVENTORY_TEXT.TITLE });
  const getBackLink = (): HTMLElement => screen.getByRole("link", { name: MY_INVENTORY_TEXT.BACK_TO_LIST });
  const getLoading = (): HTMLElement => screen.getByRole("status", { name: MY_INVENTORY_TEXT.LOADING });
  const findError = (): Promise<HTMLElement> => screen.findByRole("alert");
  const findEmptyState = (): Promise<HTMLElement> => screen.findByText(MY_INVENTORY_TEXT.EMPTY);

  // Los grupos son regiones con su título (h2).
  const findGroups = (): Promise<HTMLElement[]> => screen.findAllByRole("region");
  const getGroupTitles = (): string[] =>
    screen.queryAllByRole("region").map((region) => within(region).getByRole("heading", { level: 2 }).textContent ?? "");
  const getGroup = (group: keyof typeof INVENTORY_GROUP_TITLE): HTMLElement =>
    screen.getByRole("region", { name: INVENTORY_GROUP_TITLE[group] });
  const getItems = (region: HTMLElement): HTMLElement[] => within(region).getAllByRole("listitem");

  const retry = async (): Promise<void> => {
    await user.click(screen.getByRole("button", { name: MY_INVENTORY_TEXT.RETRY }));
  };

  return { findEmptyState, findError, findGroups, getBackLink, getGroup, getGroupTitles, getItems, getLoading, getTitle, retry };
};
