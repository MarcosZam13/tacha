import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NEW_PASSWORD_LABEL } from "@/constants";
import { CHANGE_PASSWORD_TEXT } from "../constants/change-password.constants";

export const createChangePasswordPage = () => {
  const user = userEvent.setup();

  const getCurrentField = (): HTMLElement => screen.getByLabelText(/^Contraseña actual/);
  const getNewField = (): HTMLElement => screen.getByLabelText(/^Nueva contraseña/);
  const getConfirmField = (): HTMLElement => screen.getByLabelText(/^Repetir nueva contraseña/);
  const getSaveButton = (): HTMLElement =>
    screen.getByRole("button", { name: new RegExp(`${NEW_PASSWORD_LABEL.SAVE}|${NEW_PASSWORD_LABEL.SAVING}`) });
  const getTitle = (): HTMLElement => screen.getByRole("heading", { name: CHANGE_PASSWORD_TEXT.TITLE });
  const getBackLink = (): HTMLElement => screen.getByRole("link", { name: CHANGE_PASSWORD_TEXT.BACK_TO_PROFILE });
  const queryConfirmation = (): HTMLElement | null => screen.queryByText(CHANGE_PASSWORD_TEXT.SUCCESS);
  const queryAlert = (): HTMLElement | null => screen.queryByRole("alert");
  const queryMeter = (): HTMLElement | null => screen.queryByRole("progressbar");

  const fillCurrent = async (value: string): Promise<void> => {
    await user.type(getCurrentField(), value);
  };

  const fillNew = async (value: string): Promise<void> => {
    await user.type(getNewField(), value);
  };

  const fillConfirm = async (value: string): Promise<void> => {
    await user.type(getConfirmField(), value);
  };

  const save = async (): Promise<void> => {
    await user.click(getSaveButton());
  };

  return {
    fillConfirm,
    fillCurrent,
    fillNew,
    getBackLink,
    getConfirmField,
    getCurrentField,
    getNewField,
    getSaveButton,
    getTitle,
    queryAlert,
    queryConfirmation,
    queryMeter,
    save,
  };
};
