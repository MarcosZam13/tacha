import type { FormEvent } from "react";
import type { NullableUndefined } from "@/types/nullable.types";
import type { LoginFieldType } from "../constants/login.constants";
import type { LoginFormErrors, LoginFormValues } from "./LoginFormValues.interface";

export interface LoginViewModel {
  captchaResetCount: number;
  errors: LoginFormErrors;
  handleCaptchaTokenChange: (token: NullableUndefined<string>) => void;
  handleChange: (field: LoginFieldType) => (value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  submitError: NullableUndefined<string>;
  values: LoginFormValues;
}