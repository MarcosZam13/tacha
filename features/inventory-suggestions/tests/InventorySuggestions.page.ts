import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { INVENTORY_SUGGESTIONS_TEXT } from "../constants/inventory-suggestions.constants";

/**
 * Page Object de la fila de sugerencias: cómo encontrar sus elementos y
 * tocarlos. Sin aserciones: las hace el test.
 */
export const createInventorySuggestionsPage = () => {
  const user = userEvent.setup();

  const findRegion = (): Promise<HTMLElement> =>
    screen.findByRole("region", { name: INVENTORY_SUGGESTIONS_TEXT.TITLE });
  const queryRegion = (): HTMLElement | null =>
    screen.queryByRole("region", { name: INVENTORY_SUGGESTIONS_TEXT.TITLE });

  const getCards = (region: HTMLElement): HTMLElement[] => within(region).getAllByRole("listitem");
  const queryCards = (): HTMLElement[] => {
    const region = queryRegion();
    return region ? within(region).queryAllByRole("listitem") : [];
  };
  const getCard = (region: HTMLElement, productName: string): HTMLElement =>
    within(region)
      .getAllByRole("listitem")
      .find((card) => within(card).queryByText(productName) !== null) as HTMLElement;

  // SCRUM-104: el nombre accesible lleva el producto. jsdom puede juntar el
  // texto oculto sin espacios; se busca por expresión, como en "Mis productos".
  const getConfirmButton = (productName: string): HTMLElement =>
    screen.getByRole("button", {
      name: new RegExp(
        `${INVENTORY_SUGGESTIONS_TEXT.CONFIRM_LABEL_PREFIX}\\s?${productName}\\s?${INVENTORY_SUGGESTIONS_TEXT.CONFIRM_LABEL_SUFFIX}`,
      ),
    });
  const getDismissButton = (productName: string): HTMLElement =>
    screen.getByRole("button", {
      name: new RegExp(`${INVENTORY_SUGGESTIONS_TEXT.DISMISS_LABEL_PREFIX}\\s?${productName}`),
    });
  const queryError = (): HTMLElement | null => screen.queryByRole("alert");

  const confirm = async (productName: string): Promise<void> => {
    await user.click(getConfirmButton(productName));
  };
  const dismiss = async (productName: string): Promise<void> => {
    await user.click(getDismissButton(productName));
  };

  return {
    confirm,
    dismiss,
    findRegion,
    getCard,
    getCards,
    getConfirmButton,
    getDismissButton,
    queryCards,
    queryError,
    queryRegion,
  };
};
