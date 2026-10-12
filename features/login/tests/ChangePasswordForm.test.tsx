// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChangePasswordForm } from "../components/ChangePasswordForm";
import type { ChangePasswordFormProps } from "../components/models/ChangePasswordFormProps.interface";

afterEach(cleanup);

const renderForm = (overrides: Partial<ChangePasswordFormProps> = {}): void => {
  render(
    <ChangePasswordForm
      confirmPasswordError={undefined}
      handleBackToNotice={vi.fn()}
      handleChange={() => vi.fn()}
      handleSubmit={vi.fn()}
      isSaveDisabled={false}
      isSaving={false}
      passwordStrength={undefined}
      submitError={undefined}
      values={{ confirmPassword: "", newPassword: "" }}
      {...overrides}
    />,
  );
};

describe("ChangePasswordForm", () => {
  it("shows the two password fields, new and repeat, as new-password fields for password managers", () => {
    renderForm();

    expect(screen.getByLabelText(/^Nueva contraseña/)).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText(/^Repetir nueva contraseña/)).toHaveAttribute("autocomplete", "new-password");
  });

  it("offers to save and to go back", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Guardar contraseña" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Volver" })).toBeInTheDocument();
  });

  it("says it is saving and blocks the button while the request is in flight", () => {
    renderForm({ isSaveDisabled: true, isSaving: true });

    expect(screen.getByRole("button", { name: "Guardando..." })).toBeDisabled();
  });

  it("shows the mismatch error under the repeat field and the save failure as an alert", () => {
    renderForm({
      confirmPasswordError: "Las contraseñas no coinciden.",
      submitError: "No pudimos actualizar tu contraseña. Intentá de nuevo en unos minutos.",
    });

    expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos actualizar tu contraseña.");
  });
});
