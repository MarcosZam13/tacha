import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  // Edición de totales (SCRUM-91): el lápiz se busca por su nombre propio.
  const user = userEvent.setup();
  const getEditButton = (name: string) => screen.getByRole("button", { name });
  const getAllEditButtons = () => screen.queryAllByRole("button", { name: /^Editar total/u });
  const findEditButton = (name: string) => screen.findByRole("button", { name });
  const queryEditButton = (name: string | RegExp) => screen.queryByRole("button", { name });
  const getTotalInput = (inputLabel: string) => screen.getByRole("textbox", { name: inputLabel });
  const queryTotalInput = (inputLabel: string) => screen.queryByRole("textbox", { name: inputLabel });
  // D21: nunca hay más de un campo abierto.
  const getAllTotalInputs = () => screen.queryAllByRole("textbox");
  const getConfirmTimeZoneButton = () => screen.getByRole("button", { name: FINANCE_TEXT.CONFIRM_TIME_ZONE });
  const queryConfirmTimeZoneButton = () => screen.queryByRole("button", { name: FINANCE_TEXT.CONFIRM_TIME_ZONE });

  const openEdit = async (name: string) => {
    await user.click(getEditButton(name));
  };
  const replaceTotal = async (inputLabel: string, text: string) => {
    const input = getTotalInput(inputLabel);
    await user.clear(input);
    await user.type(input, text);
  };
  const confirmTimeZone = async () => {
    await user.click(getConfirmTimeZoneButton());
  };

  return {
    ...dashboardPage,
    confirmTimeZone,
    findEditButton,
    findPurchaseList,
    findPurchaseRows,
    findTabsNavigation,
    getAllEditButtons,
    getAllTotalInputs,
    getConfirmTimeZoneButton,
    getDashboardTab,
    getEditButton,
    getHistoryTab,
    getTotalInput,
    openEdit,
    queryConfirmTimeZoneButton,
    queryEditButton,
    queryPurchaseList,
    queryTabsNavigation,
    queryTotalInput,
    replaceTotal,
  };
};
