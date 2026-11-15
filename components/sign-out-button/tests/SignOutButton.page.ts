import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SIGN_OUT_TEXT } from "../constants/sign-out.constants";

export const createSignOutButtonPage = () => {
  const user = userEvent.setup();

  // Con el diálogo abierto hay dos botones "Cerrar sesión": el del trigger y el de confirmar. El de la pantalla es el primero.
  const getTrigger = (): HTMLElement => screen.getAllByRole("button", { name: SIGN_OUT_TEXT.TRIGGER })[0];
  const queryDialog = (): HTMLElement | null => screen.queryByRole("dialog", { name: SIGN_OUT_TEXT.CONFIRM_TITLE });
  const getDialogConfirmButton = (): HTMLElement =>
    within(screen.getByRole("dialog")).getByRole("button", { name: SIGN_OUT_TEXT.CONFIRM });
  const getDialogCancelButton = (): HTMLElement =>
    within(screen.getByRole("dialog")).getByRole("button", { name: SIGN_OUT_TEXT.CANCEL });
  const queryBusyTrigger = (): HTMLElement | null => screen.queryByRole("button", { name: SIGN_OUT_TEXT.SIGNING_OUT });

  const clickTrigger = async (): Promise<void> => {
    await user.click(getTrigger());
  };

  const confirm = async (): Promise<void> => {
    await user.click(getDialogConfirmButton());
  };

  const cancel = async (): Promise<void> => {
    await user.click(getDialogCancelButton());
  };

  const pressEscape = async (): Promise<void> => {
    await user.keyboard("{Escape}");
  };

  return { cancel, clickTrigger, confirm, getTrigger, pressEscape, queryBusyTrigger, queryDialog };
};
