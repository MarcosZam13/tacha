import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/** Page Object del editor de recetas. Sin aserciones: las hace el test. */
export const createRecipeEditorPage = () => {
  // applyAccept: false, para poder elegir un archivo que el selector no ofrecería.
  const user = userEvent.setup({ applyAccept: false });

  const getPhotoInput = (): HTMLElement => screen.getByLabelText(/^(Elegir|Cambiar) foto$/);
  const findPhotoInput = (): Promise<HTMLElement> => screen.findByLabelText(/^(Elegir|Cambiar) foto$/);
  const getPhoto = (alt: string): HTMLElement => screen.getByRole("img", { name: alt });
  const queryPhoto = (): HTMLElement | null => screen.queryByRole("img");
  const getRemoveButton = (): HTMLElement => screen.getByRole("button", { name: "Quitar foto" });
  const queryRemoveButton = (): HTMLElement | null => screen.queryByRole("button", { name: "Quitar foto" });
  const getSaveButton = (): HTMLElement => screen.getByRole("button", { name: /^Guarda/ });
  const getNameInput = (): HTMLElement => screen.getByRole("textbox", { name: /^Nombre/ });
  const findAlert = (): Promise<HTMLElement> => screen.findByRole("alert");
  const getTitle = (): HTMLElement => screen.getByRole("heading", { level: 1 });
  const findNotFound = (): Promise<HTMLElement> => screen.findByText("No encontramos esa receta.");

  const findAudienceOption = (label: string): Promise<HTMLElement> => screen.findByRole("radio", { name: label });
  const getText = (text: string): HTMLElement => screen.getByText(text);
  const queryAudience = (): HTMLElement | null => screen.queryByRole("group", { name: "¿Para quién es?" });
  const chooseAudience = async (label: string): Promise<void> => {
    await user.click(await findAudienceOption(label));
  };

  const choosePhoto = async (file: File): Promise<void> => {
    await user.upload(await findPhotoInput(), file);
  };
  const removePhoto = async (): Promise<void> => {
    await user.click(getRemoveButton());
  };
  const save = async (): Promise<void> => {
    await user.click(getSaveButton());
  };
  const doubleSave = async (): Promise<void> => {
    await user.dblClick(getSaveButton());
  };

  return {
    chooseAudience,
    choosePhoto,
    doubleSave,
    findAlert,
    findAudienceOption,
    findNotFound,
    findPhotoInput,
    getNameInput,
    getPhoto,
    getPhotoInput,
    getSaveButton,
    getText,
    getTitle,
    queryAudience,
    queryPhoto,
    queryRemoveButton,
    removePhoto,
    save,
  };
};
