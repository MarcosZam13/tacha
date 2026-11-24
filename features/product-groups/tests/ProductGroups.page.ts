import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PRODUCT_GROUPS_TEXT } from "../constants/product-groups.constants";

/**
 * Page Object de "Mis grupos": cómo encontrar sus elementos y qué puede
 * hacer el usuario. Sin aserciones: las hace el test.
 */
export const createProductGroupsPage = () => {
  const user = userEvent.setup();

  const getTitle = (): HTMLElement => screen.getByRole("heading", { level: 1, name: PRODUCT_GROUPS_TEXT.TITLE });
  const getBackLink = (): HTMLElement => screen.getByRole("link", { name: PRODUCT_GROUPS_TEXT.BACK_TO_LIST });
  const getSpinner = (): HTMLElement => screen.getByRole("status", { name: PRODUCT_GROUPS_TEXT.LOADING });
  const getError = (): HTMLElement => screen.getByRole("alert");
  const getEmptyState = (): HTMLElement => screen.getByText(PRODUCT_GROUPS_TEXT.EMPTY_SUGGESTION);
  // Cada tarjeta es un <li> con el nombre del grupo como <h2>.
  const getCard = (groupName: string): HTMLElement => {
    const card = screen.getByRole("heading", { level: 2, name: groupName }).closest("li");
    if (!card) throw new Error(`La tarjeta "${groupName}" no está dentro de un <li>`);
    return card;
  };
  // El conteo es el único texto de la tarjeta con la forma "N producto(s)".
  const getCountLabel = (groupName: string): string =>
    within(getCard(groupName)).getByText(/^\d+ productos?$/).textContent ?? "";
  const querySharedBadge = (groupName: string): HTMLElement | null =>
    within(getCard(groupName)).queryByText(PRODUCT_GROUPS_TEXT.SHARED_BADGE);

  const queryError = (): HTMLElement | null => screen.queryByRole("alert");
  const queryEmptyState = (): HTMLElement | null => screen.queryByText(PRODUCT_GROUPS_TEXT.EMPTY_SUGGESTION);
  const queryCardNames = (): string[] =>
    screen.queryAllByRole("heading", { level: 2 }).map((heading) => heading.textContent ?? "");

  const retry = async (): Promise<void> => {
    await user.click(screen.getByRole("button", { name: PRODUCT_GROUPS_TEXT.RETRY }));
  };

  return {
    getBackLink,
    getCountLabel,
    getEmptyState,
    getError,
    getSpinner,
    getTitle,
    queryCardNames,
    queryEmptyState,
    queryError,
    querySharedBadge,
    retry,
  };
};
