import type { NewPasswordFieldType } from "@/constants";

export interface NewPasswordFormValues {
  confirmPassword: string;
  newPassword: string;
}

export type NewPasswordFormErrors = Partial<Record<NewPasswordFieldType, string>>;
