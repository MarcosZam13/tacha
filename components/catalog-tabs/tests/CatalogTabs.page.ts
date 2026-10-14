import { screen } from "@testing-library/react";
import { CATALOG_TAB, CATALOG_TAB_LABEL, CATALOG_TABS_TEXT } from "@/constants";

/**
 * Page Object de los sub-tabs de Catálogo: cómo encontrar la navegación y
 * sus links. Sin aserciones: las hace el test.
 */
export const createCatalogTabsPage = () => {
  const getNavigation = () => screen.getByRole("navigation", { name: CATALOG_TABS_TEXT.NAV_LABEL });
  const getTab = (name: string) => screen.getByRole("link", { name });

  const getSearchTab = () => getTab(CATALOG_TAB_LABEL[CATALOG_TAB.SEARCH]);
  const getMyProductsTab = () => getTab(CATALOG_TAB_LABEL[CATALOG_TAB.MY_PRODUCTS]);

  return { getMyProductsTab, getNavigation, getSearchTab };
};
