import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FINANCE_TEXT, HISTORY_VIEWS, HISTORY_VIEW, PRODUCT_HISTORY_TEXT } from "../constants/finance.constants";
import type { HistoryViewType } from "../constants/finance.constants";

const toViewLabel = (viewId: HistoryViewType): string => HISTORY_VIEWS.find((view) => view.id === viewId)?.label ?? "";

/**
 * Page Object de la vista "Productos" (SCRUM-93) y del selector "Compras /
 * Productos". Sin aserciones: las hace el test.
 */
export const createProductPurchaseHistoryPage = () => {
  const user = userEvent.setup();

  // Acceso.
  const findNoAccountNotice = () => screen.findByText(FINANCE_TEXT.NO_ACCOUNT);

  // Selector (D31).
  const findViewSwitch = () => screen.findByRole("navigation", { name: PRODUCT_HISTORY_TEXT.VIEW_NAV_LABEL });
  const queryViewSwitch = () => screen.queryByRole("navigation", { name: PRODUCT_HISTORY_TEXT.VIEW_NAV_LABEL });
  const getViewLink = (viewId: HistoryViewType) => screen.getByRole("link", { name: toViewLabel(viewId) });
  const getProductsViewLink = () => getViewLink(HISTORY_VIEW.PRODUCTS);
  const getPurchasesViewLink = () => getViewLink(HISTORY_VIEW.PURCHASES);

  // Buscador.
  const getSearchInput = () => screen.getByRole("textbox", { name: PRODUCT_HISTORY_TEXT.SEARCH_LABEL });
  const search = async (text: string) => {
    await user.clear(getSearchInput());
    if (text) await user.type(getSearchInput(), text);
  };

  // Lista.
  const findProductList = () => screen.findByRole("list", { name: PRODUCT_HISTORY_TEXT.LIST_LABEL });
  const queryProductList = () => screen.queryByRole("list", { name: PRODUCT_HISTORY_TEXT.LIST_LABEL });
  // Solo los botones de producto: llevan aria-expanded (SPEC §9).
  const getProductButtons = () =>
    within(screen.getByRole("list", { name: PRODUCT_HISTORY_TEXT.LIST_LABEL }))
      .getAllByRole("button")
      .filter((button) => button.hasAttribute("aria-expanded"));
  const findProductButton = (name: string) => screen.findByRole("button", { name });
  const getProductButton = (name: string) => screen.getByRole("button", { name });
  const toggleProduct = async (name: string) => {
    await user.click(getProductButton(name));
  };
  const findLoadMoreButton = () => screen.findByRole("button", { name: PRODUCT_HISTORY_TEXT.LOAD_MORE });
  const queryLoadMoreButton = () => screen.queryByRole("button", { name: PRODUCT_HISTORY_TEXT.LOAD_MORE });
  const loadMore = async () => {
    await user.click(await findLoadMoreButton());
  };

  // Detalle.
  const findDetail = () => screen.findByRole("region");
  const queryDetail = () => screen.queryByRole("region");
  const findDetailTitle = () => screen.findByRole("heading", { level: 2 });
  const findDetailRows = async (productName: string) =>
    within(
      await screen.findByRole("list", { name: `${PRODUCT_HISTORY_TEXT.DETAIL_LIST_PREFIX}${productName}` }),
    ).getAllByRole("listitem");

  // Estados.
  const findAlert = (text: string) => screen.findByText(text);
  const getRetryButton = () => screen.getByRole("button", { name: FINANCE_TEXT.RETRY });
  const retry = async () => {
    await user.click(getRetryButton());
  };
  const getStatusRegion = () => screen.getByText((_, element) => element?.getAttribute("aria-live") === "polite");

  return {
    findAlert,
    findDetail,
    findDetailRows,
    findDetailTitle,
    findLoadMoreButton,
    findNoAccountNotice,
    findProductButton,
    findProductList,
    findViewSwitch,
    getProductButton,
    getProductButtons,
    getProductsViewLink,
    getPurchasesViewLink,
    getRetryButton,
    getSearchInput,
    getStatusRegion,
    loadMore,
    queryDetail,
    queryLoadMoreButton,
    queryProductList,
    queryViewSwitch,
    retry,
    search,
    toggleProduct,
  };
};
