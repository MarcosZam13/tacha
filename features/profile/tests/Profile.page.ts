import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PROFILE_SUCCESS_MESSAGE, PROFILE_TEXT } from "../constants/profile.constants";

export const createProfilePage = () => {
  const user = userEvent.setup({ applyAccept: false });

  const getNameInput = (): HTMLInputElement => screen.getByLabelText(new RegExp(PROFILE_TEXT.NAME_LABEL));
  const getPhotoInput = (): HTMLInputElement => screen.getByLabelText(PROFILE_TEXT.CHANGE_PHOTO);
  const getSaveButton = (): HTMLElement => screen.getByRole("button", { name: PROFILE_TEXT.SAVE });
  const queryRemovePhotoButton = (): HTMLElement | null =>
    screen.queryByRole("button", { name: PROFILE_TEXT.REMOVE_PHOTO });
  const queryConfirmation = (): HTMLElement | null => screen.queryByText(PROFILE_SUCCESS_MESSAGE);
  const queryAlert = (): HTMLElement | null => screen.queryByRole("alert");
  const getHeading = (): HTMLElement => screen.getByRole("heading", { name: PROFILE_TEXT.TITLE });
  const getChangePasswordLink = (): HTMLElement =>
    screen.getByRole("link", { name: PROFILE_TEXT.CHANGE_PASSWORD });

  const replaceName = async (name: string): Promise<void> => {
    await user.clear(getNameInput());
    if (name) await user.type(getNameInput(), name);
  };

  const choosePhoto = async (file: File): Promise<void> => {
    await user.upload(getPhotoInput(), file);
  };

  const save = async (): Promise<void> => {
    await user.click(getSaveButton());
  };

  const removePhoto = async (): Promise<void> => {
    await user.click(screen.getByRole("button", { name: PROFILE_TEXT.REMOVE_PHOTO }));
  };

  return {
    choosePhoto,
    getChangePasswordLink,
    getHeading,
    getNameInput,
    getSaveButton,
    queryAlert,
    queryConfirmation,
    queryRemovePhotoButton,
    removePhoto,
    replaceName,
    save,
  };
};
