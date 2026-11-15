import type { NewPasswordFormValues } from "@/types/new-password.types";

export interface ChangePasswordParams {
  currentPassword: string;
  newPassword: string;
}

/** Los tres campos del formulario: los dos de la nueva contraseña y la actual. */
export interface ChangePasswordFormValues extends NewPasswordFormValues {
  currentPassword: string;
}
