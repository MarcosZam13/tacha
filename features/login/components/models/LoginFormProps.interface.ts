import type { LoginViewModel } from "../../models/LoginViewModel.interface";

// Solo lo que el formulario necesita del ViewModel del login.
export type LoginFormProps = Pick<
  LoginViewModel,
  | "captchaResetCount"
  | "errors"
  | "handleCaptchaTokenChange"
  | "handleChange"
  | "handleSubmit"
  | "isSubmitDisabled"
  | "isSubmitting"
  | "submitError"
  | "values"
>;
