import { screen } from "@testing-library/react";

// Cómo encontrar las cosas de la vista de actualización de contraseña en los tests de componente. Sin aserciones.
export const resetPasswordPage = {
  checkingSpinner: () => screen.getByRole("status", { name: "Verificando el enlace" }),
  confirmPasswordField: () => screen.getByLabelText(/^Repetir nueva contraseña/),
  errorAlert: () => screen.getByRole("alert"),
  formTitle: () => screen.getByRole("heading", { name: "Nueva contraseña" }),
  goToLoginButton: () => screen.getByRole("button", { name: "Iniciar sesión" }),
  invalidTitle: () => screen.getByRole("heading", { name: "El enlace no es válido" }),
  doneTitle: () => screen.getByRole("heading", { name: "Contraseña actualizada" }),
  newPasswordField: () => screen.getByLabelText(/^Nueva contraseña/),
  requestNewLinkLink: () => screen.getByRole("link", { name: "Pedir un enlace nuevo" }),
  saveButton: () => screen.getByRole("button", { name: /Guardar contraseña|Guardando/ }),
};
