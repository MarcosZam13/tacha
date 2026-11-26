import { screen } from "@testing-library/react";
import { COMPLETE_SIGN_UP_GATE_LABEL } from "../constants/complete-sign-up.constants";

// Cómo encontrar lo que muestra la puerta de las pantallas privadas en los tests de componente. Sin aserciones.
export const createCompleteSignUpGatePage = (privateContentText: string) => {
  const queryPrivateContent = (): HTMLElement | null => screen.queryByText(privateContentText);
  const querySpinner = (): HTMLElement | null =>
    screen.queryByRole("status", { name: COMPLETE_SIGN_UP_GATE_LABEL.CHECKING });

  return { queryPrivateContent, querySpinner };
};
