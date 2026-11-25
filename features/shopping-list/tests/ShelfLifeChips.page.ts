import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Page Object de los chips de "cuánto le va a durar" (SCRUM-103): cómo
 * encontrarlos y tocarlos. Sin aserciones: las hace el test.
 */
export const createShelfLifeChipsPage = (productName: string) => {
  const user = userEvent.setup();

  const getGroup = (): HTMLElement => screen.getByRole("group", { name: `¿Cuánto te va a durar ${productName}?` });
  const queryGroup = (): HTMLElement | null =>
    screen.queryByRole("group", { name: `¿Cuánto te va a durar ${productName}?` });
  const getChips = (): HTMLElement[] => within(getGroup()).getAllByRole("button");
  const getChip = (label: string): HTMLElement => within(getGroup()).getByRole("button", { name: label });
  const queryError = (): HTMLElement | null => screen.queryByRole("alert");

  const clickChip = async (label: string): Promise<void> => {
    await user.click(getChip(label));
  };

  return { clickChip, getChip, getChips, getGroup, queryError, queryGroup };
};
