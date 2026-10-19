import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

interface ContactFormInput {
  email: string;
  message: string;
  name: string;
}

// Cómo encontrar y usar la sección de contacto en los tests de componente. Sin aserciones.
export const createContactSectionPage = () => {
  const user = userEvent.setup();

  const getNameField = () => screen.getByLabelText(/Nombre/);
  const getEmailField = () => screen.getByLabelText(/Correo electrónico/);
  const getMessageField = () => screen.getByLabelText(/Mensaje/);
  const getRecaptcha = () => screen.getByRole("button", { name: "Resolver reCAPTCHA" });
  const getSubmitButton = () => screen.getByRole("button", { name: /Enviar mensaje|Enviando/ });

  const fillForm = async ({ email, message, name }: ContactFormInput): Promise<void> => {
    await user.type(getNameField(), name);
    await user.type(getEmailField(), email);
    await user.type(getMessageField(), message);
  };

  const solveRecaptcha = async (): Promise<void> => {
    await user.click(getRecaptcha());
  };

  const submit = async (): Promise<void> => {
    await user.click(getSubmitButton());
  };

  return {
    fillForm,
    getAlerts: () => screen.queryAllByRole("alert"),
    getEmailField,
    getMessageField,
    getNameField,
    getRecaptcha,
    getSubmitButton,
    getSuccessMessage: () => screen.queryByRole("status"),
    getText: (text: string) => screen.queryByText(text),
    solveRecaptcha,
    submit,
  };
};
