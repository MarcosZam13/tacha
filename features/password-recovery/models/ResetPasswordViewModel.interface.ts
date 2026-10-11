import type { FormEvent } from "react";
import type { NewPasswordFieldType } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";
import type { NewPasswordFormValues } from "@/types/new-password.types";
import type { PasswordStrength } from "@/types/password.types";
import type { ResetPasswordStatusType } from "../constants/password-recovery.constants";

export interface ResetPasswordViewModel {
  // Solo con algo escrito en "Repetir": el requisito de la nueva contraseña lo lista el medidor.
  confirmPasswordError: NullableUndefined<string>;
  handleChange: (field: NewPasswordFieldType) => (value: string) => void;
  handleGoToLogin: () => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isSaveDisabled: boolean;
  isSaving: boolean;
  passwordStrength: NullableUndefined<PasswordStrength>;
  status: ResetPasswordStatusType;
  // El fallo del guardado (red, contraseña igual a la actual o rechazada). Nunca el mensaje crudo de Supabase.
  submitError: NullableUndefined<string>;
  values: NewPasswordFormValues;
}
