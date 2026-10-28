// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Input } from "../Input";
import { createInputPage } from "./Input.page";

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

const LABEL = "Correo electrónico";
const ERROR = "Ingresá un correo válido.";
const HELPER = "Te vamos a escribir a este correo.";

describe("Input (SCRUM-137)", () => {
  it("keeps the accessible name as the label alone when there is an error", () => {
    render(<Input label={LABEL} value="x" onChange={vi.fn()} errorMessage={ERROR} />);

    expect(createInputPage().getField()).toHaveAccessibleName(LABEL);
  });

  it("keeps the label plus the required marker as the accessible name", () => {
    render(<Input label={LABEL} value="" onChange={vi.fn()} isRequired errorMessage={ERROR} />);

    // jsdom junta el espacio del <span> del asterisco ("...electrónico*"); el navegador lo deja.
    // Lo que importa: el nombre es la etiqueta más el marcador, sin el texto del error.
    expect(createInputPage().getField()).toHaveAccessibleName(new RegExp(`^${LABEL} ?\\*$`));
  });

  it("links the error text to the field as its description", () => {
    render(<Input label={LABEL} value="x" onChange={vi.fn()} errorMessage={ERROR} />);

    expect(createInputPage().getField()).toHaveAccessibleDescription(ERROR);
  });

  it("marks a field with an error as invalid", () => {
    render(<Input label={LABEL} value="x" onChange={vi.fn()} errorMessage={ERROR} />);

    expect(createInputPage().getField()).toHaveAttribute("aria-invalid", "true");
  });

  it("does not mark a field without an error as invalid", () => {
    render(<Input label={LABEL} value="x" onChange={vi.fn()} helperText={HELPER} />);

    expect(createInputPage().getField()).not.toHaveAttribute("aria-invalid");
  });

  it("links the helper text as the description when there is no error", () => {
    render(<Input label={LABEL} value="" onChange={vi.fn()} helperText={HELPER} />);

    expect(createInputPage().getField()).toHaveAccessibleDescription(HELPER);
  });

  it("is still found by its label when the error appears (E2E selectors)", () => {
    render(<Input label={LABEL} value="x" onChange={vi.fn()} errorMessage={ERROR} />);

    expect(createInputPage().getFieldByLabel(LABEL)).toBeInTheDocument();
  });

  it("gives each field its own id so two inputs do not share a description", () => {
    render(
      <>
        <Input label="Uno" value="" onChange={vi.fn()} errorMessage="Error uno" />
        <Input label="Dos" value="" onChange={vi.fn()} errorMessage="Error dos" />
      </>,
    );
    const page = createInputPage();

    expect(page.getFieldByLabel("Dos")).toHaveAccessibleDescription("Error dos");
  });

  it("calls onBlur when the user leaves the field", () => {
    const onBlur = vi.fn();
    render(<Input label={LABEL} value="" onChange={vi.fn()} onBlur={onBlur} />);

    fireEvent.blur(createInputPage().getField());

    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
