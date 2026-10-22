import { screen } from "@testing-library/react";

// Page Object del Input: las pruebas preguntan por el campo como lo haría un lector de pantalla.
export const createInputPage = () => ({
  getField: (): HTMLInputElement => screen.getByRole("textbox") as HTMLInputElement,
  getFieldByLabel: (label: string): HTMLInputElement => screen.getByLabelText(label) as HTMLInputElement,
});
