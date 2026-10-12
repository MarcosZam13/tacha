import type { FormEvent } from "react";
import type { NullableUndefined } from "@/types/nullable.types";
import type { PasswordStrength } from "@/types/password.types";
import type { NewPasswordFieldType } from "@/constants";
import type { NewPasswordFormValues } from "@/types/new-password.types";
import type { ChangePasswordStepType } from "../constants/login.constants";

export interface ChangePasswordViewModel {
  confirmPasswordError: NullableUndefined<string>;
  handleBackToNotice: () => void;
  handleChange: (field: NewPasswordFieldType) => (value: string) => void;
  handleOpenForm: () => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isSaveDisabled: boolean;
  isSaving: boolean;
  passwordStrength: NullableUndefined<PasswordStrength>;
  step: ChangePasswordStepType;
  submitError: NullableUndefined<string>;
  values: NewPasswordFormValues;
}
