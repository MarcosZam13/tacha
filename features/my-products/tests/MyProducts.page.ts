import { screen } from "@testing-library/react";
import { CATALOG_TAB, CATALOG_TAB_LABEL, CATALOG_TABS_TEXT } from "@/constants";
import { MY_PRODUCTS_TEXT } from "../constants/my-products.constants";

/**
 * Page Object de "Mis productos": cómo encontrar sus elementos. Sin
 * aserciones: las hace el test.
 */
export const createMyProductsPage = () => {
  const getTitle = (): HTMLElement =>
    screen.getByRole("heading", { level: 1, name: CATALOG_TABS_TEXT.SECTION_TITLE });
  const getMyProductsTab = (): HTMLElement =>
    screen.getByRole("link", { name: CATALOG_TAB_LABEL[CATALOG_TAB.MY_PRODUCTS] });
  const getSearchTab = (): HTMLElement => screen.getByRole("link", { name: CATALOG_TAB_LABEL[CATALOG_TAB.SEARCH] });

  const getSpinner = (): HTMLElement => screen.getByText(MY_PRODUCTS_TEXT.LOADING);
  const getError = (): HTMLElement => screen.getByRole("alert");
  const getEmptyState = (): HTMLElement => screen.getByText(MY_PRODUCTS_TEXT.EMPTY_SUGGESTION);
  const getCard = (title: string): HTMLElement => screen.getByRole("heading", { name: title });
  const getBadge = (): HTMLElement[] => screen.getAllByText(MY_PRODUCTS_TEXT.BADGE_LABEL);

  const queryError = (): HTMLElement | null => screen.queryByRole("alert");
  const queryEmptyState = (): HTMLElement | null => screen.queryByText(MY_PRODUCTS_TEXT.EMPTY_SUGGESTION);
  const queryCards = (): HTMLElement[] => screen.queryAllByRole("listitem");

  return {
    getBadge,
    getCard,
    getEmptyState,
    getError,
    getMyProductsTab,
    getSearchTab,
    getSpinner,
    getTitle,
    queryCards,
    queryEmptyState,
    queryError,
  };
};
