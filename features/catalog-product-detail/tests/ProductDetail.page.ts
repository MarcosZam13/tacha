import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { REFERENCE_PRICE_TEXT } from "@/constants";
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

  // HU-57: sección "Precio de referencia" de un producto personalizado.
  const findHeading = (name: string) => screen.findByRole("heading", { level: 1, name });
  const findReferencePriceHeading = () => screen.findByRole("heading", { name: REFERENCE_PRICE_TEXT.TITLE });
  const queryReferencePriceHeading = () => screen.queryByRole("heading", { name: REFERENCE_PRICE_TEXT.TITLE });
  const queryText = (text: string) => screen.queryByText(text);
  // El precio comparte su elemento con el ícono "i": se busca como parte del texto.
  // Intl separa los miles con un espacio duro y Testing Library lo normaliza a
  // un espacio normal en el DOM: se normaliza también lo buscado.
  // Sin dígitos pegados antes ni después: "₡3 200" no coincide con "₡13 200".
  const queryPrice = (priceLabel: string) => {
    const escapedLabel = priceLabel.replace(/\s+/g, " ").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return screen.queryByText(new RegExp(`(?<!\\d)${escapedLabel}(?!\\d)`));
  };

  const getAddErrorMessage = () => screen.queryByRole("alert");
  // SCRUM-163: aviso de que un producto personal no entra a la lista de la familia.
  const findAddToListBlockedNote = () => screen.findByRole("note");
  const queryAddToListButton = () => screen.queryByRole("button", { name: PRODUCT_DETAIL_TEXT.ADD_TO_LIST_BUTTON });
  const queryAddedConfirmation = () => screen.queryByText(PRODUCT_DETAIL_TEXT.ADDED_CONFIRMATION);

  return {
    clickAddToList,
    findAddToListBlockedNote,
    clickDecreaseQuantity,
    clickIncreaseQuantity,
    clickRetry,
    findHeading,
    findReferencePriceHeading,
    getAddErrorMessage,
    getBrandNames,
    getErrorMessage,
    getHeading,
    getQuantityValue,
    getStoreRows,
    queryAddToListButton,
    queryAddedConfirmation,
    queryNoBrandsMessage,
    queryNoPricesMessage,
    queryReferencePriceHeading,
    queryRetryButton,
    queryPrice,
    queryText,
  };
};
