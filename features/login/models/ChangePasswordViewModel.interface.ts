import type { FormEvent } from "react";
import type { NullableUndefined } from "@/types/nullable.types";
import type { PasswordStrength } from "@/types/password.types";
import type { ChangePasswordFieldType, ChangePasswordStepType } from "../constants/login.constants";
import type { ChangePasswordFormValues } from "./ChangePasswordFormValues.interface";

export interface ChangePasswordViewModel {
  confirmPasswordError: NullableUndefined<string>;
  handleBackToNotice: () => void;
  handleChange: (field: ChangePasswordFieldType) => (value: string) => void;
  handleOpenForm: () => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isSaveDisabled: boolean;
  isSaving: boolean;
  passwordStrength: NullableUndefined<PasswordStrength>;
  step: ChangePasswordStepType;
  submitError: NullableUndefined<string>;
  values: ChangePasswordFormValues;
}
