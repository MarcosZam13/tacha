import { screen, within } from "@testing-library/react";
import { INVENTORY_SUGGESTIONS_TEXT } from "../constants/inventory-suggestions.constants";

/**
 * Page Object de la fila de sugerencias: cómo encontrar sus elementos. Sin
 * aserciones: las hace el test.
 */
export const createInventorySuggestionsPage = () => {
  const findRegion = (): Promise<HTMLElement> =>
    screen.findByRole("region", { name: INVENTORY_SUGGESTIONS_TEXT.TITLE });
  const queryRegion = (): HTMLElement | null =>
    screen.queryByRole("region", { name: INVENTORY_SUGGESTIONS_TEXT.TITLE });

  const getCards = (region: HTMLElement): HTMLElement[] => within(region).getAllByRole("listitem");
  const getCard = (region: HTMLElement, productName: string): HTMLElement =>
    within(region)
      .getAllByRole("listitem")
      .find((card) => within(card).queryByText(productName) !== null) as HTMLElement;

  return { findRegion, getCard, getCards, queryRegion };
};
