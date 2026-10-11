import type { ForgotPasswordViewModel } from "../../models/ForgotPasswordViewModel.interface";

// Solo lo que el formulario necesita del ViewModel.
export type ForgotPasswordFormProps = Pick<
  ForgotPasswordViewModel,
  | "email"
  | "emailError"
  | "handleChange"
  | "handleSubmit"
  | "isSubmitDisabled"
  | "isSubmitting"
  | "submitError"
>;
