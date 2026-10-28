import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PRODUCT_DETAIL_TEXT } from "../constants/catalog-product-detail.constants";

/**
 * Page Object de la pantalla de detalle de producto: cómo encontrar sus
 * secciones y disparar sus acciones. Sin aserciones: las hace el test.
 */
export const createProductDetailPage = () => {
  const user = userEvent.setup();

  const getHeading = (name: string) => screen.getByRole("heading", { level: 1, name });
  const getErrorMessage = () => screen.getByRole("alert");
  const queryRetryButton = () => screen.queryByRole("button", { name: PRODUCT_DETAIL_TEXT.RETRY });
  const clickRetry = async () => {
    await user.click(screen.getByRole("button", { name: PRODUCT_DETAIL_TEXT.RETRY }));
  };

  const getBrandsSection = () =>
    screen.getByRole("heading", { name: PRODUCT_DETAIL_TEXT.BRANDS_TITLE }).closest("section");
  const getBrandNames = () =>
    within(getBrandsSection() as HTMLElement)
      .getAllByRole("listitem")
      .map((item) => item.textContent);
  const queryNoBrandsMessage = () => screen.queryByText(PRODUCT_DETAIL_TEXT.NO_BRANDS);

  const getPricesSection = () =>
    screen.getByRole("heading", { name: PRODUCT_DETAIL_TEXT.PRICES_TITLE }).closest("section");
  const getStoreRows = () =>
    within(getPricesSection() as HTMLElement)
      .getAllByRole("listitem")
      .map((item) => item.textContent);
  const queryNoPricesMessage = () => screen.queryByText(PRODUCT_DETAIL_TEXT.NO_PRICES);

  const getQuantityValue = () => screen.getByText(/^\d+$/).textContent;
  const clickIncreaseQuantity = async () => {
    await user.click(screen.getByRole("button", { name: PRODUCT_DETAIL_TEXT.INCREASE_QUANTITY }));
  };
  const clickDecreaseQuantity = async () => {
    await user.click(screen.getByRole("button", { name: PRODUCT_DETAIL_TEXT.DECREASE_QUANTITY }));
  };
  const clickAddToList = async () => {
    await user.click(screen.getByRole("button", { name: PRODUCT_DETAIL_TEXT.ADD_TO_LIST_BUTTON }));
  };

  const getAddErrorMessage = () => screen.queryByRole("alert");
  const queryAddedConfirmation = () => screen.queryByText(PRODUCT_DETAIL_TEXT.ADDED_CONFIRMATION);

  return {
    clickAddToList,
    clickDecreaseQuantity,
    clickIncreaseQuantity,
    clickRetry,
    getAddErrorMessage,
    getBrandNames,
    getErrorMessage,
    getHeading,
    getQuantityValue,
    getStoreRows,
    queryAddedConfirmation,
    queryNoBrandsMessage,
    queryNoPricesMessage,
    queryRetryButton,
  };
};
