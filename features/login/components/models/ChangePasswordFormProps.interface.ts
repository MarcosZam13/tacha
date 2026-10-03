import type { ChangePasswordViewModel } from "../../models/ChangePasswordViewModel.interface";

// Solo lo que el formulario necesita del ViewModel del cambio de contraseña.
export type ChangePasswordFormProps = Pick<
  ChangePasswordViewModel,
  | "confirmPasswordError"
  | "handleBackToNotice"
  | "handleChange"
  | "handleSubmit"
  | "isSaveDisabled"
  | "isSaving"
  | "passwordStrength"
  | "submitError"
  | "values"
>;
