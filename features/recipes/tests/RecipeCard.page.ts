import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/** Page Object de la tarjeta de una receta. Sin aserciones: las hace el test. */
export const createRecipeCardPage = () => {
  const user = userEvent.setup();

  const getPhoto = (recipeName: string): HTMLElement => screen.getByRole("img", { name: recipeName });
  const queryPhoto = (): HTMLElement | null => screen.queryByRole("img");
  const getAlert = (): HTMLElement => screen.getByRole("alert");
  const getStatus = (): HTMLElement => screen.getByRole("status");
  const queryCopyButton = (recipeName: string): HTMLElement | null =>
    screen.queryByRole("button", { name: new RegExp(`^(Guardar copia personal|Copiando…)\\s*${recipeName}$`) });
  const queryText = (text: string): HTMLElement | null => screen.queryByText(text);
  const requestCopy = async (recipeName: string): Promise<void> => {
    await user.click(screen.getByRole("button", { name: new RegExp(`^Guardar copia personal\\s*${recipeName}$`) }));
  };
  const getText = (text: string): HTMLElement => screen.getByText(text);
  const getEditLink = (): HTMLElement => screen.getByRole("link", { name: "Editar" });
  const queryAddButton = (): HTMLElement | null => screen.queryByRole("button", { name: /^Agregar receta a lista/ });
  const breakPhoto = (recipeName: string): void => {
    fireEvent.error(getPhoto(recipeName));
  };
  const requestDelete = async (recipeName: string): Promise<void> => {
    await user.click(screen.getByRole("button", { name: new RegExp(`^Eliminar\s*${recipeName}$`) }));
  };

  return {
    breakPhoto,
    getAlert,
    getEditLink,
    getPhoto,
    getStatus,
    getText,
    queryAddButton,
    queryCopyButton,
    queryPhoto,
    queryText,
    requestCopy,
    requestDelete,
  };
};
