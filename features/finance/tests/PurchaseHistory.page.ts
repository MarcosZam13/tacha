import { screen, within } from "@testing-library/react";
import { FINANCE_TABS, FINANCE_TAB, FINANCE_TEXT } from "../constants/finance.constants";
import type { FinanceTabType } from "../constants/finance.constants";
import { createFinanceDashboardPage } from "./FinanceDashboard.page";

const toTabLabel = (tabId: FinanceTabType): string =>
  FINANCE_TABS.find((tab) => tab.id === tabId)?.label ?? "";

/**
 * Page Object del Historial y de los sub-tabs de Finanzas. Lo común con el
 * Dashboard (sesión, selector, reintento) sale de su Page Object. Sin
 * aserciones: las hace el test.
 */
export const createPurchaseHistoryPage = () => {
  const dashboardPage = createFinanceDashboardPage();

  // Sub-tabs.
  const findTabsNavigation = () => screen.findByRole("navigation", { name: FINANCE_TEXT.TABS_NAV_LABEL });
  const queryTabsNavigation = () => screen.queryByRole("navigation", { name: FINANCE_TEXT.TABS_NAV_LABEL });
  const getDashboardTab = () => screen.getByRole("link", { name: toTabLabel(FINANCE_TAB.DASHBOARD) });
  const getHistoryTab = () => screen.getByRole("link", { name: toTabLabel(FINANCE_TAB.HISTORY) });

  // Lista de compras.
  const findPurchaseList = () => screen.findByRole("list", { name: FINANCE_TEXT.PURCHASES_LIST_LABEL });
  const queryPurchaseList = () => screen.queryByRole("list", { name: FINANCE_TEXT.PURCHASES_LIST_LABEL });
  const findPurchaseRows = async () => within(await findPurchaseList()).getAllByRole("listitem");

  return {
    ...dashboardPage,
    findPurchaseList,
    findPurchaseRows,
    findTabsNavigation,
    getDashboardTab,
    getHistoryTab,
    queryPurchaseList,
    queryTabsNavigation,
  };
};
