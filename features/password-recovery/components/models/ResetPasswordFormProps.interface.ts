import type { ResetPasswordViewModel } from "../../models/ResetPasswordViewModel.interface";

// Solo lo que el formulario necesita del ViewModel.
export type ResetPasswordFormProps = Pick<
  ResetPasswordViewModel,
  | "confirmPasswordError"
  | "handleChange"
  | "handleSubmit"
  | "isSaveDisabled"
  | "isSaving"
  | "passwordStrength"
  | "submitError"
  | "values"
>;
