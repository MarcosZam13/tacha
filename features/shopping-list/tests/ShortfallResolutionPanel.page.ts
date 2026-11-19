import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Page Object del panel "¿Qué hiciste?" y del diálogo de deshacer (SCRUM-115):
 * cómo encontrar sus partes y tocarlas. Sin aserciones: las hace el test.
 */
export const createShortfallResolutionPage = () => {
  const user = userEvent.setup();

  const getPanel = () => screen.getByRole("dialog", { name: "¿Qué hiciste?" });
  const queryPanel = () => screen.queryByRole("dialog", { name: "¿Qué hiciste?" });
  const getSameAgainButton = () => within(getPanel()).getByRole("button", { name: /agregué otra igual|guardando/i });
  const getOtherPresentationButton = () => within(getPanel()).getByRole("button", { name: "Cambié a otra presentación" });
  const getHadEnoughButton = () => within(getPanel()).getByRole("button", { name: "Ya tenía suficiente" });
  const getNotNowButton = () => within(getPanel()).getByRole("button", { name: "Ahora no" });
  const getBackButton = () => within(getPanel()).getByRole("button", { name: "Volver" });
  const getPresentationButton = (accessibleLabel: string) =>
    within(getPanel()).getByRole("button", { name: accessibleLabel });
  const getNoteTexts = () =>
    within(getPanel())
      .getAllByRole("listitem")
      .map((noteItem) => noteItem.textContent);
  const queryText = (text: string) => screen.queryByText(text);
  const getAlert = () => screen.getByRole("alert");

  const getUndoDialog = () => screen.getByRole("dialog", { name: "¿Destachar y deshacer lo que elegiste?" });
  const getUndoConfirmButton = () => within(getUndoDialog()).getByRole("button", { name: /destachar y deshacer|destachando/i });
  const getUndoCancelButton = () => within(getUndoDialog()).getByRole("button", { name: "Cancelar" });

  const click = async (element: HTMLElement) => {
    await user.click(element);
  };

  return {
    click,
    getAlert,
    getBackButton,
    getHadEnoughButton,
    getNoteTexts,
    getNotNowButton,
    getOtherPresentationButton,
    getPanel,
    getPresentationButton,
    getSameAgainButton,
    getUndoCancelButton,
    getUndoConfirmButton,
    getUndoDialog,
    queryPanel,
    queryText,
  };
};
