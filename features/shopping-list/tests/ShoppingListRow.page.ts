import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Page Object de una fila de la lista: cómo encontrar sus partes y tocarlas.
 * Sin aserciones: las hace el test.
 */
export const createShoppingListRowPage = (productName: string) => {
  const user = userEvent.setup();

  const getToggleButton = () => screen.getByRole("button", { name: new RegExp(productName) });
  // La fila es el <li> que contiene el botón; los avisos, la lista dentro de ella.
  const getRow = () => getToggleButton().closest("li") as HTMLElement;
  const getShortfallNotes = () => within(getRow()).getByRole("list");
  const queryShortfallNotes = () => within(getRow()).queryByRole("list");
  const getShortfallNoteTexts = () =>
    within(getShortfallNotes())
      .getAllByRole("listitem")
      .map((noteItem) => noteItem.textContent);
  const getShortfallNote = (note: string) => screen.getByText(note);

  const clickShortfallNote = async (note: string) => {
    await user.click(getShortfallNote(note));
  };

  return {
    clickShortfallNote,
    getShortfallNote,
    getShortfallNoteTexts,
    getShortfallNotes,
    getToggleButton,
    queryShortfallNotes,
  };
};
