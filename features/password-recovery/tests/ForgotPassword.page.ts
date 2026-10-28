import { screen } from "@testing-library/react";

// Cómo encontrar las cosas de las pantallas de recuperación en los tests de componente. Sin aserciones.
export const forgotPasswordPage = {
  backToLoginLink: () => screen.getByRole("link", { name: "Volver al inicio de sesión" }),
  emailField: () => screen.getByLabelText(/Correo electrónico/),
  errorAlert: () => screen.getByRole("alert"),
  sentMessage: () =>
    screen.getByRole("status"),
  submitButton: () => screen.getByRole("button", { name: /Enviar enlace|Enviando/ }),
  title: () => screen.getByRole("heading", { name: "Recuperar contraseña" }),
  useAnotherEmailButton: () => screen.getByRole("button", { name: "Usar otro correo" }),
};
