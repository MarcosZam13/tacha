import type { ChangePasswordFieldType } from "../constants/login.constants";

export interface ChangePasswordFormValues {
  confirmPassword: string;
  newPassword: string;
}

export type ChangePasswordFormErrors = Partial<Record<ChangePasswordFieldType, string>>;
