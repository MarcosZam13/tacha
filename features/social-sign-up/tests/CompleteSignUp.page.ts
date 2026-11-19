import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { COMPLETE_SIGN_UP_LABEL } from "../constants/complete-sign-up.constants";

// Cómo encontrar y usar el formulario de completar registro en los tests de componente. Sin aserciones.
export const createCompleteSignUpPage = () => {
  const user = userEvent.setup();

  // El campo obligatorio agrega " *" a su etiqueta: se busca por el comienzo.
  const findNameInput = (): Promise<HTMLElement> =>
    screen.findByRole("textbox", { name: new RegExp(`^${COMPLETE_SIGN_UP_LABEL.NAME}`, "u") });
  const getSubmitButton = (): HTMLElement => screen.getByRole("button", { name: COMPLETE_SIGN_UP_LABEL.SUBMIT });
  const findSavingButton = (): Promise<HTMLElement> =>
    screen.findByRole("button", { name: COMPLETE_SIGN_UP_LABEL.SUBMITTING });
  const findAlert = (): Promise<HTMLElement> => screen.findByRole("alert");
  const findText = (text: string): Promise<HTMLElement> => screen.findByText(text);
  const queryText = (text: string): HTMLElement | null => screen.queryByText(text);
  const getLink = (name: string): HTMLElement => screen.getByRole("link", { name });

  const replaceName = async (name: string): Promise<void> => {
    const input = await findNameInput();
    await user.clear(input);
    if (name.length > 0) await user.type(input, name);
  };

  const typeInName = async (text: string): Promise<void> => {
    await user.type(await findNameInput(), text);
  };

  const submit = async (): Promise<void> => {
    await user.click(getSubmitButton());
  };

  return {
    findAlert,
    findNameInput,
    findSavingButton,
    findText,
    getLink,
    getSubmitButton,
    queryText,
    replaceName,
    submit,
    typeInName,
  };
};
